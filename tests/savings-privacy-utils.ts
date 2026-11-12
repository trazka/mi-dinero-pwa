import { expect, type Page, type BrowserContext } from "@playwright/test";
export async function enableSavingsPrivacy(
  page: Page,
  context: BrowserContext,
) {
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  await page.evaluate(() => {
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable =
      async () => true;
  });
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Activar bloqueo del dispositivo",
      exact: true,
    })
    .click();
  await page.getByLabel("Ya guardé mi código de recuperación").check();
  await page
    .getByRole("button", { name: "Confirmar activación", exact: true })
    .click();
  await nav.getByRole("button", { name: "Inicio", exact: true }).click();
  await page
    .getByRole("button", { name: "Mostrar ahorros", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ocultar ahorros", exact: true }),
  ).toBeVisible();
}
