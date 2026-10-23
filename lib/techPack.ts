// The editable tech pack held in the browser. Everything is a string so the
// user can type freely; the PDF prints exactly what is on screen.
export type BomRow = {
  category: string;
  item: string;
  specification: string;
  placement: string;
  colour: string;
  quantity: string;
};

export type EditablePack = {
  title: string;
  description: string;
  fit: string;
  fabric: string;
  sizes: string[];
  baseSize: string;
  spec: { pom: string; tolerance: string; values: Record<string, string> }[];
  notes: { area: string; detail: string }[];
  bom: BomRow[];
  missing: string[];
};
