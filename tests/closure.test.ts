import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ASSUMPTIONS, TRAVEL, WARDS } from "../lib/closure/data";
import { enrichWard, runScenario } from "../lib/closure/engine";
import { capacityStatus } from "../lib/closure/status";

const wards = WARDS.map(enrichWard);
const base = { type: "close" as const, rule: "nearest" as const, share: 0.4, bedsTo: 24, ...DEFAULT_ASSUMPTIONS };

test("capacity status thresholds: 85 % warning, 95 % critical", () => {
  assert.equal(capacityStatus(0.84), "ok");
  assert.equal(capacityStatus(0.85), "warn");
  assert.equal(capacityStatus(0.95), "critical");
});

test("closing a ward: displaced = absorbed + unabsorbed, receivers stay under the cap", () => {
  for (const w of wards) for (const rule of ["nearest", "proportional"] as const) {
    const r = runScenario({ ...base, source: w.id, rule }, wards, TRAVEL);
    assert.equal(r.displaced, w.admissions);
    assert.equal(r.absorbed + r.unabsorbed, r.displaced);
    for (const u of r.used) assert.ok(u.occAfter <= base.maxOcc + 0.01, `${u.site.id} ${u.occAfter}`);
    assert.ok(r.bedsAbsorbed <= r.bedsImpacted);
  }
});

test("acute admissions only go to wards with a cath lab and CCU beds", () => {
  const r = runScenario({ ...base, source: "bulovka" }, wards, TRAVEL);
  for (const u of r.used) if (u.acute > 0) assert.ok(u.site.cathlabs > 0 && u.site.beds_ccu > 0);
});

test("moving 0 % displaces nobody", () => {
  const r = runScenario({ ...base, source: "ftn", type: "move", share: 0 }, wards, TRAVEL);
  assert.equal(r.displaced, 0);
  assert.equal(r.verdict.k, "ok");
});
