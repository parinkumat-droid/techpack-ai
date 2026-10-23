export type GarmentType =
  | "tee"
  | "shirt"
  | "hoodie"
  | "jacket"
  | "joggers"
  | "shorts"
  | "jeans";

export type Measurement = { key: string; label: string };

const TOP = {
  chest: { key: "chest", label: "Chest, flat across (1 in below armhole)" },
  length: { key: "length", label: "Body length (HPS to hem)" },
  shoulder: { key: "shoulder", label: "Shoulder width" },
} as const;

export const GARMENTS: Record<
  GarmentType,
  {
    label: string;
    measurements: Measurement[];
    /** Typical components, passed to the AI as a prompt to look for them. */
    components: string;
  }
> = {
  tee: {
    label: "Tee",
    measurements: [
      TOP.chest,
      TOP.length,
      TOP.shoulder,
      { key: "sleeveLength", label: "Sleeve length" },
    ],
    components: "neckband, shoulder seams, sleeve hems, bottom hem, labels, any print or embroidery",
  },
  shirt: {
    label: "Shirt",
    measurements: [
      TOP.chest,
      TOP.length,
      TOP.shoulder,
      { key: "sleeveLength", label: "Sleeve length (shoulder point to cuff)" },
    ],
    components: "collar and collar stand, placket, buttons and buttonholes, cuffs, pocket, yoke, hem shape, interlining",
  },
  hoodie: {
    label: "Hoodie",
    measurements: [
      TOP.chest,
      TOP.length,
      TOP.shoulder,
      { key: "sleeveLength", label: "Sleeve length (shoulder point to cuff)" },
    ],
    components: "hood and hood lining, drawcord and eyelets, kangaroo pocket, rib cuffs and hem, zip if any, labels, print or embroidery",
  },
  jacket: {
    label: "Jacket",
    measurements: [
      TOP.chest,
      TOP.length,
      TOP.shoulder,
      { key: "sleeveLength", label: "Sleeve length (shoulder point to cuff)" },
    ],
    components: "collar, front closure (zip or buttons), pockets, lining, cuffs and hem finish, interlining, labels",
  },
  joggers: {
    label: "Joggers",
    measurements: [
      { key: "waist", label: "Waist, flat across (relaxed)" },
      { key: "hip", label: "Hip, flat across" },
      { key: "inseam", label: "Inseam" },
      { key: "rise", label: "Front rise" },
    ],
    components: "waistband, elastic and drawcord, pockets, cuffs or hems, labels, patches or prints",
  },
  shorts: {
    label: "Shorts",
    measurements: [
      { key: "waist", label: "Waist, flat across (relaxed)" },
      { key: "hip", label: "Hip, flat across" },
      { key: "inseam", label: "Inseam" },
      { key: "rise", label: "Front rise" },
    ],
    components: "waistband, elastic or drawcord or button closure, pockets, hem, labels",
  },
  jeans: {
    label: "Jeans",
    measurements: [
      { key: "waist", label: "Waist, flat across" },
      { key: "hip", label: "Hip, flat across" },
      { key: "thigh", label: "Thigh, flat across (1 in below crotch)" },
      { key: "rise", label: "Front rise" },
      { key: "inseam", label: "Inseam" },
      { key: "legOpening", label: "Leg opening, flat across" },
    ],
    components: "zip fly, waistband and belt loops, button or rivets, five pockets, back yoke, hem, wash, labels and patch",
  },
};

export const GENDERS = ["Men", "Women", "Unisex", "Kids"] as const;

export const FITS = ["Slim", "Regular", "Relaxed", "Oversized"] as const;
export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export type TechPackInput = {
  garmentType: GarmentType;
  gender?: (typeof GENDERS)[number];
  fabric: string;
  fit: (typeof FITS)[number];
  sizeFrom: (typeof SIZES)[number];
  sizeTo: (typeof SIZES)[number];
  baseSize: (typeof SIZES)[number];
  measurements: Record<string, number>;
};
