// Derive a compact heightmap for the 3D terrain view from public/data/elevation.tif.
// Output: public/data/terrain.bin (Uint16, row-major, north row first) + lib/data/terrain.json (scale).
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { fromFile } from "geotiff";

const root = fileURLToPath(new URL("..", import.meta.url));
const image = await (await fromFile(`${root}public/data/elevation.tif`)).getImage();
const [raster] = await image.readRasters();
const width = image.getWidth();
const height = image.getHeight();
const valid = value => Number.isFinite(value) && value > -1e5;

let min = Infinity;
let max = -Infinity;
for (const value of raster) if (valid(value)) { min = Math.min(min, value); max = Math.max(max, value); }

// Fill gaps with the minimum so the mesh stays watertight; 0 is reserved for no data.
const grid = new Uint16Array(width * height);
let missing = 0;
raster.forEach((value, i) => {
  if (!valid(value)) { missing++; grid[i] = 0; return; }
  grid[i] = 1 + Math.round((value - min) / (max - min) * 65534);
});

await writeFile(`${root}public/data/terrain.bin`, Buffer.from(grid.buffer));
const meta = { width, height, min: Number(min.toFixed(3)), max: Number(max.toFixed(3)), missing, resolutionM: 1 };
await writeFile(`${root}lib/data/terrain.json`, JSON.stringify(meta) + "\n");
console.log(meta);
