import type {
  ChecklistItem, FillRule, Receiver, ScenarioConfig, ScenarioResult, ScenarioType, TravelMatrix, Verdict, Ward, WardInput,
} from "./types";

/** Default share of facility cost realised per scenario type. */
export const DEFAULT_REALISE: Record<ScenarioType, number> = { close: 0.8, move: 0.7, reduce: 0.6 };

/** Add the derived figures every calculation needs. */
export function enrichWard(w: WardInput): Ward {
  const beds = w.beds_std + w.beds_ccu;
  const bed_days = Math.round(beds * 365 * w.occ);
  const admissions = Math.round(bed_days / w.alos);
  return {
    ...w,
    beds,
    bed_days,
    admissions,
    m2_per_bed: beds ? +(w.floor_m2 / beds).toFixed(1) : 0,
    facility_cost: w.floor_m2 * w.cost_m2,
    adm_per_phys: w.phys ? admissions / w.phys : 0,
    adm_per_nurse: w.nurses ? admissions / w.nurses : 0,
  };
}

/** Admissions per year a ward can still take before reaching the occupancy cap. */
export const freeAdmissions = (w: Ward, maxOcc: number) =>
  Math.max(0, Math.round((w.beds * 365 * (maxOcc - w.occ)) / w.alos));

/** Capacity still free on a receiver after what has already been assigned. */
const remaining = (r: Receiver) => r.free - r.acute - r.general;

/**
 * Pour `amount` admissions into receivers.
 * "nearest": fill the closest ward first. "proportional": spread by free capacity.
 * Returns what could not be placed.
 */
function distribute(amount: number, receivers: Receiver[], field: "acute" | "general", rule: FillRule): number {
  let left = amount;

  if (rule === "nearest") {
    for (const r of [...receivers].sort((a, b) => a.t - b.t)) {
      if (left <= 0) break;
      const take = Math.min(left, remaining(r));
      if (take > 0) { r[field] += take; left -= take; }
    }
    return left;
  }

  let open = receivers.filter((r) => remaining(r) > 0);
  let rounds = 0;
  while (left > 0 && open.length && rounds++ < 50) {
    const totalFree = open.reduce((s, r) => s + remaining(r), 0);
    if (totalFree <= 0) break;
    let placed = 0;
    for (const r of open) {
      const take = Math.min(remaining(r), Math.floor((left * remaining(r)) / totalFree));
      r[field] += take;
      placed += take;
    }
    if (placed === 0) { // rounding stalled: hand out one admission
      const r = open.find((x) => remaining(x) > 0);
      if (!r) break;
      r[field] += 1;
      placed = 1;
    }
    left -= placed;
    open = open.filter((r) => remaining(r) > 0);
  }
  return left;
}

function buildVerdict(p: { displaced: number; absorbed: number; unabsorbed: number; weightedTravel: number; over30: number; bedsToAdd: number }): Verdict {
  const { displaced, absorbed, unabsorbed, weightedTravel, over30, bedsToAdd } = p;
  if (displaced === 0) {
    return { k: "ok", title: "No admissions displaced", text: "The site keeps enough beds for today’s admissions at the occupancy cap. The decision is about space and staff, not patients." };
  }
  const unabsorbedShare = unabsorbed / displaced;
  const over30Share = over30 / displaced;
  if (unabsorbedShare <= 0.02 && weightedTravel <= 25 && over30Share <= 0.25) {
    return { k: "ok", title: "Feasible within the network", text: `Receiving wards can take ${absorbed.toLocaleString("en-GB")} admissions a year; patients gain about ${Math.round(weightedTravel)} minutes of travel on average.` };
  }
  const reasons: string[] = [];
  if (unabsorbed > 0) reasons.push(`${unabsorbed.toLocaleString("en-GB")} admissions a year have no bed at the occupancy cap${bedsToAdd ? ` (about ${bedsToAdd} extra beds needed somewhere)` : ""}`);
  reasons.push(`the average displaced patient gains ${Math.round(weightedTravel)} minutes of travel`);
  if (over30Share > 0.25) reasons.push(`${over30.toLocaleString("en-GB")} a year travel more than 30 minutes further`);
  const sentence = reasons.join("; ").replace(/^./, (c) => c.toUpperCase());
  return unabsorbedShare <= 0.1 && weightedTravel <= 40
    ? { k: "cond", title: "Feasible with conditions", text: `${sentence}. Check the conditions in the checklist before deciding.` }
    : { k: "no", title: "Not feasible as configured", text: `${sentence}. Raise the cap, widen the travel limit or add beds at a partner.` };
}

/** Run one scenario: who is displaced, where they go, what it costs. */
export function runScenario(cfg: ScenarioConfig, wards: Ward[], travel: TravelMatrix): ScenarioResult {
  const src = wards.find((w) => w.id === cfg.source);
  if (!src) throw new Error(`Unknown source site "${cfg.source}"`);

  // 1. How many admissions leave the source, and which share of the ward is released
  let displaced = 0;
  let releasedShare = 0;
  if (cfg.type === "close") {
    displaced = src.admissions;
    releasedShare = 1;
  } else if (cfg.type === "move") {
    const share = Math.max(0, Math.min(1, cfg.share ?? 0));
    displaced = Math.round(src.admissions * share);
    releasedShare = share;
  } else {
    const kept = Math.max(0, Math.min(cfg.bedsTo ?? src.beds, src.beds));
    const keptAdmissions = Math.round((kept * 365 * cfg.maxOcc) / src.alos);
    displaced = Math.max(0, src.admissions - keptAdmissions);
    releasedShare = src.beds ? (src.beds - kept) / src.beds : 0;
  }
  const acute = Math.round(displaced * src.acute_share);
  const general = displaced - acute;

  // 2. Candidate receivers within the travel limit
  const receivers: Receiver[] = wards
    .filter((w) => w.id !== src.id)
    .map((w) => ({
      site: w, t: travel[src.id]?.[w.id] ?? Infinity, free: freeAdmissions(w, cfg.maxOcc),
      acute: 0, general: 0, total: 0, occAfter: w.occ, physNeed: 0, nurseNeed: 0,
    }))
    .filter((r) => r.t <= cfg.travelCap);

  // 3. Acute cases only go to wards with a cath lab and CCU beds
  const unAcute = distribute(acute, receivers.filter((r) => r.site.cathlabs > 0 && r.site.beds_ccu > 0), "acute", cfg.rule);
  const unGeneral = distribute(general, receivers, "general", cfg.rule);
  const unabsorbed = unAcute + unGeneral;

  for (const r of receivers) {
    r.total = r.acute + r.general;
    r.occAfter = r.site.beds ? (r.site.bed_days + r.total * r.site.alos) / (r.site.beds * 365) : 0;
    r.physNeed = r.site.adm_per_phys ? r.total / r.site.adm_per_phys : 0;
    r.nurseNeed = r.site.adm_per_nurse ? r.total / r.site.adm_per_nurse : 0;
  }

  // 4. Travel, staff and money
  const used = receivers.filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  const absorbed = displaced - unabsorbed;
  const weightedTravel = absorbed ? used.reduce((s, r) => s + r.total * r.t, 0) / absorbed : 0;
  const over30 = used.filter((r) => r.t > 30).reduce((s, r) => s + r.total, 0);
  const physReleased = src.phys * releasedShare;
  const nurseReleased = src.nurses * releasedShare;
  const physNeed = used.reduce((s, r) => s + r.physNeed, 0);
  const nurseNeed = used.reduce((s, r) => s + r.nurseNeed, 0);
  const releasedM2 = src.floor_m2 * releasedShare;
  const facilitySaving = releasedM2 * src.cost_m2 * cfg.realise;
  const staffNet = (physReleased - physNeed) * cfg.costPhys + (nurseReleased - nurseNeed) * cfg.costNurse;
  const marginal = absorbed * cfg.marginal;
  const netSaving = facilitySaving + staffNet - marginal;
  const bedsToAdd = unabsorbed > 0 ? Math.ceil((unabsorbed * src.alos) / (365 * cfg.maxOcc)) : 0;
  const maxOccAfter = used.length ? Math.max(...used.map((r) => r.occAfter)) : 0;

  // 5. Capacity shift in beds (patient share applied to the beds taken out of service)
  const bedsImpacted = Math.round(src.beds * releasedShare);
  const bedsAbsorbed = displaced ? Math.round((bedsImpacted * absorbed) / displaced) : bedsImpacted;

  return {
    src, cfg, params: cfg, displaced, acute, general, receivers, used, absorbed, unabsorbed, unAcute, unGeneral,
    weightedTravel, over30, physReleased, nurseReleased, physNeed, nurseNeed, releasedM2, releasedShare,
    facilitySaving, staffNet, marginal, netSaving, bedsToAdd, maxOccAfter, bedsImpacted, bedsAbsorbed,
    verdict: buildVerdict({ displaced, absorbed, unabsorbed, weightedTravel, over30, bedsToAdd }),
  };
}

/** Decision checklist generated from the result, weakest point first. */
export function buildChecklist(r: ScenarioResult): ChecklistItem[] {
  const { src, params, used } = r;
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  const num = (v: number) => Math.round(v).toLocaleString("en-GB");
  const items: ChecklistItem[] = [];

  const top = used.slice(0, 3);
  if (top.length) items.push({ priority: "high", text: `Confirm free capacity with ${top.map((c) => `${c.site.short} (occupancy ${pct(c.site.occ)} → ${pct(c.occAfter)})`).join(", ")}; the model assumes a ${pct(params.maxOcc)} cap.` });
  const acuteReceivers = used.filter((c) => c.acute > 0);
  if (acuteReceivers.length) items.push({ priority: "high", text: `Agree acute (STEMI / CCU) routing with ZZS HMP: ${acuteReceivers.map((c) => `${c.site.short} ${num(c.acute)}`).join(", ")} admissions a year.` });
  if (r.unabsorbed > 0) items.push({ priority: "high", text: `Find a bed for ${num(r.unabsorbed)} admissions a year: add about ${r.bedsToAdd} beds at a partner, raise the occupancy cap, or keep part of ${src.short} open.` });
  if (r.displaced > 0) items.push({ priority: "medium", text: `Staff plan: receivers need ${r.physNeed.toFixed(1)} physicians and ${r.nurseNeed.toFixed(1)} nurses; ${src.short} releases ${r.physReleased.toFixed(1)} and ${r.nurseReleased.toFixed(1)} FTE (${src.vacancies} posts vacant today). Offer transfers before hiring.` });
  items.push({ priority: "medium", text: `Outpatient continuity: ${num(src.outpatient)} visits a year at ${src.short}. Decide whether the clinic stays on site or moves with the ward.` });
  if (r.releasedM2 > 0) items.push({ priority: "medium", text: `Space plan: ${num(r.releasedM2)} m² released, €${num(r.facilitySaving)} a year at ${pct(params.realise)} realisation. Name the reuse or handover, otherwise the saving stays on paper.` });
  if (r.over30 > 0) items.push({ priority: "low", text: `Access: ${num(r.over30)} patients a year travel more than 30 minutes further; weighted average +${Math.round(r.weightedTravel)} min. Prepare the public justification for ${src.district}.` });
  items.push({ priority: "low", text: "Governance: at least one month of board review (per interview); brief the náměstek pro zdravotní péči and the district authority." });
  return items;
}

/** Plain-language label of what the scenario does to the source ward. */
export function describeScenario(cfg: ScenarioConfig, src: Ward): string {
  if (cfg.type === "close") return `Close the ${src.short} ward`;
  if (cfg.type === "move") return `Move ${Math.round((cfg.share ?? 0) * 100)}% of ${src.short} admissions`;
  return `Keep ${cfg.bedsTo} of ${src.beds} beds at ${src.short}`;
}
