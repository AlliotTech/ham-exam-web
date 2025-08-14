import sharp from "sharp";
import { readFile } from "fs/promises";
import path from "path";

const sizes = [192, 512];

async function generateIcons() {
  try {
    const svg = await readFile("./public/pwa-icon.svg");

    await Promise.all(
      sizes.map(async (size) => {
        await sharp(svg).resize(size, size).png().toFile(`./public/pwa-icon-${size}.png`);
        console.log(`Generated ${size}x${size} icon`);
      }),
    );

    console.log("All PWA icons generated successfully!");
  } catch (error) {
    console.error("Error generating PWA icons:", error);
    process.exit(1);
  }
}

generateIcons();
