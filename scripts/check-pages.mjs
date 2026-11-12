import { chromium, devices, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const target = process.argv[2] || "https://trazka.github.io/mi-dinero-pwa/";
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_USE_BUNDLED_BROWSER
    ? undefined
    : process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
  ...(proxy && !["localhost", "127.0.0.1"].includes(new URL(target).hostname)
    ? { proxy: { server: proxy } }
    : {}),
});
try {
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const errors = [],
    resources = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) => {
    if (["script", "stylesheet", "document"].includes(r.resourceType()))
      errors.push(`${r.url()}: ${r.failure()?.errorText}`);
  });
  page.on("response", (r) => {
    const kind = r.request().resourceType();
    if (["script", "stylesheet", "document"].includes(kind)) {
      const type = r.headers()["content-type"] || "";
      resources.push({ url: r.url(), status: r.status(), type });
      if (
        !r.ok() ||
        (kind === "script" && !/javascript/.test(type)) ||
        (kind === "stylesheet" && !/text\/css/.test(type))
      )
        errors.push(`Recurso inválido: ${r.status()} ${type} ${r.url()}`);
    }
  });
  try {
    const response = await page.goto(target, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    if (!response?.ok())
      throw Error(`HTTP ${response?.status()} al abrir ${target}`);
    await page
      .getByRole("heading", {
        level: 1,
        name: "Tu resumen",
      })
      .waitFor({ state: "visible", timeout: 20000 });
    await page
      .getByRole("button", { name: "Nuevo movimiento", exact: true })
      .waitFor({ state: "visible" });
    await expect(
      page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
    ).toBeEnabled({ timeout: 20000 });
    if (await page.locator("#startup-shell").isVisible())
      throw Error("El arranque no se completó");
    await page.waitForFunction(
      async () => !!(await navigator.serviceWorker.getRegistration())?.active,
      undefined,
      { timeout: 20000 },
    );
    const registration = await page.evaluate(async () => {
      const sw = await navigator.serviceWorker.ready;
      return {
        scope: sw.scope,
        script: sw.active?.scriptURL,
        waiting: !!sw.waiting,
      };
    });
    if (new URL(registration.scope).pathname !== "/mi-dinero-pwa/")
      throw Error("Alcance de service worker incorrecto");
    if (errors.length) throw Error(errors.join("\n"));
    console.log(
      JSON.stringify(
        { target, interfaceVisible: true, registration, resources },
        null,
        2,
      ),
    );
  } finally {
    await mkdir("test-results", { recursive: true });
    await page
      .screenshot({ path: "test-results/pages-live.png", fullPage: true })
      .catch(() => {});
    if (errors.length)
      console.error(JSON.stringify({ errors, resources }, null, 2));
  }
} finally {
  await browser.close();
}
