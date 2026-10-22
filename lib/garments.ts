export type GarmentType = "tee" | "joggers";

export type Measurement = { key: string; label: string };

export const GARMENTS: Record<
  GarmentType,
  { label: string; measurements: Measurement[] }
> = {
  tee: {
    label: "Tee",
    measurements: [
      { key: "chest", label: "Chest, flat across (1 in below armhole)" },
      { key: "length", label: "Body length (HPS to hem)" },
      { key: "shoulder", label: "Shoulder width" },
      { key: "sleeveLength", label: "Sleeve length" },
    ],
  },
  joggers: {
    label: "Joggers",
    measurements: [
      { key: "waist", label: "Waist, flat across (relaxed)" },
      { key: "hip", label: "Hip, flat across" },
      { key: "inseam", label: "Inseam" },
      { key: "rise", label: "Front rise" },
    ],
  },
};

export const FITS = ["Slim", "Regular", "Relaxed", "Oversized"] as const;
export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export type TechPackInput = {
  garmentType: GarmentType;
  fabric: string;
  fit: (typeof FITS)[number];
  sizeFrom: (typeof SIZES)[number];
  sizeTo: (typeof SIZES)[number];
  baseSize: (typeof SIZES)[number];
  measurements: Record<string, number>;
};
