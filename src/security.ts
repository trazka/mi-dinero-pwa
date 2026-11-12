import { openDB } from "idb";
export type LockConfig = {
  version: 1;
  credential: string;
  publicKey: string;
  recoveryHash: string;
};
export const LOCK_KEY = "mi-dinero-lock-v1";
async function securityDB() {
  return openDB("mi-dinero-seguridad", 1, {
    upgrade(db) {
      db.createObjectStore("settings");
    },
  });
}
export async function readLock(): Promise<LockConfig | null> {
  let config: LockConfig | null;
  try {
    const db = await securityDB();
    try {
      config = (await db.get("settings", "lock")) ?? null;
    } finally {
      db.close();
    }
  } catch {
    const raw = localStorage.getItem(LOCK_KEY);
    config = raw ? JSON.parse(raw) : null;
  }
  if (
    config &&
    (config.version !== 1 ||
      !config.credential ||
      !config.publicKey ||
      !config.recoveryHash)
  )
    throw Error(
      "No se pudo leer la configuración de bloqueo. Tus datos financieros se conservan.",
    );
  return config;
}
export async function writeLock(config: LockConfig | null) {
  const db = await securityDB();
  try {
    if (config) await db.put("settings", config, "lock");
    else await db.delete("settings", "lock");
  } finally {
    db.close();
  }
  try {
    if (config) localStorage.setItem(LOCK_KEY, JSON.stringify(config));
    else localStorage.removeItem(LOCK_KEY);
  } catch {
    /* IndexedDB is authoritative when preferences are unavailable. */
  }
}
const encode = (data: ArrayBuffer | Uint8Array) =>
  btoa(
    String.fromCharCode(
      ...new Uint8Array(
        data instanceof Uint8Array
          ? (data.buffer.slice(
              data.byteOffset,
              data.byteOffset + data.byteLength,
            ) as ArrayBuffer)
          : data,
      ),
    ),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
const decode = (text: string) =>
  Uint8Array.from(atob(text.replaceAll("-", "+").replaceAll("_", "/")), (c) =>
    c.charCodeAt(0),
  );
const random = () => crypto.getRandomValues(new Uint8Array(32));
const hash = async (text: string) =>
  encode(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
const normalize = (code: string) => code.replaceAll(/[-\s]/g, "").toUpperCase();
export async function recoveryMatches(config: LockConfig, code: string) {
  return (await hash(normalize(code))) === config.recoveryHash;
}
export async function biometricsAvailable() {
  return !!(
    window.isSecureContext &&
    window.PublicKeyCredential &&
    crypto.subtle &&
    typeof AuthenticatorAttestationResponse !== "undefined" &&
    "getPublicKey" in AuthenticatorAttestationResponse.prototype &&
    (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  );
}
function checkClient(data: ArrayBuffer, challenge: Uint8Array, type: string) {
  const client = JSON.parse(new TextDecoder().decode(data));
  if (
    client.type !== type ||
    client.challenge !== encode(challenge) ||
    client.origin !== location.origin ||
    client.crossOrigin
  )
    throw Error("La respuesta de autenticación no es válida.");
}
// WebAuthn ES256 signatures use DER; Web Crypto expects a 64-byte r || s.
export function rawSignature(der: Uint8Array) {
  if (der[0] !== 0x30 || der[1] !== der.length - 2 || der[2] !== 2)
    throw Error("Firma no válida.");
  const rlen = der[3],
    spos = 4 + rlen;
  if (der[spos] !== 2 || spos + 2 + der[spos + 1] !== der.length)
    throw Error("Firma no válida.");
  const raw = new Uint8Array(64);
  for (const [start, length, offset] of [
    [4, rlen, 0],
    [spos + 2, der[spos + 1], 32],
  ]) {
    let part = der.slice(start, start + length);
    if (part.length === 33 && part[0] === 0) part = part.slice(1);
    if (!part.length || part.length > 32) throw Error("Firma no válida.");
    raw.set(part, offset + 32 - part.length);
  }
  return raw;
}
export async function authenticate(config: LockConfig) {
  const challenge = random();
  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: location.hostname,
      userVerification: "required",
      timeout: 60000,
      allowCredentials: [{ type: "public-key", id: decode(config.credential) }],
    },
  })) as PublicKeyCredential | null;
  if (!credential || encode(credential.rawId) !== config.credential)
    throw Error("No se completó la autenticación.");
  const response = credential.response as AuthenticatorAssertionResponse;
  checkClient(response.clientDataJSON, challenge, "webauthn.get");
  const auth = new Uint8Array(response.authenticatorData);
  const rpHash = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(location.hostname),
    ),
  );
  if (
    auth.length < 37 ||
    !rpHash.every((n, i) => auth[i] === n) ||
    (auth[32] & 5) !== 5
  )
    throw Error("Falta la verificación del dispositivo.");
  const clientHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", response.clientDataJSON),
  );
  const signed = new Uint8Array(auth.length + clientHash.length);
  signed.set(auth);
  signed.set(clientHash, auth.length);
  const key = await crypto.subtle.importKey(
    "spki",
    decode(config.publicKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  if (
    !(await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      rawSignature(new Uint8Array(response.signature)),
      signed,
    ))
  )
    throw Error("No se pudo verificar la firma del dispositivo.");
}
export async function enroll() {
  const challenge = random();
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Mi dinero", id: location.hostname },
      user: {
        id: random(),
        name: `mi-dinero-${Date.now()}`,
        displayName: "Mi dinero",
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "required",
        userVerification: "required",
      },
      attestation: "none",
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw Error("No se creó la llave de acceso.");
  const response = credential.response as AuthenticatorAttestationResponse;
  checkClient(response.clientDataJSON, challenge, "webauthn.create");
  const publicKey = response.getPublicKey();
  if (!publicKey || response.getPublicKeyAlgorithm() !== -7)
    throw Error("Este dispositivo no permite activar este bloqueo.");
  const code = Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) =>
    n.toString(16).padStart(2, "0"),
  )
    .join("")
    .toUpperCase()
    .match(/.{4}/g)!
    .join("-");
  const config: LockConfig = {
    version: 1,
    credential: encode(credential.rawId),
    publicKey: encode(publicKey),
    recoveryHash: await hash(normalize(code)),
  };
  await authenticate(config);
  return { config, code };
}
