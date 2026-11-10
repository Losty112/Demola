import { parseCsv } from "../csv";
import { DEPARTMENTS, DEPARTMENT_BY_CODE, resolveDepartment } from "./departments";
import { PERIOD_LABEL, PERIOD_MONTHS, monthLabel, normaliseMonth } from "./period";

/**
 * The upload datasets. Each number lives in exactly one dataset and is uploaded once;
 * every page only reads it from there (e.g. staff cost lives in "costs", not in "staff").
 */
export type DatasetId = "wards" | "patients" | "staff" | "costs" | "energy" | "building";

export type Row = Record<string, string | number>;

export interface Upload {
  rows: Row[];
  /** Who supplied the data, e.g. "Technical department · J. Kovář" */
  suppliedBy: string;
  /** ISO date of the upload */
  uploadedAt: string;
  fileName?: string;
}

export type HospitalData = Partial<Record<DatasetId, Upload>>;

type ColType = "month" | "ward" | "int" | "number" | "percent";

export interface Column {
  key: string;
  label: string;
  type: ColType;
  hint: string;
}

export interface DatasetDef {
  id: DatasetId;
  title: string;
  description: string;
  /** Usually supplied by */
  owner: string;
  /** One row per … */
  grain: "ward" | "month" | "month-ward" | "single";
  columns: Column[];
  /** Pages that show this data */
  usedOn: string[];
}

export const DATASETS: DatasetDef[] = [
  {
    id: "wards", title: "Wards and beds", owner: "Medical director's office", grain: "ward",
    description: "Licensed beds per ward. One row per ward; leave out wards the hospital does not have.",
    columns: [
      { key: "ward", label: "Ward", type: "ward", hint: "code or name from the department list" },
      { key: "beds", label: "Beds", type: "int", hint: "licensed beds" },
    ],
    usedOn: ["My hospital", "Wards", "Patients", "Compare"],
  },
  {
    id: "patients", title: "Patients", owner: "Hospital information system / controlling", grain: "month-ward",
    description: "Admissions, emergency admissions and bed-days for every month and ward.",
    columns: [
      { key: "month", label: "Month", type: "month", hint: "YYYY-MM" },
      { key: "ward", label: "Ward", type: "ward", hint: "code or name" },
      { key: "admissions", label: "Admissions", type: "int", hint: "patients admitted" },
      { key: "emergency_admissions", label: "Emergency admissions", type: "int", hint: "of those, unplanned" },
      { key: "bed_days", label: "Bed-days", type: "int", hint: "occupied bed-days" },
    ],
    usedOn: ["My hospital", "Patients", "Wards", "Compare"],
  },
  {
    id: "staff", title: "Doctors and staff", owner: "HR department", grain: "ward",
    description: "Filled positions (FTE) and open posts per ward, as of the end of the period.",
    columns: [
      { key: "ward", label: "Ward", type: "ward", hint: "code or name" },
      { key: "doctors", label: "Doctors", type: "number", hint: "FTE" },
      { key: "nurses", label: "Nurses", type: "number", hint: "FTE" },
      { key: "open_doctor_posts", label: "Open doctor posts", type: "int", hint: "vacancies" },
      { key: "open_nurse_posts", label: "Open nurse posts", type: "int", hint: "vacancies" },
    ],
    usedOn: ["My hospital", "Doctors & staff", "Compare"],
  },
  {
    id: "costs", title: "Spending", owner: "Finance / controlling", grain: "ward",
    description: "What each ward cost over the 12 months, split into four kinds of spending (euros).",
    columns: [
      { key: "ward", label: "Ward", type: "ward", hint: "code or name" },
      { key: "staff_eur", label: "Staff", type: "number", hint: "€ / 12 months" },
      { key: "medicines_eur", label: "Medicines", type: "number", hint: "€ / 12 months" },
      { key: "building_eur", label: "Building", type: "number", hint: "€ / 12 months" },
      { key: "energy_eur", label: "Energy", type: "number", hint: "€ / 12 months" },
    ],
    usedOn: ["My hospital", "Wards", "Patients", "Doctors & staff", "Compare"],
  },
  {
    id: "energy", title: "Energy and water", owner: "Technical department", grain: "month",
    description: "Electricity, heat and water used by the whole hospital, one row per month (meter readings).",
    columns: [
      { key: "month", label: "Month", type: "month", hint: "YYYY-MM" },
      { key: "electricity_kwh", label: "Electricity", type: "number", hint: "kWh" },
      { key: "heat_kwh", label: "Heat", type: "number", hint: "kWh" },
      { key: "water_m3", label: "Water", type: "number", hint: "m³" },
    ],
    usedOn: ["My hospital", "Energy"],
  },
  {
    id: "building", title: "Building", owner: "Technical department", grain: "single",
    description: "A few facts about the building and access. One row.",
    columns: [
      { key: "floor_area_m2", label: "Floor area", type: "number", hint: "m², gross" },
      { key: "space_in_use_pct", label: "Space in use", type: "percent", hint: "% of floor area in a typical week" },
      { key: "or_utilisation_pct", label: "Operating-room use", type: "percent", hint: "% of available OR time" },
      { key: "avg_travel_min", label: "Patient travel time", type: "number", hint: "minutes, average" },
    ],
    usedOn: ["My hospital", "Benchmark", "Energy"],
  },
];

export const DATASET_BY_ID = Object.fromEntries(DATASETS.map((d) => [d.id, d])) as Record<DatasetId, DatasetDef>;

// ---------------------------------------------------------------------------------------------------
// Empty template

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Header plus the key columns (month / ward) already filled in, so only the numbers are left to type. */
export function templateCsv(id: DatasetId): string {
  const def = DATASET_BY_ID[id];
  const header = def.columns.map((c) => c.key);
  const blank = (pre: Record<string, string>) => header.map((k) => csvCell(pre[k] ?? ""));
  let rows: string[][] = [];
  if (def.grain === "ward") rows = DEPARTMENTS.map((d) => blank({ ward: d.code }));
  else if (def.grain === "month") rows = PERIOD_MONTHS.map((m) => blank({ month: m }));
  else if (def.grain === "month-ward") rows = PERIOD_MONTHS.flatMap((m) => DEPARTMENTS.map((d) => blank({ month: m, ward: d.code })));
  else rows = [blank({})];
  return [header, ...rows].map((r) => r.join(",")).join("\n") + "\n";
}

// ---------------------------------------------------------------------------------------------------
// Check an uploaded file and explain problems in plain words

export interface CheckResult {
  /** Rows that passed, cleaned (ward = code, month = YYYY-MM, numbers as numbers) */
  rows: Row[];
  /** The file as read, for the preview */
  header: string[];
  raw: string[][];
  errors: string[];
  warnings: string[];
}

const MAX_MESSAGES = 12;

export function checkCsv(id: DatasetId, text: string): CheckResult {
  const def = DATASET_BY_ID[id];
  const all = parseCsv(text.replace(/^﻿/, ""));
  const errors: string[] = [];
  const warnings: string[] = [];
  const out: CheckResult = { rows: [], header: all[0] ?? [], raw: all.slice(1), errors, warnings };
  if (!all.length) {
    errors.push("The file is empty.");
    return out;
  }

  // Separator check: a semicolon file (common from Excel in Europe) reads as one column
  if (all[0].length === 1 && all[0][0].includes(";")) {
    errors.push("The columns are separated by semicolons (;). Please save the file as CSV with commas, or download the template and copy the numbers into it.");
    return out;
  }

  const header = all[0].map((h) => h.trim().toLowerCase());
  const idx: Record<string, number> = {};
  const missing: string[] = [];
  for (const c of def.columns) {
    const i = header.findIndex((h) => h === c.key || h === c.label.toLowerCase());
    if (i < 0) missing.push(`“${c.key}” (${c.label.toLowerCase()})`);
    else idx[c.key] = i;
  }
  if (missing.length) {
    errors.push(`The file is missing ${missing.length === 1 ? "the column" : "these columns"}: ${missing.join(", ")}. The first row must contain the column names from the template.`);
    return out;
  }
  const extra = all[0].filter((_, i) => !Object.values(idx).includes(i) && all[0][i].trim());
  if (extra.length) warnings.push(`These columns are not used and will be ignored: ${extra.map((e) => `“${e}”`).join(", ")}.`);

  const seen = new Map<string, number>();
  const say = (list: string[], msg: string) => { if (list.length < MAX_MESSAGES) list.push(msg); else if (list.length === MAX_MESSAGES) list.push("…and more problems of the same kind. Fix the ones above and upload again."); };

  out.raw.forEach((cells, r) => {
    const line = r + 2; // spreadsheet row number (header is row 1)
    const row: Row = {};
    let ok = true;
    for (const c of def.columns) {
      const v = (cells[idx[c.key]] ?? "").trim();
      if (c.type === "ward") {
        const code = resolveDepartment(v);
        if (!code) { ok = false; say(errors, v ? `Row ${line}: the ward “${v}” is not in the department list. Use one of: ${DEPARTMENTS.map((d) => d.code).join(", ")}.` : `Row ${line}: the ward is empty.`); }
        else row[c.key] = code;
      } else if (c.type === "month") {
        const m = normaliseMonth(v);
        if (!m) { ok = false; say(errors, `Row ${line}: “${v || "(empty)"}” is not a month. Write it like 2026-01.`); }
        else if (!PERIOD_MONTHS.includes(m)) { ok = false; say(errors, `Row ${line}: ${monthLabel(m)} is outside the reporting period (${PERIOD_LABEL}).`); }
        else row[c.key] = m;
      } else {
        if (v === "") { ok = false; say(errors, `Row ${line}: “${c.label}” is empty.`); continue; }
        // Accept "1 200", "1,200" is ambiguous in CSV so only spaces are stripped; decimal comma is accepted
        const n = Number(v.replace(/\s/g, "").replace(/%$/, "").replace(/^(\d+),(\d+)$/, "$1.$2"));
        if (!Number.isFinite(n)) { ok = false; say(errors, `Row ${line}: “${c.label}” should be a number, but it says “${v}”.`); continue; }
        if (n < 0) { ok = false; say(errors, `Row ${line}: “${c.label}” cannot be negative.`); continue; }
        if (c.type === "int" && !Number.isInteger(n)) { ok = false; say(errors, `Row ${line}: “${c.label}” should be a whole number, but it says ${v}.`); continue; }
        if (c.type === "percent" && n > 100) { ok = false; say(errors, `Row ${line}: “${c.label}” is a percentage and cannot be more than 100.`); continue; }
        row[c.key] = n;
      }
    }
    if (!ok) return;
    // Row-level sense checks
    if (id === "patients" && Number(row.emergency_admissions) > Number(row.admissions)) {
      say(errors, `Row ${line}: there are more emergency admissions (${row.emergency_admissions}) than admissions (${row.admissions}).`);
      return;
    }
    const key = def.grain === "month-ward" ? `${row.month}|${row.ward}` : def.grain === "month" ? String(row.month) : def.grain === "ward" ? String(row.ward) : "single";
    if (seen.has(key)) {
      const what = def.grain === "month-ward" ? `${DEPARTMENT_BY_CODE[String(row.ward)].name} in ${monthLabel(String(row.month))}` : def.grain === "month" ? monthLabel(String(row.month)) : def.grain === "ward" ? DEPARTMENT_BY_CODE[String(row.ward)].name : "the building";
      say(errors, `Row ${line}: ${what} appears twice (also in row ${seen.get(key)}). Keep one row.`);
      return;
    }
    seen.set(key, line);
    out.rows.push(row);
  });

  if (!out.raw.length) errors.push("The file has column names but no data rows.");
  if (def.grain === "single" && out.rows.length > 1) errors.push("This dataset needs exactly one row.");

  // Completeness: warn, do not block (e.g. a ward the hospital does not have)
  if (def.grain === "month" || def.grain === "month-ward") {
    const months = new Set(out.rows.map((r) => String(r.month)));
    const gaps = PERIOD_MONTHS.filter((m) => !months.has(m));
    if (gaps.length && out.rows.length) warnings.push(`No data for ${gaps.map(monthLabel).join(", ")}. Charts will show a gap for ${gaps.length === 1 ? "that month" : "those months"}.`);
  }
  if (id === "patients") {
    const zero = out.rows.filter((r) => Number(r.admissions) === 0 && Number(r.bed_days) === 0).length;
    if (zero) warnings.push(`${zero} row${zero === 1 ? " has" : "s have"} no admissions and no bed-days. If the ward does not exist, you can leave those rows out.`);
  }
  return out;
}
