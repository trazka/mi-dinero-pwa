import { chromium } from "@playwright/test";
import { copyFile, readFile, writeFile } from "node:fs/promises";
const source =
  "data:image/png;base64," +
  (
    await readFile(new URL("../assets/icon-v5-master.png", import.meta.url))
  ).toString("base64");
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_USE_BUNDLED_BROWSER
    ? undefined
    : process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
});
try {
  const page = await browser.newPage();
  for (const [filename, size] of [
    ["icon-v5-192.png", 192],
    ["icon-v5-512.png", 512],
    ["apple-touch-icon-v5.png", 180],
  ]) {
    const encoded = await page.evaluate(
      async ({ source, size }) => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        canvas.getContext("2d").drawImage(image, 0, 0, size, size);
        return canvas.toDataURL("image/png").split(",")[1];
      },
      { source, size },
    );
    await writeFile(
      new URL("../public/" + filename, import.meta.url),
      Buffer.from(encoded, "base64"),
    );
  }
} finally {
  await browser.close();
}

// Preserve legacy launcher URLs, serving the current M to clients that refresh them.
for (const [source, destinations] of [
  [
    "icon-v5-192.png",
    ["icon-192.png", "icon-v2-192.png", "icon-v3-192.png", "icon-v4-192.png"],
  ],
  [
    "icon-v5-512.png",
    ["icon-512.png", "icon-v2-512.png", "icon-v3-512.png", "icon-v4-512.png"],
  ],
  [
    "apple-touch-icon-v5.png",
    [
      "apple-touch-icon.png",
      "apple-touch-icon-v2.png",
      "apple-touch-icon-v3.png",
      "apple-touch-icon-v4.png",
    ],
  ],
]) {
  for (const destination of destinations) {
    await copyFile(
      new URL("../public/" + source, import.meta.url),
      new URL("../public/" + destination, import.meta.url),
    );
  }
}
