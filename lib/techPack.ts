// The editable tech pack held in the browser. Everything is a string or a
// plain number so the user can type freely; the PDF prints exactly what is on
// screen.
export type BomRow = {
  category: string;
  item: string;
  specification: string;
  placement: string;
  colour: string;
  quantity: string;
};

export type Callout = { label: string; x: number; y: number };

export type ArtworkRow = {
  name: string;
  technique: string;
  placement: string;
  size: string;
  colour: string;
};

export type ThreadRow = {
  description: string;
  tex: string;
  spi: string;
  comment: string;
};

export type EditablePack = {
  brand: string;
  styleId: string;
  category: string;
  designSummary: string;
  title: string;
  description: string;
  fit: string;
  fabric: string;
  sizes: string[];
  baseSize: string;
  spec: { pom: string; tolerance: string; values: Record<string, string> }[];
  frontCallouts: Callout[];
  backCallouts: Callout[];
  artwork: ArtworkRow[];
  threads: ThreadRow[];
  notes: { area: string; detail: string }[];
  bom: BomRow[];
  missing: string[];
};

/** Files the PDF needs beside the text. Never sent to a server. */
export type PackImages = { front: File; back?: File | null; logo?: File | null };
