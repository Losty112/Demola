/**
 * THE list of departments (wards). Every page, upload template, map and chart uses this one list,
 * so a ward is always called the same and always appears in the same order.
 * Codes and names match the synthetic network dataset in lib/demo/generate.ts.
 */
export interface Department {
  code: string;
  name: string;
}

export const DEPARTMENTS: Department[] = [
  { code: "INT", name: "Internal medicine" },
  { code: "SUR", name: "General surgery" },
  { code: "ORT", name: "Orthopaedics" },
  { code: "CAR", name: "Cardiology" },
  { code: "NEU", name: "Neurology" },
  { code: "ONC", name: "Oncology" },
  { code: "PED", name: "Paediatrics" },
  { code: "OBG", name: "Obstetrics & gynaecology" },
  { code: "ICU", name: "Intensive care" },
  { code: "GER", name: "Geriatrics & rehabilitation" },
  { code: "PSY", name: "Psychiatry" },
];

export const DEPARTMENT_BY_CODE = Object.fromEntries(DEPARTMENTS.map((d) => [d.code, d])) as Record<string, Department>;
export const deptOrder = (code: string) => DEPARTMENTS.findIndex((d) => d.code === code);

/** Accepts "CAR", "car" or "Cardiology"; returns the department code or null. */
export function resolveDepartment(input: string): string | null {
  const v = input.trim().toLowerCase();
  if (!v) return null;
  const d = DEPARTMENTS.find((x) => x.code.toLowerCase() === v || x.name.toLowerCase() === v);
  return d?.code ?? null;
}
