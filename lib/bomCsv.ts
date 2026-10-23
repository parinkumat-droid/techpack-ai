import type { EditablePack } from "./techPack";

// Spreadsheet apps run text that starts with these characters as formulas.
const risky = /^[=+\-@\t\r]/;

function cell(value: string) {
  const text = risky.test(value) ? `'${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Downloads the BOM as a CSV that opens cleanly in Excel and Google Sheets. */
export function downloadBomCsv(pack: EditablePack) {
  const rows = [
    ["#", "Category", "Item", "Specification", "Placement", "Colour", "Qty per garment"],
    ...pack.bom.map((b, i) => [String(i + 1), b.category, b.item, b.specification, b.placement, b.colour, b.quantity]),
  ];
  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  const name = (pack.title || "tech-pack").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  a.href = url;
  a.download = `${name || "tech-pack"}-bom.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
