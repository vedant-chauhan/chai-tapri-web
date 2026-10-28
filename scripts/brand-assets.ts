/**
 * Cuts the client's logo (assets-src/brand/logo-source.webp, transparent PNG/WebP, 2000×1333) into
 * the pieces the site uses. Re-run with `pnpm brand` if the client sends a better (e.g. vector) file
 * of the same layout. Outputs are committed; the source stays out of git like the photos.
 *
 *   public/brand/logo-mark.webp      chaiwala illustration (header, 4× of 48 px)
 *   public/brand/logo-wordmark.webp  "CHAI TAPRI" + swash (header)
 *   public/brand/logo-full.webp      the whole lockup incl. "Northbridge" (footer)
 *   src/app/icon.png                 browser tab icon (transparent, 256 px, palette PNG)
 *   src/app/apple-icon.png           home-screen icon (cream background, 180 px)
 */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const SOURCE = "assets-src/brand/logo-source.webp";

// Content bands measured from the source's alpha channel (x0, y0, x1, y1), with a little padding.
const MARK = { left: 655, top: 160, width: 641, height: 656 };
const WORDMARK = { left: 570, top: 838, width: 856, height: 188 };
const FULL = { left: 570, top: 160, width: 856, height: 958 };
const CREAM = "#FDF6EA";

async function main() {
  await mkdir("public/brand", { recursive: true });
  const src = () => sharp(SOURCE).ensureAlpha();

  await src()
    .extract(MARK)
    .resize({ height: 192 })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile("public/brand/logo-mark.webp");
  await src()
    .extract(WORDMARK)
    .resize({ height: 112 })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile("public/brand/logo-wordmark.webp");
  await src()
    .extract(FULL)
    .resize({ width: 640 })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile("public/brand/logo-full.webp");

  const mark = await src().extract(MARK).toBuffer();
  await sharp(mark)
    .resize(232, 232, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 12, bottom: 12, left: 12, right: 12, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ palette: true, quality: 90 })
    .toFile("src/app/icon.png");
  await sharp(mark)
    .resize(152, 152, { fit: "contain", background: CREAM })
    .extend({ top: 14, bottom: 14, left: 14, right: 14, background: CREAM })
    .flatten({ background: CREAM })
    .png({ palette: true, quality: 90 })
    .toFile("src/app/apple-icon.png");

  for (const f of [
    "public/brand/logo-mark.webp",
    "public/brand/logo-wordmark.webp",
    "public/brand/logo-full.webp",
    "src/app/icon.png",
    "src/app/apple-icon.png",
  ]) {
    const m = await sharp(f).metadata();
    console.log(`✓ ${f} ${m.width}×${m.height}`);
  }
}

main().catch((err: unknown) => {
  console.error("brand failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
