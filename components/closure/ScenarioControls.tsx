"use client";
import type { Assumptions, ScenarioConfig, ScenarioType, Ward } from "@/lib/closure/types";
import { Field, FOCUS, INPUT, Segmented } from "./ui";

const TYPES: { value: ScenarioType; label: string; hint: string }[] = [
  { value: "close", label: "Close the ward", hint: "All admissions move to partner wards" },
  { value: "move", label: "Move a share", hint: "A part of the admissions moves" },
  { value: "reduce", label: "Reduce beds", hint: "Keep fewer beds on site" },
];

/**
 * Step 2 controls. The three decisions that matter (which ward, what happens, how much) are
 * always visible. Rules, caps and cost assumptions sit in two collapsed groups.
 */
export function ScenarioControls({ wards, cfg, active, onActive, onChange, onCopy }: {
  wards: Ward[];
  cfg: ScenarioConfig;
  active: "A" | "B";
  onActive: (s: "A" | "B") => void;
  onChange: (patch: Partial<ScenarioConfig>) => void;
  onCopy: () => void;
}) {
  const src = wards.find((w) => w.id === cfg.source) ?? wards[0];
  const num = (k: keyof Assumptions) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ [k]: Number(e.target.value) } as Partial<ScenarioConfig>);

  return (
    <div className="space-y-4">
      <Segmented label="Active scenario" value={active} onChange={onActive} options={[{ value: "A", label: "Scenario A" }, { value: "B", label: "Scenario B" }]} />

      <Field label="Ward under decision">
        <select className={INPUT} value={cfg.source} onChange={(e) => onChange({ source: e.target.value })}>
          {wards.map((w) => <option key={w.id} value={w.id}>{w.short} – {w.dept}</option>)}
        </select>
      </Field>

      <fieldset>
        <legend className="mb-1 text-sm text-muted">What happens to it</legend>
        <div className="grid gap-2">
          {TYPES.map((t) => (
            <label key={t.value} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-500 ${cfg.type === t.value ? "border-brand-400 bg-brand-50" : "border-line bg-white hover:bg-brand-50/60"}`}>
              <input type="radio" name="scenario-type" className="mt-1 accent-brand-500" checked={cfg.type === t.value} onChange={() => onChange({ type: t.value })} />
              <span><span className="block font-medium text-ink">{t.label}</span><span className="text-xs text-muted">{t.hint}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      {cfg.type === "move" && (
        <Field label="Share of admissions moved" value={`${Math.round((cfg.share ?? 0) * 100)}%`}>
          <input type="range" min={10} max={90} step={5} className={`w-full ${FOCUS}`} value={Math.round((cfg.share ?? 0) * 100)} onChange={(e) => onChange({ share: Number(e.target.value) / 100 })} />
        </Field>
      )}
      {cfg.type === "reduce" && (
        <Field label={`Beds kept at ${src.short} (of ${src.beds})`}>
          <input type="number" min={0} max={src.beds} className={INPUT} value={cfg.bedsTo ?? 0} onChange={(e) => onChange({ bedsTo: Number(e.target.value) })} />
        </Field>
      )}

      <details className="group rounded-lg border border-line">
        <summary className={`cursor-pointer select-none rounded-lg px-3 py-2 text-sm font-medium text-brand-600 ${FOCUS}`}>Routing rules</summary>
        <div className="space-y-3 border-t border-line p-3">
          <Field label="How partners are filled">
            <select className={INPUT} value={cfg.rule} onChange={(e) => onChange({ rule: e.target.value as ScenarioConfig["rule"] })}>
              <option value="nearest">Nearest ward with free capacity first</option>
              <option value="proportional">Spread in proportion to free capacity</option>
            </select>
          </Field>
          <Field label="Occupancy cap at receiving wards" value={`${Math.round(cfg.maxOcc * 100)}%`}>
            <input type="range" min={80} max={98} className={`w-full ${FOCUS}`} value={Math.round(cfg.maxOcc * 100)} onChange={(e) => onChange({ maxOcc: Number(e.target.value) / 100 })} />
          </Field>
          <Field label="Furthest acceptable partner" value={`${cfg.travelCap} min`}>
            <input type="range" min={10} max={60} step={5} className={`w-full ${FOCUS}`} value={cfg.travelCap} onChange={num("travelCap")} />
          </Field>
        </div>
      </details>

      <details className="group rounded-lg border border-line">
        <summary className={`cursor-pointer select-none rounded-lg px-3 py-2 text-sm font-medium text-brand-600 ${FOCUS}`}>Cost assumptions</summary>
        <div className="space-y-3 border-t border-line p-3">
          <Field label="Share of facility cost actually saved" value={`${Math.round(cfg.realise * 100)}%`}>
            <input type="range" min={30} max={100} step={5} className={`w-full ${FOCUS}`} value={Math.round(cfg.realise * 100)} onChange={(e) => onChange({ realise: Number(e.target.value) / 100 })} />
          </Field>
          <Field label="Physician cost (€ / FTE / yr)"><input type="number" className={INPUT} value={cfg.costPhys} onChange={num("costPhys")} /></Field>
          <Field label="Nurse cost (€ / FTE / yr)"><input type="number" className={INPUT} value={cfg.costNurse} onChange={num("costNurse")} /></Field>
          <Field label="Marginal cost per transferred admission (€)"><input type="number" className={INPUT} value={cfg.marginal} onChange={num("marginal")} /></Field>
        </div>
      </details>

      <button type="button" onClick={onCopy} className={`w-full rounded-lg border border-brand-200 bg-white py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 ${FOCUS}`}>
        Copy to scenario {active === "A" ? "B" : "A"}
      </button>
    </div>
  );
}
