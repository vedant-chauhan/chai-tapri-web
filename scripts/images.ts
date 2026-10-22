/**
 * Menu photo pipeline (PHASE-4-FOUNDATION §3 "Images", F4-6). No paid image service.
 *
 *   pnpm images                       # assets-src/menu → public/menu
 *   pnpm images --in <dir> --out <dir>
 *
 * For each source photo writes `<slug>-<width>.avif|webp` at 360/720/1080/1440 px, plus
 * `manifest.json` (slug → intrinsic size) for next/image's width/height. Images are rotated per
 * EXIF and all metadata (camera, GPS) is stripped. Never upscales: a small original gives
 * variants at its own width so every URL the loader can ask for exists.
 *
 * Originals stay out of git (usage rights pending, CLIENT_QUESTIONS F9); variants are committed.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { MENU_IMAGE_FORMATS, MENU_IMAGE_WIDTHS, type MenuImageFormat } from "../src/lib/image-variants";

const SOURCE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]);
const QUALITY: Record<MenuImageFormat, number> = { avif: 50, webp: 74 };

export interface ManifestEntry {
  slug: string;
  source: string;
  width: number;
  height: number;
}

/** "Masala Chai (2).JPG" → "masala-chai-2" */
export function slugify(fileName: string): string {
  return path
    .parse(fileName)
    .name.normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function processImages(inDir: string, outDir: string): Promise<ManifestEntry[]> {
  const files = (await readdir(inDir)).filter((f) => SOURCE_EXTENSIONS.has(path.extname(f).toLowerCase())).sort();
  await mkdir(outDir, { recursive: true });

  const manifest: ManifestEntry[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const slug = slugify(file);
    if (!slug) throw new Error(`Can't make a slug from "${file}"`);
    if (seen.has(slug)) throw new Error(`Two source files map to the slug "${slug}"; rename one.`);
    seen.add(slug);

    // .rotate() applies EXIF orientation; sharp drops all metadata unless asked to keep it.
    const source = sharp(path.join(inDir, file)).rotate();
    const { width, height } = await source
      .clone()
      .toBuffer({ resolveWithObject: true })
      .then((r) => r.info);

    for (const targetWidth of MENU_IMAGE_WIDTHS) {
      const resized = source.clone().resize({ width: targetWidth, withoutEnlargement: true });
      for (const format of MENU_IMAGE_FORMATS) {
        const out = path.join(outDir, `${slug}-${targetWidth}.${format}`);
        await resized.clone().toFormat(format, { quality: QUALITY[format] }).toFile(out);
      }
    }
    manifest.push({ slug, source: file, width, height });
    console.log(`✓ ${file} → ${slug} (${width}×${height})`);
  }

  await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function main() {
  const { values } = parseArgs({
    options: { in: { type: "string", default: "assets-src/menu" }, out: { type: "string", default: "public/menu" } },
  });
  const inDir = values.in!;
  const hasPhotos =
    existsSync(inDir) && (await readdir(inDir)).some((f) => SOURCE_EXTENSIONS.has(path.extname(f).toLowerCase()));
  if (!hasPhotos) {
    console.error(`No photos found in ${inDir}. Put the owner's menu photos there (jpg/png/webp/tiff).`);
    process.exit(1);
  }
  const manifest = await processImages(inDir, values.out!);
  console.log(
    `Wrote ${manifest.length * MENU_IMAGE_WIDTHS.length * MENU_IMAGE_FORMATS.length} variants to ${values.out}.`,
  );
}

// Run only when executed directly (the test imports processImages).
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((err: unknown) => {
    console.error("images failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
