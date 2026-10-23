"use client";

import { useState } from "react";
import { GARMENTS, type TechPackInput } from "@/lib/garments";
import type { AiTechPack } from "@/lib/aiSchema";
import type { SpecTable } from "@/lib/specRules";
import type { BomRow, Callout, EditablePack, PackImages } from "@/lib/techPack";
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
const h3 = "mb-2 font-semibold";

export type PackMeta = { brand: string; styleId: string; gender: string };

function toPack(
  input: TechPackInput,
  specTable: SpecTable,
  ai: AiTechPack,
  meta: PackMeta,
): EditablePack {
  const label = GARMENTS[input.garmentType].label;
  const gender = meta.gender === "Men" ? "Mens" : meta.gender === "Women" ? "Womens" : meta.gender;
  return {
    brand: meta.brand,
    styleId: meta.styleId || "STYLE-001",
    category: [gender, label].filter(Boolean).join(" "),
    designSummary: ai.designSummary,
    title: label,
    description: ai.garmentDescription,
    fit: input.fit,
    fabric: input.fabric,
    sizes: specTable.sizes,
    baseSize: input.baseSize,
    spec: specTable.rows.map((r) => ({
      pom: r.pom,
      tolerance: String(r.tolerance),
      values: Object.fromEntries(specTable.sizes.map((s) => [s, String(r.values[s])])),
    })),
    frontCallouts: ai.frontCallouts.map((c) => ({ ...c })),
    backCallouts: ai.backCallouts.map((c) => ({ ...c })),
    artwork: ai.artwork.map((a) => ({ ...a })),
    threads: ai.threads.map((t) => ({ ...t })),
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

function CalloutEditor({
  title,
  url,
  callouts,
  onChange,
}: {
  title: string;
  url: string;
  callouts: Callout[];
  onChange: (next: Callout[]) => void;
}) {
  const pct = (n: number) => String(Math.round(n * 100));
  const set = (i: number, patch: Partial<Callout>) =>
    onChange(callouts.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const num = (v: string) => Math.min(1, Math.max(0, Number(v) / 100 || 0));
  return (
    <div>
      <h3 className={h3}>{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative w-full max-w-sm self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`${title} with callout markers`} className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-700" />
          {callouts.map((c, i) => (
            <span
              key={i}
              className="pointer-events-none absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-red-600 bg-white/90 text-[10px] font-bold text-red-700"
              style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
            >
              {i + 1}
            </span>
          ))}
        </div>
        <div className="space-y-2">
          {callouts.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <span className="w-5 text-sm font-semibold text-red-700">{i + 1}</span>
              <input aria-label={`${title} callout ${i + 1} label`} className={`${box} min-w-40 flex-1`} value={c.label} onChange={(e) => set(i, { label: e.target.value })} />
              <label className="text-xs">
                X%
                <input aria-label={`${title} callout ${i + 1} x`} inputMode="numeric" className={`${box} ml-1 w-16`} value={pct(c.x)} onChange={(e) => set(i, { x: num(e.target.value) })} />
              </label>
              <label className="text-xs">
                Y%
                <input aria-label={`${title} callout ${i + 1} y`} inputMode="numeric" className={`${box} ml-1 w-16`} value={pct(c.y)} onChange={(e) => set(i, { y: num(e.target.value) })} />
              </label>
              <button type="button" className={small} onClick={() => onChange(remove(callouts, i))}>Remove</button>
            </div>
          ))}
          <button type="button" className={small} onClick={() => onChange([...callouts, { label: "", x: 0.5, y: 0.5 }])}>
            Add callout
          </button>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            X% and Y% place each marker on the image (0 is the top-left). The
            PDF draws red arrows from these points to the labels.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TechPackView({
  input,
  specTable,
  ai,
  images,
  frontUrl,
  backUrl,
  meta,
}: {
  input: TechPackInput;
  specTable: SpecTable;
  ai: AiTechPack;
  images: PackImages;
  frontUrl: string;
  backUrl: string | null;
  meta: PackMeta;
}) {
  const [pack, setPack] = useState<EditablePack>(() => toPack(input, specTable, ai, meta));
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const patch = (p: Partial<EditablePack>) => setPack((cur) => ({ ...cur, ...p }));

  async function onExport() {
    setError("");
    setExporting(true);
    try {
      await downloadPdf(pack, images);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the PDF.");
    } finally {
      setExporting(false);
    }
  }

  const head = (key: "brand" | "styleId" | "category" | "designSummary" | "fit" | "fabric", text: string) => (
    <label className="block text-sm font-medium">
      {text}
      <input className={`${box} mt-1 font-normal`} value={pack[key]} onChange={(e) => patch({ [key]: e.target.value })} />
    </label>
  );

  return (
    <section className="space-y-8 border-t border-zinc-300 pt-6 dark:border-zinc-700">
      <p role="note" className="rounded-lg bg-amber-100 p-3 text-sm font-medium text-amber-900">
        Draft: verify everything before sending to the factory. Every field
        below is editable, and the PDF prints exactly what you see.
      </p>

      {!ai.imageMatchesGarmentType && (
        <p role="alert" className="text-sm font-medium text-red-600">
          The image may not show a {GARMENTS[input.garmentType].label.toLowerCase()}.
          Check the garment type and the notes below.
        </p>
      )}

      <div>
        <h3 className={h3}>Sheet header</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {head("brand", "Brand")}
          {head("styleId", "Style ID")}
          {head("category", "Category")}
          {head("designSummary", "Description (for example SOLID)")}
          {head("fabric", "Fabric")}
          {head("fit", "Fit")}
        </div>
        <label className="mt-3 block text-sm font-medium">
          Garment description
          <textarea rows={2} className={`${box} mt-1 font-normal`} value={pack.description} onChange={(e) => patch({ description: e.target.value })} />
        </label>
      </div>

      <CalloutEditor title="Front view" url={frontUrl} callouts={pack.frontCallouts} onChange={(c) => patch({ frontCallouts: c })} />
      {backUrl && (
        <CalloutEditor title="Back view" url={backUrl} callouts={pack.backCallouts} onChange={(c) => patch({ backCallouts: c })} />
      )}

      <div>
        <h3 className={h3}>Artwork sheet</h3>
        <ul className="space-y-2">
          {pack.artwork.map((a, i) => (
            <li key={i} className="grid gap-2 rounded-lg border border-zinc-300 p-3 sm:grid-cols-5 dark:border-zinc-700">
              {(["name", "technique", "placement", "size", "colour"] as const).map((k) => (
                <input key={k} aria-label={`Artwork ${k}`} placeholder={k} className={box} value={a[k]}
                  onChange={(e) => patch({ artwork: pack.artwork.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)) })} />
              ))}
              <button type="button" className={`${small} sm:col-span-5 sm:justify-self-start`} onClick={() => patch({ artwork: remove(pack.artwork, i) })}>Remove</button>
            </li>
          ))}
        </ul>
        <button type="button" className={`${small} mt-2`} onClick={() => patch({ artwork: [...pack.artwork, { name: "", technique: "", placement: "", size: "TBC", colour: "" }] })}>
          Add artwork
        </button>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Sizes are TBC unless you know them. Send the artwork files to your
          factory with the PDF.
        </p>
      </div>

      <div>
        <h3 className={h3}>Thread sheet</h3>
        <ul className="space-y-2">
          {pack.threads.map((t, i) => (
            <li key={i} className="grid gap-2 rounded-lg border border-zinc-300 p-3 sm:grid-cols-4 dark:border-zinc-700">
              {(["description", "tex", "spi", "comment"] as const).map((k) => (
                <input key={k} aria-label={`Thread ${k}`} placeholder={k === "tex" ? "TEX or count" : k} className={box} value={t[k]}
                  onChange={(e) => patch({ threads: pack.threads.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)) })} />
              ))}
              <button type="button" className={`${small} sm:col-span-4 sm:justify-self-start`} onClick={() => patch({ threads: remove(pack.threads, i) })}>Remove</button>
            </li>
          ))}
        </ul>
        <button type="button" className={`${small} mt-2`} onClick={() => patch({ threads: [...pack.threads, { description: "", tex: "", spi: "", comment: "" }] })}>
          Add thread row
        </button>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Suggested standards. Confirm TEX, SPI and thread type with your factory.
        </p>
      </div>

      <div>
        <h3 className={h3}>Size sheet (cm)</h3>
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
          standard grading rules; edit them to match your factory. The PDF also
          prints this table in inches.
        </p>
      </div>

      <div>
        <h3 className={h3}>Construction notes</h3>
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
        <h3 className={h3}>BOM sheet (bill of materials)</h3>
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
          Quantities are estimates; confirm them with your factory.
        </p>
      </div>

      <div>
        <h3 className={h3}>Still missing (the factory will ask)</h3>
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
