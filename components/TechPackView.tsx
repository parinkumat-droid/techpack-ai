"use client";

import { useState } from "react";
import { GARMENTS, type TechPackInput } from "@/lib/garments";
import type { AiTechPack } from "@/lib/aiSchema";
import type { SpecTable } from "@/lib/specRules";
import type { BomRow, EditablePack } from "@/lib/techPack";
import { downloadBomCsv } from "@/lib/bomCsv";
import { downloadPdf } from "@/lib/pdf";

const th = "border border-zinc-300 px-2 py-1 text-left dark:border-zinc-700";
const td = "border border-zinc-300 p-0 dark:border-zinc-700";
const cell =
  "w-full min-w-16 bg-transparent px-2 py-1.5 text-sm focus:bg-yellow-50 focus:outline-none dark:focus:bg-zinc-800";
const box =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const small =
  "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800";

function toPack(input: TechPackInput, specTable: SpecTable, ai: AiTechPack): EditablePack {
  return {
    title: GARMENTS[input.garmentType].label,
    description: ai.garmentDescription,
    fit: input.fit,
    fabric: input.fabric,
    sizes: specTable.sizes,
    baseSize: input.baseSize,
    spec: specTable.rows.map((r) => ({
      pom: r.pom,
      tolerance: String(r.tolerance),
      values: Object.fromEntries(
        specTable.sizes.map((s) => [s, String(r.values[s])]),
      ),
    })),
    notes: ai.constructionNotes.map((n) => ({ ...n })),
    bom: [
      {
        category: "Fabric",
        item: "Main fabric",
        specification: input.fabric,
        placement: "Body",
        colour: "TBC",
        quantity: "TBC (confirm with factory)",
      },
      ...ai.bom.map((b) => ({ ...b })),
    ],
    missing: [...ai.missingDetails],
  };
}

function remove<T>(list: T[], i: number) {
  return list.filter((_, j) => j !== i);
}

export default function TechPackView({
  input,
  specTable,
  ai,
  sketch,
}: {
  input: TechPackInput;
  specTable: SpecTable;
  ai: AiTechPack;
  sketch: File;
}) {
  const [pack, setPack] = useState<EditablePack>(() => toPack(input, specTable, ai));
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const patch = (p: Partial<EditablePack>) => setPack((cur) => ({ ...cur, ...p }));

  async function onExport() {
    setError("");
    setExporting(true);
    try {
      await downloadPdf(pack, sketch);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="space-y-6 border-t border-zinc-300 pt-6 dark:border-zinc-700">
      <p role="note" className="rounded-lg bg-amber-100 p-3 text-sm font-medium text-amber-900">
        Draft: verify everything before sending to the factory. Every field
        below is editable.
      </p>

      {!ai.imageMatchesGarmentType && (
        <p role="alert" className="text-sm font-medium text-red-600">
          The image may not show a {GARMENTS[input.garmentType].label.toLowerCase()}.
          Check the garment type and the notes below.
        </p>
      )}

      <div className="space-y-3">
        <label className="block text-sm font-medium">
          Style name
          <input className={`${box} mt-1 text-lg font-semibold`} value={pack.title} onChange={(e) => patch({ title: e.target.value })} />
        </label>
        <label className="block text-sm font-medium">
          Description
          <textarea rows={3} className={`${box} mt-1 font-normal`} value={pack.description} onChange={(e) => patch({ description: e.target.value })} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Fit
            <input className={`${box} mt-1 font-normal`} value={pack.fit} onChange={(e) => patch({ fit: e.target.value })} />
          </label>
          <label className="block text-sm font-medium">
            Fabric
            <input className={`${box} mt-1 font-normal`} value={pack.fabric} onChange={(e) => patch({ fabric: e.target.value })} />
          </label>
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Spec table (cm)</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={th}>Point of measure</th>
                <th className={th}>Tol. ±</th>
                {pack.sizes.map((s) => (
                  <th key={s} className={th}>
                    {s}
                    {s === pack.baseSize ? " (base)" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pack.spec.map((r, i) => (
                <tr key={i}>
                  <td className={td}>
                    <input aria-label="Point of measure" className={`${cell} min-w-40`} value={r.pom}
                      onChange={(e) => patch({ spec: pack.spec.map((x, j) => (j === i ? { ...x, pom: e.target.value } : x)) })} />
                  </td>
                  <td className={td}>
                    <input aria-label={`Tolerance for ${r.pom}`} inputMode="decimal" className={cell} value={r.tolerance}
                      onChange={(e) => patch({ spec: pack.spec.map((x, j) => (j === i ? { ...x, tolerance: e.target.value } : x)) })} />
                  </td>
                  {pack.sizes.map((s) => (
                    <td key={s} className={td}>
                      <input aria-label={`${r.pom}, size ${s}`} inputMode="decimal" className={cell} value={r.values[s]}
                        onChange={(e) => patch({ spec: pack.spec.map((x, j) => (j === i ? { ...x, values: { ...x.values, [s]: e.target.value } } : x)) })} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Base size values are yours. Other sizes and tolerances come from
          standard grading rules; edit them to match your factory.
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Construction notes</h3>
        <ul className="space-y-2">
          {pack.notes.map((n, i) => (
            <li key={i} className="flex flex-col gap-2 sm:flex-row">
              <input aria-label="Area" className={`${box} sm:w-40`} value={n.area}
                onChange={(e) => patch({ notes: pack.notes.map((x, j) => (j === i ? { ...x, area: e.target.value } : x)) })} />
              <textarea aria-label="Detail" rows={2} className={box} value={n.detail}
                onChange={(e) => patch({ notes: pack.notes.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)) })} />
              <button type="button" className={small} onClick={() => patch({ notes: remove(pack.notes, i) })}>Remove</button>
            </li>
          ))}
        </ul>
        <button type="button" className={`${small} mt-2`} onClick={() => patch({ notes: [...pack.notes, { area: "", detail: "" }] })}>
          Add note
        </button>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Bill of materials (BOM)</h3>
        <ul className="space-y-3">
          {pack.bom.map((r, i) => {
            const set = (k: keyof BomRow, v: string) =>
              patch({ bom: pack.bom.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });
            return (
              <li key={i} className="grid gap-2 rounded-lg border border-zinc-300 p-3 sm:grid-cols-6 dark:border-zinc-700">
                <input aria-label="Category" className={box} value={r.category} onChange={(e) => set("category", e.target.value)} />
                <input aria-label="Item" className={`${box} sm:col-span-2`} value={r.item} onChange={(e) => set("item", e.target.value)} />
                <input aria-label="Placement" className={`${box} sm:col-span-2`} value={r.placement} onChange={(e) => set("placement", e.target.value)} />
                <input aria-label="Colour" className={box} value={r.colour} onChange={(e) => set("colour", e.target.value)} />
                <textarea aria-label="Specification" rows={2} className={`${box} sm:col-span-3`} value={r.specification} onChange={(e) => set("specification", e.target.value)} />
                <input aria-label="Quantity per garment" className={`${box} sm:col-span-2`} value={r.quantity} onChange={(e) => set("quantity", e.target.value)} />
                <button type="button" className={small} onClick={() => patch({ bom: remove(pack.bom, i) })}>Remove</button>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className={small} onClick={() => patch({ bom: [...pack.bom, { category: "Trim", item: "", specification: "", placement: "", colour: "TBC", quantity: "" }] })}>
            Add BOM row
          </button>
          <button type="button" className={small} onClick={() => downloadBomCsv(pack)}>
            Download BOM (CSV for Excel)
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Each row is: category, item, placement, colour, specification,
          quantity per garment. Quantities are estimates; confirm them with
          your factory.
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Still missing (the factory will ask)</h3>
        <ul className="space-y-2">
          {pack.missing.map((q, i) => (
            <li key={i} className="flex gap-2">
              <textarea aria-label="Question" rows={2} className={box} value={q}
                onChange={(e) => patch({ missing: pack.missing.map((x, j) => (j === i ? e.target.value : x)) })} />
              <button type="button" className={small} onClick={() => patch({ missing: remove(pack.missing, i) })}>Done</button>
            </li>
          ))}
        </ul>
        <button type="button" className={`${small} mt-2`} onClick={() => patch({ missing: [...pack.missing, ""] })}>
          Add question
        </button>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Answer a question by adding the detail above, then click Done to
          remove it from the checklist.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={onExport}
        disabled={exporting}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {exporting ? "Creating PDF…" : "Download PDF for the factory"}
      </button>
    </section>
  );
}
