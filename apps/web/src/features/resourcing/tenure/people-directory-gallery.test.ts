import { describe, expect, test } from "bun:test";

import {
  peopleDirectoryGalleryImageUrl,
  peopleDirectoryGalleryItems,
  wrapDirectoryIndex,
} from "./people-directory-gallery";

describe("wrapDirectoryIndex", () => {
  test("returns 0 for an empty roster", () => {
    expect(wrapDirectoryIndex(4, 0)).toBe(0);
  });

  test("wraps negative and overflow indexes", () => {
    expect(wrapDirectoryIndex(-1, 13)).toBe(12);
    expect(wrapDirectoryIndex(13, 13)).toBe(0);
    expect(wrapDirectoryIndex(2, 13)).toBe(2);
  });
});

describe("peopleDirectoryGalleryItems", () => {
  test("prefers a stored avatar URL", () => {
    expect(
      peopleDirectoryGalleryImageUrl({
        userId: "user-1",
        userName: "Ada Lovelace",
        userAvatar: "https://cdn.example/ada.png",
      }),
    ).toBe("https://cdn.example/ada.png");
  });

  test("falls back to a raster DiceBear glyph for WebGL", () => {
    expect(
      peopleDirectoryGalleryImageUrl({
        userId: "user-1",
        userName: "Ada Lovelace",
        userAvatar: null,
      }),
    ).toBe("https://api.dicebear.com/10.x/glyphs/png?seed=user-1&size=512");
  });

  test("maps cards to gallery items", () => {
    expect(
      peopleDirectoryGalleryItems([
        {
          userId: "user-1",
          userName: "Ada Lovelace",
          userAvatar: null,
        },
      ]),
    ).toEqual([
      {
        userId: "user-1",
        image: "https://api.dicebear.com/10.x/glyphs/png?seed=user-1&size=512",
        text: "Ada Lovelace",
      },
    ]);
  });
});
