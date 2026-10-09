import { test } from "node:test";
import assert from "node:assert/strict";
import { analyse, scoreValue, statusOf } from "../lib/domain/scoring";
import { recommend } from "../lib/domain/recommendation";
import { runScenarios } from "../lib/domain/scenarios";
import { DEFAULT_BENCHMARK, DEFAULT_SETTINGS } from "../lib/domain/metrics";
import { DEMO_SITES } from "../lib/db/seed";
import { parseCsv } from "../lib/csv";
import type { Snapshot } from "../lib/domain/types";

const snap = (s: (typeof DEMO_SITES)[number]): Snapshot => ({ period: "2026-Q3", ...s.latest });
const A = snap(DEMO_SITES[0]);
const C = snap(DEMO_SITES[2]);
const scenario = { sharePct: 15, extraTravelMin: 25 };

test("scores: higher-better and lower-better, capped", () => {
  assert.equal(scoreValue("occupancy", 68, 85, 150), 80);
  assert.equal(scoreValue("costPerM2", 560, 280, 150), 50);
  assert.equal(scoreValue("travelTime", 5, 30, 150), 150);
});

test("status thresholds", () => {
  assert.equal(statusOf(95, DEFAULT_SETTINGS), "par");
  assert.equal(statusOf(94.9, DEFAULT_SETTINGS), "watch");
  assert.equal(statusOf(74.9, DEFAULT_SETTINGS), "gap");
});

test("Site A matches the brief's derived numbers", () => {
  const a = analyse(A, DEFAULT_BENCHMARK, DEFAULT_SETTINGS);
  assert.equal(a.bedsNeeded, 256);
  assert.equal(a.surplusBeds, 64);
  assert.equal(a.totalArea, 44160);
  assert.equal(a.spaceAboveNeed, 44160 - 105 * 256);
  assert.equal(Math.round(a.average), 86);
  assert.equal(a.gaps, 2);
  assert.equal(a.worst.key, "orUtil");
});

test("scenario savings follow the documented factors", () => {
  const a = analyse(A, DEFAULT_BENCHMARK, DEFAULT_SETTINGS);
  const r = runScenarios(a, A, scenario, DEFAULT_SETTINGS);
  assert.equal(Math.round(r.closeSaving), Math.round(44160 * 315 * 0.8));
  assert.equal(Math.round(r.moveSaving), Math.round(0.15 * 44160 * 315 * 0.7));
});

test("verdict rules", () => {
  const a = analyse(A, DEFAULT_BENCHMARK, DEFAULT_SETTINGS);
  assert.equal(recommend(a, A, DEFAULT_BENCHMARK, scenario, DEFAULT_SETTINGS).verdict, "improve");

  const good = { ...A, occupancy: 90, areaPerBed: 100, costPerM2: 270, orUtil: 85, spaceUse: 90, energy: 200, travelTime: 20 };
  const ag = analyse(good, DEFAULT_BENCHMARK, DEFAULT_SETTINGS);
  assert.equal(recommend(ag, good, DEFAULT_BENCHMARK, scenario, DEFAULT_SETTINGS).verdict, "good");

  const awful = { ...C, occupancy: 40, areaPerBed: 220, costPerM2: 450, orUtil: 30, spaceUse: 40, energy: 400, travelTime: 90 };
  const aw = analyse(awful, DEFAULT_BENCHMARK, DEFAULT_SETTINGS);
  assert.equal(recommend(aw, awful, DEFAULT_BENCHMARK, { sharePct: 15, extraTravelMin: 25 }, DEFAULT_SETTINGS).verdict, "close");
  assert.equal(recommend(aw, awful, DEFAULT_BENCHMARK, { sharePct: 15, extraTravelMin: 45 }, DEFAULT_SETTINGS).verdict, "restructure");
});

test("every metric appears once in the action list, weakest first", () => {
  const a = analyse(C, DEFAULT_BENCHMARK, DEFAULT_SETTINGS);
  const { actions } = recommend(a, C, DEFAULT_BENCHMARK, scenario, DEFAULT_SETTINGS);
  assert.equal(actions.length, 7);
  assert.deepEqual(actions.map((x) => x.score), [...actions.map((x) => x.score)].sort((x, y) => x - y));
});

test("csv parser handles quotes and CRLF", () => {
  assert.deepEqual(parseCsv('a,b\r\n"x, y","he said ""hi"""\r\n'), [["a", "b"], ["x, y", 'he said "hi"']]);
});
