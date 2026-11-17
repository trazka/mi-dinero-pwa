import { expect, type Locator, type Page } from "@playwright/test";
export async function setBackupFile(
  page: Page,
  file: Parameters<Locator["setInputFiles"]>[0],
) {
  const restore = page.locator(".page .backup-restore");
  if (
    (await restore.count()) &&
    !(await restore.evaluate((el) => el.hasAttribute("open")))
  ) {
    await restore.locator(":scope > summary").click();
  }
  const input = page.locator(".page input[type=file]");
  // A download may already be available while its export timestamp is still
  // being committed. Respect the same disabled control as a real file picker.
  await expect(input).toBeEnabled();
  await input.setInputFiles(file);
}

export async function openBackupExports(page: Page) {
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  const section = page.locator(".page .backup-exports");
  if (!(await section.evaluate((el) => el.hasAttribute("open")))) {
    await section.locator(":scope > summary").click();
  }
}

export async function openSaveBackup(page: Page) {
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  const section = page.locator(".page .backup-save");
  if (!(await section.evaluate((el) => el.hasAttribute("open")))) {
    await section.locator(":scope > summary").click();
  }
}
export async function openSecurity(page: Page) {
  await expect(page.locator(".page-preview-content h1")).toHaveCount(0);
  const section = page.locator(".page .security-panel");
  if (!(await section.evaluate((el) => el.hasAttribute("open")))) {
    await section.locator(":scope > summary").click();
  }
}
