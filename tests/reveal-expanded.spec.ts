import { openSidebar } from "./layout-utils";
import { test, expect } from "@playwright/test";
import { setBackupFile } from "./backup-utils";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
]) {
  test(`desplegar y editar el último recurrente lo muestra dentro de la vista ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    if (viewport.width > 800) await openSidebar(page);
    const nav =
      viewport.width > 800
        ? page.locator(".sidebar")
        : page.getByRole("navigation", { name: "Navegación principal" });
    await nav.getByRole("button", { name: "Respaldos", exact: true }).click();
    page.once("dialog", (d) => d.accept());
    await setBackupFile(page, {
      name: "vista.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          version: 2,
          movements: [],
          debts: [],
          recurrents: Array.from({ length: 8 }, (_, i) => ({
            id: String(i),
            merchant: `Servicio ${i}`,
            amount: 100,
            category: "Hogar",
            method: "Efectivo",
            frequency: "monthly",
            active: true,
            nextDate: "2099-12-06",
            anchorDay: 6,
          })),
        }),
      ),
    });
    await expect(page.getByRole("status")).toContainText("Datos guardados");
    await nav.getByRole("button", { name: "Movimientos", exact: true }).click();
    await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Gastos recurrentes", exact: true })
      .click();
    const item = page.locator(".page .recurring-item").last();
    const summary = item.locator("summary");
    await summary.click();
    const bounds = () =>
      page.evaluate(() => {
        const p = document.querySelector(".page")!.getBoundingClientRect();
        const n = document
          .querySelector(".mobile-nav")!
          .getBoundingClientRect();
        const el = document
          .querySelector(".page .recurring-item:last-child")!
          .getBoundingClientRect();
        const scrollable =
          getComputedStyle(document.querySelector(".page")!).overflowY ===
          "auto";
        return {
          top: Math.max(0, p.top),
          bottom: scrollable
            ? Math.min(p.bottom, n.height ? n.top : innerHeight)
            : innerHeight,
          itemTop: el.top,
          itemBottom: el.bottom,
        };
      });
    await expect
      .poll(async () => {
        const b = await bounds();
        return b.itemBottom <= b.bottom - 10 && b.itemTop >= b.top;
      })
      .toBe(true);
    await item
      .getByRole("button", {
        name: "Editar recurrente Servicio 7",
        exact: true,
      })
      .click();
    const form = item.locator(".planning-form");
    await expect
      .poll(async () => {
        const box = await form.boundingBox();
        const b = await bounds();
        return !!box && box.y >= b.top && box.y + 100 < b.bottom;
      })
      .toBe(true);
    await expect(
      form.getByLabel("Concepto recurrente", { exact: true }),
    ).toBeInViewport();
  });
}
