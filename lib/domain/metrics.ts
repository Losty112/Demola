import type { Benchmark, Direction, MetricKey, ScoredKey, Settings } from "./types";

export interface MetricDef {
  key: MetricKey;
  label: string;
  short: string;
  unit: string;
  direction?: Direction; // undefined = input only (not scored)
  decimals: number;
  min: number;
  max: number;
  step: number;
  definition: string;
  action?: string;
}

export const METRICS: MetricDef[] = [
  { key: "beds", label: "Licensed beds", short: "Beds", unit: "beds", decimals: 0, min: 50, max: 900, step: 5,
    definition: "Number of licensed (planned) inpatient beds." },
  { key: "occupancy", label: "Bed occupancy", short: "Occupancy", unit: "%", direction: "higher", decimals: 0, min: 40, max: 100, step: 1,
    definition: "Occupied bed-days divided by available bed-days over a year.",
    action: "Raise occupancy: bundle low-volume wards and reallocate or close surplus beds" },
  { key: "areaPerBed", label: "Floor area per bed", short: "Area / bed", unit: "m²", direction: "lower", decimals: 0, min: 60, max: 220, step: 1,
    definition: "Total gross floor area divided by licensed beds.",
    action: "Cut floor area per bed: repurpose or hand back surplus space" },
  { key: "costPerM2", label: "Facility cost per m²", short: "Cost / m²", unit: "€/yr", direction: "lower", decimals: 0, min: 150, max: 450, step: 5,
    definition: "Annual facility running cost (maintenance, cleaning, utilities, rent) per m².",
    action: "Lower facility cost: renegotiate maintenance and facility-management contracts" },
  { key: "orUtil", label: "OR utilization", short: "OR use", unit: "%", direction: "higher", decimals: 0, min: 30, max: 100, step: 1,
    definition: "Used operating-room time divided by available operating-room time.",
    action: "Improve OR scheduling or share OR capacity with a partner site" },
  { key: "spaceUse", label: "Share of space in use", short: "Space use", unit: "%", direction: "higher", decimals: 0, min: 40, max: 100, step: 1,
    definition: "Share of floor area actually in use in a typical week.",
    action: "Consolidate under-used rooms and wings into fewer, fuller areas" },
  { key: "energy", label: "Energy use", short: "Energy", unit: "kWh/m²", direction: "lower", decimals: 0, min: 120, max: 400, step: 5,
    definition: "Annual final energy consumption per m².",
    action: "Plan an energy retrofit (HVAC, building control, insulation)" },
  { key: "travelTime", label: "Avg. patient travel time", short: "Travel", unit: "min", direction: "lower", decimals: 0, min: 10, max: 90, step: 1,
    definition: "Average travel time of the site's patients from home to the site.",
    action: "Add outreach, day-care or telehealth services to ease long journeys" },
];

export const METRIC_BY_KEY = Object.fromEntries(METRICS.map((m) => [m.key, m])) as Record<MetricKey, MetricDef>;
export const SCORED_METRICS = METRICS.filter((m): m is MetricDef & { key: ScoredKey } => !!m.direction);
export const SCORED_KEYS = SCORED_METRICS.map((m) => m.key);

/** Illustrative placeholders — the real values live in the `benchmark_values` table. */
export const DEFAULT_BENCHMARK: Benchmark = {
  occupancy: 85,
  areaPerBed: 105,
  costPerM2: 280,
  orUtil: 80,
  spaceUse: 85,
  energy: 220,
  travelTime: 30,
};

export const DEFAULT_SETTINGS: Settings = {
  alosDays: 5.2,
  parThreshold: 95,
  watchThreshold: 75,
  scoreCap: 150,
  goodAverage: 90,
  closeAverage: 60,
  closeGaps: 4,
  travelLimit: 30,
  releaseFactor: 0.6,
  moveFactor: 0.7,
  closeFactor: 0.8,
};
