import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCsv, templateCsv, DATASETS } from "../lib/hospital/datasets";
import { demoData } from "../lib/hospital/demo";
import { deriveView } from "../lib/hospital/derive";
import { pressures } from "../lib/hospital/pressure";
import { DEPARTMENTS } from "../lib/hospital/departments";
import { PERIOD_MONTHS } from "../lib/hospital/period";
import { DEFAULT_BENCHMARK, DEFAULT_SETTINGS } from "../lib/domain/metrics";

test("every empty template passes the header check and has the key columns filled", () => {
  for (const d of DATASETS) {
    const csv = templateCsv(d.id);
    const r = checkCsv(d.id, csv);
    assert.ok(!r.errors.some((e) => e.includes("missing")), `${d.id}: ${r.errors[0]}`);
    // Empty numbers (or an all-empty file) are reported in plain words, not as a crash
    assert.ok(r.errors.some((e) => e.includes("is empty") || e.includes("no data rows")), d.id);
  }
  assert.equal(templateCsv("patients").trim().split("\n").length, 1 + PERIOD_MONTHS.length * DEPARTMENTS.length);
});

test("check explains problems in plain words", () => {
  const csv = "month,ward,admissions,emergency_admissions,bed_days\n2026-01,Cardiology,100,120,500\n2024-01,CAR,1,0,1\n2026-02,XYZ,1,0,1\n2026-03,car,ten,0,1\n2026-04,CAR,10,2,50\n2026-04,CAR,10,2,50\n";
  const r = checkCsv("patients", csv);
  const all = r.errors.join(" | ");
  assert.match(all, /more emergency admissions/);
  assert.match(all, /outside the reporting period/);
  assert.match(all, /“XYZ” is not in the department list/);
  assert.match(all, /should be a number, but it says “ten”/);
  assert.match(all, /appears twice/);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].ward, "CAR");
});

test("semicolon files and missing columns are caught", () => {
  assert.match(checkCsv("wards", "ward;beds\nCAR;40\n").errors[0], /semicolons/);
  assert.match(checkCsv("wards", "ward,bedz\nCAR,40\n").errors[0], /missing the column/);
});

test("demo hospital: every dataset passes its own check after a CSV round trip", () => {
  const data = demoData();
  for (const d of DATASETS) {
    const rows = data[d.id]!.rows;
    const csv = [d.columns.map((c) => c.key).join(","), ...rows.map((r) => d.columns.map((c) => r[c.key]).join(","))].join("\n");
    const r = checkCsv(d.id, csv);
    assert.deepEqual(r.errors, [], d.id);
    assert.equal(r.rows.length, rows.length, d.id);
  }
});

test("derived view: one number, many places — totals add up from the wards", () => {
  const v = deriveView(demoData());
  assert.ok(v.snapshot, "all datasets present -> benchmark metrics available");
  assert.equal(v.totals.beds, v.wards.reduce((s, w) => s + w.beds, 0));
  assert.equal(v.totals.admissions, v.months.reduce((s, m) => s + (m.admissions ?? 0), 0));
  assert.equal(v.totals.cost!.total, v.wards.reduce((s, w) => s + w.cost!.total, 0));
  assert.equal(v.snapshot!.beds, v.totals.beds);
  // Pressure overview tells the demo story: full wards, open posts, energy above benchmark
  const p = Object.fromEntries(pressures(v, DEFAULT_BENCHMARK, DEFAULT_SETTINGS).map((x) => [x.area, x]));
  assert.equal(p.beds.status, "gap");
  assert.notEqual(p.staff.status, null);
  assert.notEqual(p.energy.status, "par");
});

test("derived view without uploads: nothing invented", () => {
  const v = deriveView({});
  assert.equal(v.snapshot, null);
  assert.equal(v.totals.beds, null);
  assert.deepEqual(v.snapshotNeeds, ["wards", "patients", "costs", "energy", "building"]);
});

import { dateLabel, monthYearLabel } from "../lib/hospital/period";

test("month and date labels use fixed names (never \"Sept\")", () => {
  assert.equal(monthYearLabel("2026-09"), "Sep 2026");
  assert.equal(monthYearLabel("2025-11"), "Nov 2025");
  assert.equal(dateLabel("2026-09-05"), "5 Sep 2026");
  assert.equal(dateLabel("2026-11-03T10:15:00.000Z"), "3 Nov 2026");
  assert.equal(dateLabel("not a date"), "not a date");
});
