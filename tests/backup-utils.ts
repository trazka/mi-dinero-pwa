import { expect, type Locator, type Page } from "@playwright/test";
export async function setBackupFile(
  page: Page,
  file: Parameters<Locator["setInputFiles"]>[0],
) {
  const input = page.locator("input[type=file]");
  // A download may already be available while its export timestamp is still
  // being committed. Respect the same disabled control as a real file picker.
  await expect(input).toBeEnabled();
  await input.setInputFiles(file);
}
