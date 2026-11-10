import { WARDS as CLOSURE_WARDS } from "../closure/data";
import { DEPARTMENTS } from "./departments";

/**
 * Other hospitals, as the public sees them: anonymous (letter only), approximate district, and
 * public capacity figures per ward. No costs, no patients, no names. Invented demo data — where it
 * really comes from (ÚZIS, insurers, regional plans) is still to be decided.
 */
export interface OtherWard {
  code: string;
  beds: number;
  /** Average occupancy 0..1 */
  occ: number;
  /** Share of posts that are open, 0..1 */
  openPosts: number;
  /** Doctors and nurses (FTE) per 10 beds */
  staffPer10Beds: number;
}

export interface OtherHospital {
  id: string;
  label: string;
  district: string;
  kind: string;
  lat: number;
  lon: number;
  wards: OtherWard[];
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KIND = (t: string) => (t.includes("University") ? "University hospital" : t.includes("institute") ? "Specialised institute" : "Hospital");

export const OTHER_HOSPITALS: OtherHospital[] = CLOSURE_WARDS.map((w, i) => {
  const r = rng(9001 + i * 31);
  const size = 0.6 + r() * 1.1;
  const wards = DEPARTMENTS
    .filter((d) => d.code === "CAR" || d.code === "INT" || r() > 0.25) // everyone has internal medicine and cardiology
    .map((d) => {
      const base = { INT: 80, SUR: 55, ORT: 38, CAR: w.beds_std + w.beds_ccu, NEU: 30, ONC: 34, PED: 30, OBG: 32, ICU: 20, GER: 45, PSY: 40 }[d.code] ?? 30;
      return {
        code: d.code,
        beds: Math.max(8, Math.round((d.code === "CAR" ? base : base * size) * (0.85 + r() * 0.3))),
        occ: Math.min(0.99, d.code === "CAR" ? w.occ : 0.62 + r() * 0.34),
        openPosts: Math.round((d.code === "CAR" ? w.vacancies / (w.phys + w.nurses + w.vacancies) : 0.01 + r() * 0.11) * 1000) / 1000,
        staffPer10Beds: Math.round((d.code === "ICU" ? 32 + r() * 10 : 11 + r() * 6) * 10) / 10,
      };
    });
  return { id: `h${i + 1}`, label: `Hospital ${String.fromCharCode(65 + i)}`, district: w.district, kind: KIND(w.type), lat: w.lat, lon: w.lon, wards };
});

/** Share of open posts across all wards of a hospital, weighted by beds. */
export const openPostsOf = (h: OtherHospital, code?: string) => {
  const ws = code ? h.wards.filter((w) => w.code === code) : h.wards;
  const beds = ws.reduce((s, w) => s + w.beds, 0);
  return beds ? ws.reduce((s, w) => s + w.openPosts * w.beds, 0) / beds : null;
};
