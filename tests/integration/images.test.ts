import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { processImages, slugify } from "../../scripts/images";
import { MENU_IMAGE_FORMATS, MENU_IMAGE_WIDTHS } from "@/lib/image-variants";
import imageLoader from "@/lib/image-loader";

let root: string;
let inDir: string;
let outDir: string;

const solid = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 158, g: 27, b: 30 } } });

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), "chai-images-"));
  inDir = path.join(root, "in");
  outDir = path.join(root, "out");
  await import("node:fs/promises").then((fs) => fs.mkdir(inDir));

  // 18 ordinary "photos" + 1 phone photo (EXIF + rotated) + 1 small original = 20, like the owner's set.
  for (let i = 1; i <= 18; i++)
    await solid(2000, 1500)
      .jpeg()
      .toFile(path.join(inDir, `Item ${i}.jpg`));
  await solid(1600, 1200)
    .withMetadata({ orientation: 6 })
    .withExif({ IFD0: { Artist: "Someone's phone", Copyright: "private" } })
    .jpeg()
    .toFile(path.join(inDir, "MasalaChai.JPG"));
  await solid(600, 400).png().toFile(path.join(inDir, "small-photo.png"));
}, 60_000);

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("slugify", () => {
  it.each([
    ["MasalaChai.JPG", "masala-chai"],
    ["Cheese Vada Pav (2).jpeg", "cheese-vada-pav-2"],
    ["  Kurkure_Chaat .png", "kurkure-chaat"],
    ["Café Latte.webp", "cafe-latte"],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("pnpm images (F4-6 acceptance: variants for 20 photos)", () => {
  it("writes every width × format for every photo, plus a manifest", async () => {
    const manifest = await processImages(inDir, outDir);
    expect(manifest).toHaveLength(20);

    const files = new Set(await readdir(outDir));
    for (const { slug } of manifest) {
      for (const w of MENU_IMAGE_WIDTHS) {
        for (const f of MENU_IMAGE_FORMATS) expect(files.has(`${slug}-${w}.${f}`)).toBe(true);
      }
    }
    expect(files.size).toBe(20 * MENU_IMAGE_WIDTHS.length * MENU_IMAGE_FORMATS.length + 1);

    const saved = JSON.parse(await readFile(path.join(outDir, "manifest.json"), "utf8"));
    expect(saved).toEqual(manifest);
  }, 120_000);

  it("resizes to the target width and keeps the aspect ratio", async () => {
    const meta = await sharp(path.join(outDir, "item-1-720.webp")).metadata();
    expect(meta.width).toBe(720);
    expect(meta.height).toBe(540);
  });

  it("applies EXIF rotation and strips all metadata", async () => {
    const meta = await sharp(path.join(outDir, "masala-chai-1080.avif")).metadata();
    expect(meta.width).toBe(1080); // portrait after rotation: 1200×1600 → 1080×1440
    expect(meta.height).toBe(1440);
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation ?? 1).toBe(1);
  });

  it("never upscales a small original", async () => {
    const meta = await sharp(path.join(outDir, "small-photo-1440.webp")).metadata();
    expect(meta.width).toBe(600);
  });

  it("the next/image loader resolves to files that exist", async () => {
    const files = new Set(await readdir(outDir));
    for (const requested of [16, 360, 400, 828, 1080, 1920, 3840]) {
      const url = imageLoader({ src: "/menu/item-1", width: requested });
      expect(files.has(path.basename(url))).toBe(true);
    }
    expect(imageLoader({ src: "/logo.svg", width: 640 })).toBe("/logo.svg");
  });

  it("refuses two files with the same slug", async () => {
    const dup = path.join(root, "dup");
    await import("node:fs/promises").then((fs) => fs.mkdir(dup));
    await solid(10, 10).jpeg().toFile(path.join(dup, "Masala Chai.jpg"));
    await solid(10, 10).png().toFile(path.join(dup, "masala-chai.png"));
    await expect(processImages(dup, path.join(root, "dup-out"))).rejects.toThrow(/map to the slug "masala-chai"/);
  });
});
