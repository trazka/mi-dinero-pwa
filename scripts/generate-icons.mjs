import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const svg = await readFile(
  new URL("../public/icon-v2.svg", import.meta.url),
  "utf8",
);
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_USE_BUNDLED_BROWSER
    ? undefined
    : process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
});
try {
  const page = await browser.newPage();
  for (const [filename, size] of [
    ["icon-v2-192.png", 192],
    ["icon-v2-512.png", 512],
    ["apple-touch-icon-v2.png", 180],
  ]) {
    const encoded = await page.evaluate(
      async ({ svg, size }) => {
        const image = new Image();
        image.src =
          "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        canvas.getContext("2d").drawImage(image, 0, 0, size, size);
        return canvas.toDataURL("image/png").split(",")[1];
      },
      { svg, size },
    );
    await writeFile(
      new URL("../public/" + filename, import.meta.url),
      Buffer.from(encoded, "base64"),
    );
  }
} finally {
  await browser.close();
}
