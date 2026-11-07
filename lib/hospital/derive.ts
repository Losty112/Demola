import type { Snapshot } from "../domain/types";
import type { DatasetId, HospitalData } from "./datasets";
import { DEPARTMENT_BY_CODE, deptOrder } from "./departments";
import { DAYS_IN_PERIOD, PERIOD_MONTHS, daysInMonth } from "./period";

/**
 * Everything the pages show, computed from the uploaded datasets. Pages never store or re-enter a
 * number: they read this view. A field is null when the dataset it comes from is not uploaded yet.
 */
export interface WardView {
  code: string;
  name: string;
  beds: number;
  // patients
  admissions: number | null;
  emergency: number | null;
  bedDays: number | null;
  occupancy: number | null; // 0..1
  alos: number | null;
  /** Average free beds on a typical day */
  freeBeds: number | null;
  // staff
  doctors: number | null;
  nurses: number | null;
  openDoctor: number | null;
  openNurse: number | null;
  openShare: number | null; // 0..1
  // spending (12 months)
  cost: { staff: number; medicines: number; building: number; energy: number; total: number } | null;
  costPerPatient: number | null;
}

export interface MonthView {
  month: string;
  admissions: number | null;
  emergency: number | null;
  bedDays: number | null;
  electricity: number | null;
  heat: number | null;
  water: number | null;
}

export interface HospitalView {
  has: Record<DatasetId, boolean>;
  wards: WardView[];
  months: MonthView[];
  totals: {
    beds: number | null;
    admissions: number | null;
    emergency: number | null;
    bedDays: number | null;
    occupancy: number | null;
    alos: number | null;
    freeBeds: number | null;
    doctors: number | null;
    nurses: number | null;
    openPosts: number | null;
    openShare: number | null;
    cost: { staff: number; medicines: number; building: number; energy: number; total: number } | null;
    costPerPatient: number | null;
    electricity: number | null;
    heat: number | null;
    water: number | null;
    floorArea: number | null;
  };
  /** The eight benchmark metrics, once every dataset they need is uploaded */
  snapshot: Snapshot | null;
  /** Which datasets are still missing for the benchmark metrics */
  snapshotNeeds: DatasetId[];
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const n = (v: unknown) => Number(v);

export function deriveView(data: HospitalData): HospitalView {
  const has = { wards: !!data.wards, patients: !!data.patients, staff: !!data.staff, costs: !!data.costs, energy: !!data.energy, building: !!data.building };
  const wardRows = data.wards?.rows ?? [];
  const pat = data.patients?.rows ?? [];
  const staff = data.staff?.rows ?? [];
  const costs = data.costs?.rows ?? [];
  const energy = data.energy?.rows ?? [];
  const building = data.building?.rows[0];

  // The ward list: the wards dataset decides which wards exist; otherwise any ward that appears elsewhere
  const codes = new Set<string>(wardRows.map((r) => String(r.ward)));
  if (!codes.size) for (const r of [...pat, ...staff, ...costs]) codes.add(String(r.ward));

  const wards: WardView[] = [...codes].sort((a, b) => deptOrder(a) - deptOrder(b)).map((code) => {
    const beds = n(wardRows.find((r) => r.ward === code)?.beds ?? 0);
    const p = pat.filter((r) => r.ward === code);
    const s = staff.find((r) => r.ward === code);
    const c = costs.find((r) => r.ward === code);
    const admissions = has.patients ? sum(p.map((r) => n(r.admissions))) : null;
    const emergency = has.patients ? sum(p.map((r) => n(r.emergency_admissions))) : null;
    const bedDays = has.patients ? sum(p.map((r) => n(r.bed_days))) : null;
    const occupancy = bedDays !== null && beds ? bedDays / (beds * DAYS_IN_PERIOD) : null;
    const cost = c ? { staff: n(c.staff_eur), medicines: n(c.medicines_eur), building: n(c.building_eur), energy: n(c.energy_eur), total: 0 } : null;
    if (cost) cost.total = cost.staff + cost.medicines + cost.building + cost.energy;
    const filled = s ? n(s.doctors) + n(s.nurses) : 0;
    const open = s ? n(s.open_doctor_posts) + n(s.open_nurse_posts) : 0;
    return {
      code, name: DEPARTMENT_BY_CODE[code]?.name ?? code, beds,
      admissions, emergency, bedDays, occupancy,
      alos: admissions ? (bedDays ?? 0) / admissions : null,
      freeBeds: occupancy !== null ? Math.max(0, beds - (bedDays ?? 0) / DAYS_IN_PERIOD) : null,
      doctors: s ? n(s.doctors) : null, nurses: s ? n(s.nurses) : null,
      openDoctor: s ? n(s.open_doctor_posts) : null, openNurse: s ? n(s.open_nurse_posts) : null,
      openShare: s && filled + open ? open / (filled + open) : null,
      cost, costPerPatient: cost && admissions ? cost.total / admissions : null,
    };
  });

  const months: MonthView[] = PERIOD_MONTHS.map((month) => {
    const p = pat.filter((r) => r.month === month);
    const e = energy.find((r) => r.month === month);
    return {
      month,
      admissions: p.length ? sum(p.map((r) => n(r.admissions))) : null,
      emergency: p.length ? sum(p.map((r) => n(r.emergency_admissions))) : null,
      bedDays: p.length ? sum(p.map((r) => n(r.bed_days))) : null,
      electricity: e ? n(e.electricity_kwh) : null,
      heat: e ? n(e.heat_kwh) : null,
      water: e ? n(e.water_m3) : null,
    };
  });

  const beds = has.wards ? sum(wards.map((w) => w.beds)) : null;
  const admissions = has.patients ? sum(wards.map((w) => w.admissions ?? 0)) : null;
  const emergency = has.patients ? sum(wards.map((w) => w.emergency ?? 0)) : null;
  const bedDays = has.patients ? sum(wards.map((w) => w.bedDays ?? 0)) : null;
  const occupancy = beds && bedDays !== null ? bedDays / (beds * DAYS_IN_PERIOD) : null;
  const doctors = has.staff ? sum(wards.map((w) => w.doctors ?? 0)) : null;
  const nurses = has.staff ? sum(wards.map((w) => w.nurses ?? 0)) : null;
  const openPosts = has.staff ? sum(wards.map((w) => (w.openDoctor ?? 0) + (w.openNurse ?? 0))) : null;
  const cost = has.costs ? ["staff", "medicines", "building", "energy", "total"].reduce((o, k) => ({ ...o, [k]: sum(wards.map((w) => (w.cost as Record<string, number> | null)?.[k] ?? 0)) }), {} as NonNullable<WardView["cost"]>) : null;
  const sumMonths = (k: "electricity" | "heat" | "water") => (has.energy ? sum(months.map((m) => m[k] ?? 0)) : null);
  const electricity = sumMonths("electricity"), heat = sumMonths("heat"), water = sumMonths("water");
  const floorArea = building ? n(building.floor_area_m2) : null;

  // The eight benchmark metrics (same definitions as lib/domain/metrics.ts)
  const snapshotNeeds = (["wards", "patients", "costs", "energy", "building"] as DatasetId[]).filter((d) => !has[d]);
  const snapshot: Snapshot | null = !snapshotNeeds.length && beds && floorArea && cost && occupancy !== null && building
    ? {
      period: "12 months",
      beds,
      occupancy: Math.round(occupancy * 1000) / 10,
      areaPerBed: Math.round(floorArea / beds),
      costPerM2: Math.round((cost.building + cost.energy) / floorArea),
      orUtil: n(building.or_utilisation_pct),
      spaceUse: n(building.space_in_use_pct),
      energy: Math.round(((electricity ?? 0) + (heat ?? 0)) / floorArea),
      travelTime: n(building.avg_travel_min),
    }
    : null;

  return {
    has, wards, months,
    totals: {
      beds, admissions, emergency, bedDays, occupancy,
      alos: admissions ? (bedDays ?? 0) / admissions : null,
      freeBeds: beds && bedDays !== null ? Math.max(0, beds - bedDays / DAYS_IN_PERIOD) : null,
      doctors, nurses, openPosts,
      openShare: openPosts !== null && doctors !== null && nurses !== null && doctors + nurses + openPosts ? openPosts / (doctors + nurses + openPosts) : null,
      cost, costPerPatient: cost && admissions ? cost.total / admissions : null,
      electricity, heat, water, floorArea,
    },
    snapshot, snapshotNeeds,
  };
}

/** Bed-days available in a month (beds × days) — for consumption per bed and day. */
export const bedDaysAvailable = (beds: number, month?: string) => beds * (month ? daysInMonth(month) : DAYS_IN_PERIOD);
