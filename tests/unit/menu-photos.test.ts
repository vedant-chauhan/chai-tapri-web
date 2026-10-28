import { describe, expect, it } from "vitest";
import { findItem } from "@/domain/menu";
import { photoFor } from "@/domain/menu-photos";
import index from "@/domain/menu-photos.json";

describe("photoFor", () => {
  it("returns nothing for items without a photo", () => {
    expect(photoFor(findItem("bournvita")!)).toBeNull();
  });

  it("returns a photo only once it has been processed into the index", () => {
    const processed = (index as Record<string, unknown>)["masala-chai"];
    const photo = photoFor(findItem("masala-chai")!);
    if (processed) expect(photo).toMatchObject({ src: "/menu/masala-chai" });
    else expect(photo).toBeNull();
  });
});
