/** Web-Mercator ("slippy map") tile maths for the map background. Pure functions, tested in tests/closure.test.ts. */

export const tileX = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z);
export const tileY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};
/** Longitude of the left edge of tile column x. */
export const tileLon = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
/** Latitude of the top edge of tile row y. */
export const tileLat = (y: number, z: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;

export interface Tile { x: number; y: number; z: number; north: number; south: number; west: number; east: number }

/** Zoom level whose tiles are about `target` pixels wide when one degree of longitude is `pxPerDegLon` pixels. */
export const zoomFor = (pxPerDegLon: number, target = 300) =>
  Math.max(8, Math.min(16, Math.round(Math.log2((360 * pxPerDegLon) / target))));

/** All tiles needed to cover a lat/lon box, with their edges. */
export function tilesCovering(box: { north: number; south: number; west: number; east: number }, z: number): Tile[] {
  const x0 = tileX(box.west, z), x1 = tileX(box.east, z);
  const y0 = tileY(box.north, z), y1 = tileY(box.south, z);
  const out: Tile[] = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    out.push({ x, y, z, west: tileLon(x, z), east: tileLon(x + 1, z), north: tileLat(y, z), south: tileLat(y + 1, z) });
  }
  return out;
}

/** Dark basemap (OpenStreetMap data, CARTO style). Retina (@2x) tiles. Attribution: see MAP_ATTRIBUTION. */
export const tileUrl = (t: Pick<Tile, "x" | "y" | "z">) => `https://${"abc"[(t.x + t.y) % 3]}.basemaps.cartocdn.com/dark_all/${t.z}/${t.x}/${t.y}@2x.png`;
export const MAP_ATTRIBUTION = "© OpenStreetMap contributors © CARTO";
