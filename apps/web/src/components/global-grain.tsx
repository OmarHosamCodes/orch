import { useEffect } from "react";

const GRAIN_TILE_SIZE = 256;
const GRAIN_ALPHA = 12;

function createGrainTile(): string {
  const canvas = document.createElement("canvas");
  canvas.width = GRAIN_TILE_SIZE;
  canvas.height = GRAIN_TILE_SIZE;

  const context = canvas.getContext("2d");
  if (!context) return "";

  const image = context.createImageData(GRAIN_TILE_SIZE, GRAIN_TILE_SIZE);
  for (let index = 0; index < image.data.length; index += 4) {
    const value = Math.floor(Math.random() * 256);
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
    image.data[index + 3] = GRAIN_ALPHA;
  }

  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

export function GlobalGrain() {
  useEffect(() => {
    const grain = createGrainTile();
    const root = document.documentElement;

    if (grain) {
      root.style.setProperty("--orch-grain-image", `url("${grain}")`);
    }

    return () => {
      root.style.removeProperty("--orch-grain-image");
    };
  }, []);

  return null;
}
