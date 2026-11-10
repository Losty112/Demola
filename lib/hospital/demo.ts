import type { HospitalData, Row } from "./datasets";
import { DEPARTMENTS } from "./departments";
import { PERIOD_MONTHS, daysInMonth, monthIndex } from "./period";

/**
 * The demo hospital: an invented hospital with every dataset already filled in, so the director view
 * can be explored with one click. Deterministic (same numbers on every load). All figures are invented.
 */
export interface Profile {
  id: string;
  name: string;
  city: string;
  /** Map position (optional: a new profile has none until it is set) */
  lat?: number;
  lon?: number;
  demo?: boolean;
  createdAt: string;
}

export const DEMO_PROFILE: Profile = {
  id: "demo",
  name: "Riverside General Hospital",
  city: "Praha 9 – Vysočany",
  lat: 50.1095,
  lon: 14.5005,
  demo: true,
  createdAt: "2026-11-01",
};

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

// Seasonal profiles, January..December
const OCC_SEASON = [1.06, 1.05, 1.02, 0.99, 0.98, 0.96, 0.92, 0.93, 0.99, 1.02, 1.04, 1.06];
const ELEC_SEASON = [1.05, 1.0, 0.98, 0.94, 0.95, 1.02, 1.1, 1.08, 0.97, 0.95, 0.98, 1.04]; // summer cooling peak
const HEAT_SEASON = [1.85, 1.65, 1.35, 0.85, 0.45, 0.3, 0.28, 0.3, 0.5, 0.95, 1.45, 1.75];

interface WardSpec {
  code: string; beds: number; occ: number; alos: number; emergency: number;
  doctors: number; nurses: number; openDoc: number; openNurse: number; medsPerPatient: number;
}

// The story the demo tells: cardiology and geriatrics are full, ICU is short of nurses,
// orthopaedics and paediatrics have free beds, energy and building cost are above the benchmark.
const WARDS: WardSpec[] = [
  { code: "INT", beds: 96, occ: 0.89, alos: 6.1, emergency: 0.71, doctors: 20, nurses: 118, openDoc: 2, openNurse: 9, medsPerPatient: 610 },
  { code: "SUR", beds: 66, occ: 0.81, alos: 4.4, emergency: 0.38, doctors: 18, nurses: 84, openDoc: 1, openNurse: 4, medsPerPatient: 540 },
  { code: "ORT", beds: 44, occ: 0.63, alos: 5.4, emergency: 0.29, doctors: 11, nurses: 50, openDoc: 0, openNurse: 2, medsPerPatient: 470 },
  { code: "CAR", beds: 40, occ: 0.97, alos: 4.7, emergency: 0.62, doctors: 11, nurses: 54, openDoc: 2, openNurse: 6, medsPerPatient: 880 },
  { code: "NEU", beds: 30, occ: 0.86, alos: 6.9, emergency: 0.66, doctors: 7, nurses: 38, openDoc: 1, openNurse: 3, medsPerPatient: 720 },
  { code: "PED", beds: 32, occ: 0.58, alos: 3.3, emergency: 0.52, doctors: 9, nurses: 50, openDoc: 0, openNurse: 1, medsPerPatient: 260 },
  { code: "OBG", beds: 34, occ: 0.71, alos: 3.2, emergency: 0.34, doctors: 9, nurses: 48, openDoc: 1, openNurse: 2, medsPerPatient: 300 },
  { code: "ICU", beds: 22, occ: 0.91, alos: 4.0, emergency: 0.86, doctors: 13, nurses: 64, openDoc: 2, openNurse: 11, medsPerPatient: 2900 },
  { code: "GER", beds: 56, occ: 0.95, alos: 11.8, emergency: 0.55, doctors: 7, nurses: 52, openDoc: 1, openNurse: 5, medsPerPatient: 690 },
];

const FLOOR_M2 = 57_000;
const DOCTOR_COST = 96_000; // € per FTE and year, incl. contributions
const NURSE_COST = 47_500;

const round = (v: number, d = 0) => { const f = 10 ** d; return Math.round(v * f) / f; };

export function demoData(): HospitalData {
  const r = rng(20261107);
  const wobble = (amp: number) => 1 + (r() + r() - 1) * amp;
  const supplied = (by: string, at: string) => ({ suppliedBy: by, uploadedAt: at, fileName: "demo data" });

  const wards: Row[] = WARDS.map((w) => ({ ward: w.code, beds: w.beds }));

  const patients: Row[] = [];
  for (const month of PERIOD_MONTHS) {
    const days = daysInMonth(month);
    for (const w of WARDS) {
      const occ = Math.min(1.02, w.occ * OCC_SEASON[monthIndex(month)] * wobble(0.025));
      const bedDays = Math.round(w.beds * days * occ);
      const admissions = Math.round((bedDays / w.alos) * wobble(0.03));
      patients.push({ month, ward: w.code, admissions, emergency_admissions: Math.round(admissions * w.emergency * wobble(0.04)), bed_days: bedDays });
    }
  }

  const staff: Row[] = WARDS.map((w) => ({ ward: w.code, doctors: w.doctors, nurses: w.nurses, open_doctor_posts: w.openDoc, open_nurse_posts: w.openNurse }));

  const energy: Row[] = PERIOD_MONTHS.map((month) => {
    const i = monthIndex(month), share = daysInMonth(month) / 365;
    return {
      month,
      electricity_kwh: Math.round(5_350_000 * share * ELEC_SEASON[i] * wobble(0.02)),
      heat_kwh: Math.round(9_400_000 * share * HEAT_SEASON[i] * wobble(0.04)),
      water_m3: Math.round(118_000 * share * wobble(0.05)),
    };
  });

  // Spending: staff from FTE, medicines per patient, building and energy shared out by beds
  const totalBeds = WARDS.reduce((s, w) => s + w.beds, 0);
  const yearAdmissions = (code: string) => patients.filter((p) => p.ward === code).reduce((s, p) => s + Number(p.admissions), 0);
  const elecKwh = energy.reduce((s, e) => s + Number(e.electricity_kwh), 0);
  const heatKwh = energy.reduce((s, e) => s + Number(e.heat_kwh), 0);
  const energyEur = elecKwh * 0.21 + heatKwh * 0.085;
  const buildingEur = FLOOR_M2 * 285;
  const intensity: Record<string, number> = { ICU: 2.2, CAR: 1.3, SUR: 1.2 }; // equipment-heavy wards use more energy per bed
  const weightSum = WARDS.reduce((s, w) => s + w.beds * (intensity[w.code] ?? 1), 0);
  const costs: Row[] = WARDS.map((w) => {
    const share = (w.beds * (intensity[w.code] ?? 1)) / weightSum;
    return {
      ward: w.code,
      staff_eur: round(w.doctors * DOCTOR_COST + w.nurses * NURSE_COST, -3),
      medicines_eur: round(yearAdmissions(w.code) * w.medsPerPatient, -3),
      building_eur: round(buildingEur * (w.beds / totalBeds), -3),
      energy_eur: round(energyEur * share, -3),
    };
  });

  const building: Row[] = [{ floor_area_m2: FLOOR_M2, space_in_use_pct: 70, or_utilisation_pct: 64, avg_travel_min: 31 }];

  return {
    wards: { rows: wards, ...supplied("Medical director's office · M. Dvořák", "2026-11-03") },
    patients: { rows: patients, ...supplied("Controlling · hospital information system export", "2026-11-04") },
    staff: { rows: staff, ...supplied("HR department · P. Novotná", "2026-11-02") },
    costs: { rows: costs, ...supplied("Finance · L. Svoboda", "2026-11-05") },
    energy: { rows: energy, ...supplied("Technical department · J. Kovář", "2026-11-03") },
    building: { rows: building, ...supplied("Technical department · J. Kovář", "2026-10-20") },
  };
}

/** Departments the demo hospital does not have (so the one list still shows them as "no ward"). */
export const DEMO_MISSING = DEPARTMENTS.filter((d) => !WARDS.some((w) => w.code === d.code)).map((d) => d.code);
