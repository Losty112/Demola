export type ScoredKey =
  | "occupancy"
  | "areaPerBed"
  | "costPerM2"
  | "orUtil"
  | "spaceUse"
  | "energy"
  | "travelTime";

export type MetricKey = "beds" | ScoredKey;

export type Direction = "higher" | "lower";
export type StatusKey = "par" | "watch" | "gap";
export type VerdictKey = "good" | "improve" | "restructure" | "close";

/** One reporting period of raw site data — this is what the database stores. */
export interface Snapshot {
  period: string; // e.g. "2026-Q3"
  beds: number;
  occupancy: number; // %
  areaPerBed: number; // m²
  costPerM2: number; // €/yr
  orUtil: number; // %
  spaceUse: number; // %
  energy: number; // kWh/m²
  travelTime: number; // min
}

export interface Site {
  id: number;
  slug: string;
  name: string;
  region: string;
  kind: string;
}

export interface SiteWithHistory extends Site {
  history: Snapshot[]; // oldest -> newest
  latest: Snapshot;
}

export type Benchmark = Record<ScoredKey, number>;

/** Tunable assumptions. Stored in the `settings` table so they can change without a deploy. */
export interface Settings {
  alosDays: number;
  parThreshold: number;
  watchThreshold: number;
  scoreCap: number;
  goodAverage: number;
  closeAverage: number;
  closeGaps: number;
  travelLimit: number;
  releaseFactor: number;
  moveFactor: number;
  closeFactor: number;
}

export interface MetricScore {
  key: ScoredKey;
  value: number;
  benchmark: number;
  score: number; // % of benchmark, capped
  status: StatusKey;
}

export interface Analysis {
  scores: MetricScore[];
  average: number;
  gaps: number;
  worst: MetricScore;
  totalArea: number;
  bedsNeeded: number;
  surplusBeds: number;
  spaceAboveNeed: number;
  spaceAboveNeedCost: number;
  costGap: number;
  admissions: number;
}

export interface ScenarioInput {
  sharePct: number;
  extraTravelMin: number;
}

export interface ScenarioResult {
  releaseSaving: number;
  moveSaving: number;
  closeSaving: number;
  patientsMoved: number;
  patientsClosed: number;
}

export interface ActionItem {
  key: ScoredKey;
  status: StatusKey;
  score: number;
  keep: boolean;
  action: string;
  now: number;
  target: number;
}

export interface Recommendation {
  verdict: VerdictKey;
  headline: string;
  text: string;
  actions: ActionItem[];
}
