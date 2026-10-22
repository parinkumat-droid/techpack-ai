import {
  GARMENTS,
  SIZES,
  type GarmentType,
  type TechPackInput,
} from "./garments";

// Hard-coded MVP rules for a gym tee and joggers. All values are cm and are
// typical starting points, NOT factory-approved. The PDF says "verify before
// sending to the factory" and the brand's manufacturer should confirm them.
type Rule = {
  /** change per size step (e.g. M -> L) */
  grade: number;
  /** +/- tolerance in cm */
  tolerance: number;
  /** plausible range for the base-size value, used to catch inch/cm mix-ups */
  min: number;
  max: number;
};

export const RULES: Record<GarmentType, Record<string, Rule>> = {
  tee: {
    chest: { grade: 2.5, tolerance: 1.0, min: 35, max: 75 },
    length: { grade: 1.5, tolerance: 1.0, min: 50, max: 90 },
    shoulder: { grade: 1.0, tolerance: 0.5, min: 30, max: 60 },
    sleeveLength: { grade: 0.8, tolerance: 0.5, min: 10, max: 35 },
  },
  joggers: {
    waist: { grade: 2.5, tolerance: 1.0, min: 25, max: 60 },
    hip: { grade: 2.5, tolerance: 1.0, min: 35, max: 70 },
    inseam: { grade: 1.0, tolerance: 1.0, min: 55, max: 95 },
    rise: { grade: 0.6, tolerance: 0.5, min: 20, max: 40 },
  },
};

/** Returns an error message, or null if the value looks plausible. */
export function checkMeasurement(
  garment: GarmentType,
  key: string,
  value: number,
): string | null {
  const rule = RULES[garment][key];
  const label = GARMENTS[garment].measurements.find((m) => m.key === key)?.label;
  if (!rule || !label) return `Unknown measurement "${key}".`;
  if (!Number.isFinite(value) || value <= 0)
    return `Enter a valid number for "${label}".`;
  if (value < rule.min || value > rule.max)
    return `"${label}" should be between ${rule.min} and ${rule.max} cm. Is it in cm, not inches?`;
  return null;
}

export type SpecRow = {
  key: string;
  pom: string;
  tolerance: number;
  values: Record<string, number>;
};

export type SpecTable = { sizes: string[]; rows: SpecRow[] };

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildSpecTable(input: TechPackInput): SpecTable {
  const sizes = SIZES.slice(
    SIZES.indexOf(input.sizeFrom),
    SIZES.indexOf(input.sizeTo) + 1,
  ) as string[];
  const baseIdx = SIZES.indexOf(input.baseSize);
  const rules = RULES[input.garmentType];

  const rows = GARMENTS[input.garmentType].measurements.map((m) => {
    const rule = rules[m.key];
    const base = input.measurements[m.key];
    const values: Record<string, number> = {};
    for (const size of sizes) {
      const steps = SIZES.indexOf(size as (typeof SIZES)[number]) - baseIdx;
      values[size] = round1(base + steps * rule.grade);
    }
    return { key: m.key, pom: m.label, tolerance: rule.tolerance, values };
  });

  return { sizes, rows };
}
