"use client";

import { useState } from "react";
import {
  FITS,
  GARMENTS,
  GENDERS,
  SIZES,
  type GarmentType,
  type TechPackInput,
} from "@/lib/garments";
import { checkMeasurement, type SpecTable } from "@/lib/specRules";
import type { AiTechPack } from "@/lib/aiSchema";
import TechPackView, { type PackMeta } from "@/components/TechPackView";
import type { PackImages } from "@/lib/techPack";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const field =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const label = "mb-1 block text-sm font-medium";

export default function TechPackForm() {
  const [garmentType, setGarmentType] = useState<GarmentType>("tee");
  const [fabric, setFabric] = useState("");
  const [fit, setFit] = useState<TechPackInput["fit"]>("Regular");
  const [sizeFrom, setSizeFrom] = useState<TechPackInput["sizeFrom"]>("S");
  const [sizeTo, setSizeTo] = useState<TechPackInput["sizeTo"]>("XL");
  const [baseSize, setBaseSize] = useState<TechPackInput["baseSize"]>("M");
  const [values, setValues] = useState<Record<string, string>>({});
  const [gender, setGender] = useState<string>("Men");
  const [brand, setBrand] = useState("");
  const [styleId, setStyleId] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const [backImage, setBackImage] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    input: TechPackInput;
    specTable: SpecTable;
    ai: AiTechPack;
    images: PackImages;
    frontUrl: string;
    backUrl: string | null;
    meta: PackMeta;
  } | null>(null);

  const garment = GARMENTS[garmentType];

  function pickImage(
    file: File | undefined,
    other: File | undefined,
    set: (v: { file: File; url: string }) => void,
  ) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG or PNG).");
      return;
    }
    if (file.size + (other?.size ?? 0) > MAX_IMAGE_BYTES) {
      setError("The front and back images together must be under 4 MB.");
      return;
    }
    set({ file, url: URL.createObjectURL(file) });
  }
  const onImage = (f: File | undefined) => pickImage(f, backImage?.file, setImage);
  const onBackImage = (f: File | undefined) => pickImage(f, image?.file, setBackImage);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!image) return setError("Please upload a sketch or photo.");
    if (SIZES.indexOf(sizeFrom) > SIZES.indexOf(sizeTo))
      return setError("Size range: the first size must be smaller than the last.");
    if (
      SIZES.indexOf(baseSize) < SIZES.indexOf(sizeFrom) ||
      SIZES.indexOf(baseSize) > SIZES.indexOf(sizeTo)
    )
      return setError("Base size must be inside your size range.");

    const measurements: Record<string, number> = {};
    for (const m of garment.measurements) {
      const n = Number(values[m.key]);
      const problem = checkMeasurement(garmentType, m.key, n);
      if (problem) return setError(problem);
      measurements[m.key] = n;
    }
    const input: TechPackInput = {
      garmentType,
      gender: gender ? (gender as TechPackInput["gender"]) : undefined,
      fabric: fabric.trim(),
      fit,
      sizeFrom,
      sizeTo,
      baseSize,
      measurements,
    };

    const body = new FormData();
    body.append("image", image.file);
    if (backImage) body.append("backImage", backImage.file);
    body.append("input", JSON.stringify(input));
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/generate", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(
          data?.error ??
            "The server took too long or failed. Please try again in a minute.",
        );
      setResult({
        ...data,
        images: { front: image.file, back: backImage?.file ?? null, logo },
        frontUrl: image.url,
        backUrl: backImage?.url ?? null,
        meta: { brand: brand.trim(), styleId: styleId.trim(), gender },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reach the server.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <span className={label}>Front view (sketch or photo)</span>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt="Uploaded garment sketch preview"
              className="max-h-64 rounded"
            />
          ) : (
            <span>Tap to upload a JPG or PNG (max 4 MB)</span>
          )}
          <span className="font-medium underline">
            {image ? "Change image" : "Choose file"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => onImage(e.target.files?.[0])}
          />
        </label>
      </div>

      <div>
        <span className={label}>Back view (optional)</span>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-600 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {backImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={backImage.url} alt="Back view preview" className="max-h-48 rounded" />
          ) : (
            <span>Add a back view to get a back-view sheet</span>
          )}
          <span className="font-medium underline">{backImage ? "Change image" : "Choose file"}</span>
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => onBackImage(e.target.files?.[0])} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="brand" className={label}>Brand name</label>
          <input id="brand" className={field} placeholder="e.g. FSS" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
        <div>
          <label htmlFor="styleId" className={label}>Style ID</label>
          <input id="styleId" className={field} placeholder="e.g. FSS_MEN_TS_04" value={styleId} onChange={(e) => setStyleId(e.target.value)} />
        </div>
        <div>
          <label htmlFor="gender" className={label}>For</label>
          <select id="gender" className={field} value={gender} onChange={(e) => setGender(e.target.value)}>
            {GENDERS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="logo" className={label}>Brand logo (optional, used in the PDF header)</label>
        <input id="logo" type="file" accept="image/*" className="block w-full text-sm" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="garment" className={label}>
            Garment type
          </label>
          <select
            id="garment"
            className={field}
            value={garmentType}
            onChange={(e) => {
              setGarmentType(e.target.value as GarmentType);
              setValues({});
            }}
          >
            {Object.entries(GARMENTS).map(([k, g]) => (
              <option key={k} value={k}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fit" className={label}>
            Fit
          </label>
          <select
            id="fit"
            className={field}
            value={fit}
            onChange={(e) => setFit(e.target.value as typeof fit)}
          >
            {FITS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="fabric" className={label}>
          Fabric
        </label>
        <input
          id="fabric"
          required
          className={field}
          placeholder="e.g. 180 GSM cotton single jersey"
          value={fabric}
          onChange={(e) => setFabric(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(
          [
            ["From size", sizeFrom, setSizeFrom],
            ["To size", sizeTo, setSizeTo],
            ["Base size", baseSize, setBaseSize],
          ] as const
        ).map(([text, val, set]) => (
          <div key={text}>
            <label className={label}>{text}</label>
            <select
              className={field}
              value={val}
              onChange={(e) => set(e.target.value as never)}
            >
              {SIZES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <fieldset>
        <legend className={label}>
          Key measurements for base size {baseSize} (in cm)
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {garment.measurements.map((m) => (
            <div key={m.key}>
              <label htmlFor={m.key} className="mb-1 block text-sm">
                {m.label}
              </label>
              <input
                id={m.key}
                inputMode="decimal"
                className={field}
                placeholder="cm"
                value={values[m.key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [m.key]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {loading ? "Generating… this takes up to a minute" : "Generate tech pack"}
      </button>

      {result && <TechPackView key={result.ai.garmentDescription} {...result} />}
    </form>
  );
}
