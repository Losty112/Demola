"use client";
import { useMemo, useSyncExternalStore } from "react";
import type { DatasetId, HospitalData, Upload } from "./datasets";
import { DEMO_PROFILE, demoData, type Profile } from "./demo";
import { deriveView, type HospitalView } from "./derive";

/**
 * Hospital profiles and their uploaded data, kept in this browser (demo prototype: no accounts, no server).
 * Each hospital has its own profile; the demo hospital is built in and starts with every dataset filled.
 * An upload replaces that dataset for the active profile only — the one place a number is entered.
 */
interface State {
  active: string | null;
  profiles: Profile[]; // user-created; the demo profile is built in
  uploads: Record<string, HospitalData>;
}

const KEY = "demola.hospital.v1";
const EMPTY: State = { active: null, profiles: [], uploads: {} };
const listeners = new Set<() => void>();
let cache: { raw: string | null; state: State } | null = null;

function read(): State {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { /* storage blocked: work in memory */ }
  if (cache && cache.raw === raw) return cache.state;
  let state = EMPTY;
  try { if (raw) state = { ...EMPTY, ...JSON.parse(raw) }; } catch { /* corrupt: start fresh */ }
  cache = { raw, state };
  return state;
}

function write(next: State) {
  const raw = JSON.stringify(next);
  try { localStorage.setItem(KEY, raw); } catch { /* storage blocked: keep it for this page view */ }
  cache = { raw, state: next };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) l(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
}

const DEMO_DATA = demoData();

export const allProfiles = (s: State) => [DEMO_PROFILE, ...s.profiles];

export const actions = {
  signInDemo() { write({ ...read(), active: DEMO_PROFILE.id }); },
  signIn(id: string) { write({ ...read(), active: id }); },
  signOut() { write({ ...read(), active: null }); },
  createProfile(name: string, city: string) {
    const s = read();
    const p: Profile = { id: `h-${Date.now().toString(36)}`, name: name.trim(), city: city.trim(), createdAt: new Date().toISOString().slice(0, 10) };
    write({ ...s, profiles: [...s.profiles, p], active: p.id });
    return p;
  },
  deleteProfile(id: string) {
    const s = read();
    const uploads = { ...s.uploads };
    delete uploads[id];
    write({ ...s, profiles: s.profiles.filter((p) => p.id !== id), uploads, active: s.active === id ? null : s.active });
  },
  saveUpload(id: DatasetId, upload: Upload) {
    const s = read();
    if (!s.active) return;
    write({ ...s, uploads: { ...s.uploads, [s.active]: { ...s.uploads[s.active], [id]: upload } } });
  },
  /** Removes an upload: the demo hospital falls back to its demo data, other profiles to "no data". */
  removeUpload(id: DatasetId) {
    const s = read();
    if (!s.active) return;
    const mine = { ...s.uploads[s.active] };
    delete mine[id];
    write({ ...s, uploads: { ...s.uploads, [s.active]: mine } });
  },
};

export interface HospitalState {
  /** false during server render and the first client render (localStorage not read yet) */
  ready: boolean;
  profile: Profile | null;
  profiles: Profile[];
  data: HospitalData;
  view: HospitalView;
  /** Datasets this profile uploaded itself (as opposed to built-in demo data) */
  uploaded: Partial<Record<DatasetId, boolean>>;
}

const EMPTY_VIEW = deriveView({});

export function useHospital(): HospitalState {
  const state = useSyncExternalStore(subscribe, read, () => null);
  return useMemo(() => {
    if (!state) return { ready: false, profile: null, profiles: [DEMO_PROFILE], data: {}, view: EMPTY_VIEW, uploaded: {} };
    const profiles = allProfiles(state);
    const profile = profiles.find((p) => p.id === state.active) ?? null;
    const own = profile ? state.uploads[profile.id] ?? {} : {};
    const data: HospitalData = profile?.demo ? { ...DEMO_DATA, ...own } : own;
    const uploaded = Object.fromEntries(Object.keys(own).map((k) => [k, true]));
    return { ready: true, profile, profiles, data, view: deriveView(data), uploaded };
  }, [state]);
}
