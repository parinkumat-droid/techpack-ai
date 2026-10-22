import { GARMENTS, type TechPackInput } from "@/lib/garments";
import type { AiTechPack } from "@/lib/aiSchema";
import type { SpecTable } from "@/lib/specRules";

const th = "border border-zinc-300 px-2 py-1 text-left dark:border-zinc-700";
const td = "border border-zinc-300 px-2 py-1 dark:border-zinc-700";

// Read-only for now; editing and PDF export come next.
export default function TechPackView({
  input,
  specTable,
  ai,
}: {
  input: TechPackInput;
  specTable: SpecTable;
  ai: AiTechPack;
}) {
  return (
    <section className="space-y-6 border-t border-zinc-300 pt-6 dark:border-zinc-700">
      <p
        role="note"
        className="rounded-lg bg-amber-100 p-3 text-sm font-medium text-amber-900"
      >
        Draft: verify everything before sending to the factory.
      </p>

      {!ai.imageMatchesGarmentType && (
        <p role="alert" className="text-sm font-medium text-red-600">
          The image may not show a {GARMENTS[input.garmentType].label.toLowerCase()}.
          Check the garment type and the notes below.
        </p>
      )}

      <div>
        <h2 className="text-xl font-semibold">
          {GARMENTS[input.garmentType].label}
        </h2>
        <p className="mt-1 text-sm">{ai.garmentDescription}</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {input.fit} fit · {input.fabric}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Spec table (cm)</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={th}>Point of measure</th>
                <th className={th}>Tol. ±</th>
                {specTable.sizes.map((s) => (
                  <th key={s} className={th}>
                    {s}
                    {s === input.baseSize ? " (base)" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {specTable.rows.map((r) => (
                <tr key={r.key}>
                  <td className={td}>{r.pom}</td>
                  <td className={td}>{r.tolerance}</td>
                  {specTable.sizes.map((s) => (
                    <td key={s} className={td}>
                      {r.values[s]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Base size values are yours. Other sizes and tolerances come from
          standard grading rules; confirm them with your factory.
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Construction notes</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {ai.constructionNotes.map((n, i) => (
            <li key={i}>
              <strong>{n.area}:</strong> {n.detail}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Trims and materials</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={th}>Item</th>
                <th className={th}>Specification</th>
                <th className={th}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {ai.trims.map((t, i) => (
                <tr key={i}>
                  <td className={td}>{t.item}</td>
                  <td className={td}>{t.specification}</td>
                  <td className={td}>{t.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Still missing (the factory will ask)</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {ai.missingDetails.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
