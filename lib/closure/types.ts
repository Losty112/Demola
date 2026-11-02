/** Raw ward record (one cardiology inpatient ward per hospital site). */
export interface WardInput {
  id: string;
  short: string;
  name: string;
  dept: string;
  type: string;
  district: string;
  lat: number;
  lon: number;
  catchment: number;
  beds_std: number;
  beds_ccu: number;
  /** Occupancy today, 0..1 */
  occ: number;
  /** Average length of stay (days) */
  alos: number;
  cathlabs: number;
  pci: number;
  outpatient: number;
  floor_m2: number;
  cost_m2: number;
  energy: number;
  built: number;
  renovated: number | null;
  condition: number;
  phys: number;
  nurses: number;
  vacancies: number;
  travel_now: number;
  space_use: number;
  /** Share of admissions that are acute (STEMI / CCU) */
  acute_share: number;
}

/** Ward with derived figures (see `enrichWard`). */
export interface Ward extends WardInput {
  beds: number;
  bed_days: number;
  admissions: number;
  m2_per_bed: number;
  facility_cost: number;
  adm_per_phys: number;
  adm_per_nurse: number;
}

export type TravelMatrix = Record<string, Record<string, number>>;

export interface Assumptions {
  /** Occupancy cap at receiving wards, 0..1 */
  maxOcc: number;
  /** Furthest acceptable partner, minutes */
  travelCap: number;
  /** Share of facility cost that is really saved, 0..1 */
  realise: number;
  costPhys: number;
  costNurse: number;
  /** Marginal cost per transferred admission, € */
  marginal: number;
}

export type ScenarioType = "close" | "move" | "reduce";
export type FillRule = "nearest" | "proportional";

export interface ScenarioConfig extends Assumptions {
  source: string;
  type: ScenarioType;
  /** Share of admissions moved (type "move"), 0..1 */
  share?: number;
  /** Beds kept at the site (type "reduce") */
  bedsTo?: number;
  rule: FillRule;
}

export interface Receiver {
  site: Ward;
  /** Travel time from the source ward, minutes */
  t: number;
  /** Free admissions per year below the occupancy cap */
  free: number;
  acute: number;
  general: number;
  total: number;
  occAfter: number;
  physNeed: number;
  nurseNeed: number;
}

export type VerdictKey = "ok" | "cond" | "no";
export interface Verdict { k: VerdictKey; title: string; text: string }

export interface ScenarioResult {
  src: Ward;
  cfg: ScenarioConfig;
  params: Assumptions;
  displaced: number;
  acute: number;
  general: number;
  receivers: Receiver[];
  /** Receivers that actually get patients, biggest first */
  used: Receiver[];
  absorbed: number;
  unabsorbed: number;
  unAcute: number;
  unGeneral: number;
  weightedTravel: number;
  over30: number;
  physReleased: number;
  nurseReleased: number;
  physNeed: number;
  nurseNeed: number;
  releasedM2: number;
  releasedShare: number;
  facilitySaving: number;
  staffNet: number;
  marginal: number;
  netSaving: number;
  bedsToAdd: number;
  maxOccAfter: number;
  /** Beds taken out of service at the source ward */
  bedsImpacted: number;
  /** Beds-equivalent of the displaced patients that partner wards take over */
  bedsAbsorbed: number;
  verdict: Verdict;
}

export interface ChecklistItem { priority: "high" | "medium" | "low"; text: string }
