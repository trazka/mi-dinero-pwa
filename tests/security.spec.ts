import { revealHomeSummary } from "./home-utils";
import { test, expect } from "@playwright/test";

test("bloqueo con llave verificada, recuperación y acceso offline conservan datos", async ({
  page,
  context,
}) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send(
    "WebAuthn.addVirtualAuthenticator",
    {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    },
  );
  await page.addInitScript(() => {
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable =
      async () => true;
  });
  await page.goto("./");
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await page.getByLabel("Importe (MXN)", { exact: true }).fill("50");
  await page
    .getByLabel("Establecimiento o concepto")
    .fill("Gasto ficticio protegido");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await revealHomeSummary(page);
  await expect(page.locator(".balance-number")).toContainText("-$50.00");
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  await page
    .getByRole("button", { name: "Activar bloqueo del dispositivo" })
    .click();
  await expect(page.locator(".recovery-code")).toBeVisible();
  const code = await page.locator(".recovery-code").innerText();
  await expect(
    page.getByRole("button", { name: "Confirmar activación" }),
  ).toBeDisabled();
  await page.getByLabel("Ya guardé mi código de recuperación").check();
  await page.getByRole("button", { name: "Confirmar activación" }).click();
  await expect(
    page.getByText("Bloqueo activado", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Mi dinero está bloqueado" }),
  ).toBeVisible();
  await expect(nav).toHaveCount(0);
  await page
    .getByRole("button", { name: "Desbloquear con el dispositivo" })
    .click();
  await revealHomeSummary(page);
  await expect(page.locator(".balance-number")).toContainText("-$50.00");
  await context.setOffline(false);
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  // Backgrounding must hide a draft without discarding it.
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .click();
  await page
    .getByLabel("Establecimiento o concepto")
    .fill("Borrador conservado");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("heading", { name: "Mi dinero está bloqueado" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page
    .getByRole("button", { name: "Desbloquear con el dispositivo" })
    .click();
  await expect(page.getByLabel("Establecimiento o concepto")).toHaveValue(
    "Borrador conservado",
  );
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  await page
    .getByRole("button", { name: "Bloquear ahora", exact: true })
    .click();
  await page.evaluate(() => {
    const original = navigator.credentials.get.bind(navigator.credentials);
    navigator.credentials.get = async (options) => {
      const credential = (await original(options)) as PublicKeyCredential;
      Object.defineProperty(credential.response, "signature", {
        value: new Uint8Array([48, 6, 2, 1, 1, 2, 1, 1]).buffer,
      });
      return credential;
    };
  });
  await page
    .getByRole("button", { name: "Desbloquear con el dispositivo" })
    .click();
  await expect(page.getByRole("alert")).toContainText("firma del dispositivo");
  await expect(nav).toBeHidden();
  await page.evaluate(() => {
    navigator.credentials.get = async () => {
      throw new DOMException("Cancelado", "NotAllowedError");
    };
  });
  await page
    .getByRole("button", { name: "Desbloquear con el dispositivo" })
    .click();
  await expect(page.getByRole("alert")).toContainText("No se completó");
  await expect(nav).toBeHidden();
  await cdp.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
  await page
    .getByRole("button", { name: "Usar código de recuperación", exact: true })
    .click();
  await page
    .getByLabel("Código de recuperación", { exact: true })
    .fill("incorrecto");
  await page.getByRole("button", { name: "Usar código", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("no es correcto");
  await expect(nav).toBeHidden();
  await page.getByLabel("Código de recuperación", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Usar código", exact: true }).click();
  await expect(
    page.getByText("Bloqueo activado", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Usar código de recuperación", exact: true })
    .click();
  await page.getByLabel("Código de recuperación", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Usar código", exact: true }).click();
  await revealHomeSummary(page);
  await expect(page.locator(".balance-number")).toContainText("-$50.00");
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Desactivar bloqueo", exact: true })
    .click();
  await expect(
    page.getByText("Bloqueo activado", { exact: true }),
  ).toBeHidden();
  await page.reload();
  await revealHomeSummary(page);
  await expect(page.locator(".balance-number")).toContainText("-$50.00");
});

test("sin autenticador compatible la activación queda deshabilitada", async ({
  page,
}) => {
  await page.addInitScript(() => {
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable =
      async () => false;
  });
  await page.goto("./");
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("button", { name: "Respaldos", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Activar bloqueo del dispositivo" }),
  ).toBeDisabled();
  await expect(
    page.getByText(/Este navegador no ofrece autenticación compatible/),
  ).toBeVisible();
});
