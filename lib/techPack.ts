// The editable tech pack held in the browser. Everything is a string so the
// user can type freely; the PDF prints exactly what is on screen.
export type EditablePack = {
  title: string;
  description: string;
  fit: string;
  fabric: string;
  sizes: string[];
  baseSize: string;
  spec: { pom: string; tolerance: string; values: Record<string, string> }[];
  notes: { area: string; detail: string }[];
  trims: { item: string; specification: string; quantity: string }[];
  missing: string[];
};
