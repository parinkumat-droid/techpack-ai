import type { Callout, EditablePack, PackImages } from "./techPack";

const DISCLAIMER = "DRAFT: verify before sending to the factory.";
// A4 landscape, in mm
const W = 297;
const H = 210;
const FRAME = { x: 8, y: 8, w: W - 16, h: H - 16 };
const HEAD_H = 26;
const BRAND_W = 62;
const DARK: [number, number, number] = [38, 34, 20];
const RED: [number, number, number] = [200, 30, 40];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read an image."));
    r.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read an image."));
    img.src = dataUrl;
  });
}

type Loaded = { dataUrl: string; w: number; h: number; format: "PNG" | "JPEG" | "WEBP" };

// jsPDF cannot embed every format as-is, so every image is redrawn as a JPEG
// or PNG on a canvas first.
async function load(file: File): Promise<Loaded> {
  const img = await loadImage(await fileToDataUrl(file));
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare an image.");
  const png = file.type === "image/png";
  if (!png) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);
  return {
    dataUrl: canvas.toDataURL(png ? "image/png" : "image/jpeg", 0.85),
    w,
    h,
    format: png ? "PNG" : "JPEG",
  };
}

const inches = (cm: string) => {
  const n = Number(cm);
  return Number.isFinite(n) && cm.trim() !== "" ? (Math.round((n / 2.54) * 10) / 10).toString() : cm;
};

/** Builds the factory PDF in the browser and downloads it. */
export async function downloadPdf(pack: EditablePack, images: PackImages) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const front = await load(images.front);
  const back = images.back ? await load(images.back) : null;
  const logo = images.logo ? await load(images.logo) : null;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const titles: Record<number, string> = {};
  let current = "";
  let started = false;
  const newPage = (title: string) => {
    if (started) doc.addPage();
    started = true;
    current = title;
    titles[doc.getNumberOfPages()] = title;
  };
  const lastY = () =>
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40;

  const table = (opts: Parameters<typeof autoTable>[1]) =>
    autoTable(doc, {
      theme: "grid",
      margin: { top: 36, left: 18, right: 18, bottom: 16 },
      styles: { fontSize: 9, cellPadding: 2.2, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: 0 },
      headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold" },
      didDrawPage: (d) => {
        titles[d.pageNumber] ??= current;
      },
      ...opts,
    });

  // Image with red callout arrows, in the same style as the reference sheet.
  const viewPage = (title: string, img: Loaded, callouts: Callout[]) => {
    newPage(title);
    const box = { x: 24, y: 46, w: 130, h: 140 };
    const s = Math.min(box.w / img.w, box.h / img.h);
    const iw = img.w * s;
    const ih = img.h * s;
    const ix = box.x + (box.w - iw) / 2;
    const iy = box.y + (box.h - ih) / 2;
    doc.addImage(img.dataUrl, img.format, ix, iy, iw, ih);

    // Spread the labels down the right so they never overlap.
    const labelX = 172;
    const sorted = callouts
      .map((c) => ({ ...c, px: ix + c.x * iw, py: iy + c.y * ih }))
      .sort((a, b) => a.py - b.py);
    const top = 50;
    const bottom = H - 22;
    const gap = Math.min(10, (bottom - top) / Math.max(sorted.length, 1));
    let prev = top - gap;
    const placed = sorted.map((c) => {
      const ly = Math.min(Math.max(c.py, prev + gap), bottom);
      prev = ly;
      return { ...c, ly };
    });
    for (let i = placed.length - 2; i >= 0; i--) {
      if (placed[i].ly > placed[i + 1].ly - gap) placed[i].ly = placed[i + 1].ly - gap;
    }
    doc.setDrawColor(...RED).setFillColor(...RED).setLineWidth(0.3);
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(0);
    for (const c of placed) {
      doc.line(c.px, c.py, labelX - 3, c.ly);
      doc.triangle(labelX - 3, c.ly, labelX - 5.5, c.ly - 1.1, labelX - 5.5, c.ly + 1.1, "F");
      doc.setFillColor(...RED).circle(c.px, c.py, 0.7, "F");
      doc.text(c.label.toUpperCase(), labelX, c.ly + 1.2, { maxWidth: W - labelX - 14 });
    }
  };

  // 1. Front
  viewPage("", front, pack.frontCallouts);
  // 2. Back
  if (back) viewPage("", back, pack.backCallouts);

  // 3. Artwork
  if (pack.artwork.length) {
    newPage("ARTWORK SHEET");
    table({
      startY: 40,
      head: [["Artwork", "Technique", "Placement", "Size", "Colour"]],
      body: pack.artwork.map((a) => [a.name, a.technique, a.placement, a.size, a.colour]),
    });
  }

  // 4. Thread
  if (pack.threads.length) {
    newPage("THREAD SHEET");
    table({
      startY: 40,
      head: [["Description", "TEX", "SPI", "Additional comment"]],
      body: pack.threads.map((t) => [t.description, t.tex, t.spi, t.comment]),
    });
  }

  // 5. Size sheet (cm, then inches)
  newPage("SIZE SHEET");
  const sizeHead = [["Point of measure", "Tol. +/-", ...pack.sizes.map((s) => (s === pack.baseSize ? `${s} (base)` : s))]];
  table({
    startY: 40,
    head: [[{ content: "SIZE CHART (cm)", colSpan: pack.sizes.length + 2, styles: { halign: "center" as const } }], ...sizeHead],
    body: pack.spec.map((r) => [r.pom, r.tolerance, ...pack.sizes.map((s) => r.values[s] ?? "")]),
  });
  table({
    startY: lastY() + 8,
    head: [[{ content: "SIZE CHART (in)", colSpan: pack.sizes.length + 2, styles: { halign: "center" as const } }], ...sizeHead],
    body: pack.spec.map((r) => [r.pom, inches(r.tolerance), ...pack.sizes.map((s) => inches(r.values[s] ?? ""))]),
  });

  // 6. Construction notes
  if (pack.notes.length) {
    newPage("CONSTRUCTION NOTES");
    table({
      startY: 40,
      head: [["Area", "Detail"]],
      body: pack.notes.map((n) => [n.area, n.detail]),
      columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" } },
    });
  }

  // 7. BOM
  if (pack.bom.length) {
    newPage("BOM SHEET");
    table({
      startY: 40,
      head: [["#", "Category", "Item", "Specification", "Placement", "Colour", "Qty / garment"]],
      body: pack.bom.map((b, i) => [String(i + 1), b.category, b.item, b.specification, b.placement, b.colour, b.quantity]),
      columnStyles: { 0: { cellWidth: 9 }, 1: { cellWidth: 26 }, 2: { cellWidth: 38 }, 4: { cellWidth: 40 }, 5: { cellWidth: 30 }, 6: { cellWidth: 36 } },
    });
  }

  // 8. Open questions
  if (pack.missing.length) {
    newPage("TO CONFIRM WITH THE FACTORY");
    table({
      startY: 40,
      head: [["#", "Question"]],
      body: pack.missing.map((q, i) => [String(i + 1), q]),
      columnStyles: { 0: { cellWidth: 10 } },
    });
  }

  // Frame, header and footer on every page, drawn last so overflow pages match.
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(0).setLineWidth(0.5).rect(FRAME.x, FRAME.y, FRAME.w, FRAME.h);
    // brand block
    if (logo) {
      doc.setFillColor(255, 255, 255).rect(FRAME.x, FRAME.y, BRAND_W, HEAD_H, "FD");
      const s = Math.min((BRAND_W - 8) / logo.w, (HEAD_H - 6) / logo.h);
      doc.addImage(logo.dataUrl, logo.format, FRAME.x + (BRAND_W - logo.w * s) / 2, FRAME.y + (HEAD_H - logo.h * s) / 2, logo.w * s, logo.h * s);
    } else {
      doc.setFillColor(...DARK).rect(FRAME.x, FRAME.y, BRAND_W, HEAD_H, "F");
      doc.setTextColor(255).setFont("helvetica", "bold").setFontSize(20);
      doc.text((pack.brand || "BRAND").toUpperCase(), FRAME.x + BRAND_W / 2, FRAME.y + HEAD_H / 2 + 3, { align: "center", maxWidth: BRAND_W - 6 });
      doc.setTextColor(0);
    }
    const rows: [string, string][][] = [
      [["STYLE ID", pack.styleId], ["CATEGORY", pack.category]],
      [["FABRIC", pack.fabric], ["SIZES", `${pack.sizes.join(", ")} (base ${pack.baseSize})`]],
      [["DESCRIPTION", pack.designSummary], ["FIT", pack.fit]],
    ];
    const hx = FRAME.x + BRAND_W;
    const hw = FRAME.w - BRAND_W;
    const rh = HEAD_H / 3;
    if (p === 1) {
      doc.setLineWidth(0.3).setDrawColor(0);
      rows.forEach((row, ri) => {
        const y = FRAME.y + ri * rh;
        doc.rect(hx, y, hw, rh);
        doc.line(hx + hw / 2, y, hx + hw / 2, y + rh);
        row.forEach(([k, v], ci) => {
          const x = hx + ci * (hw / 2) + 3;
          doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(110).text(`${k} -`, x, y + rh / 2 + 1.5);
          const kw = doc.getTextWidth(`${k} - `);
          doc.setTextColor(0).text((v || "-").toUpperCase(), x + kw, y + rh / 2 + 1.5, { maxWidth: hw / 2 - kw - 6 });
        });
      });
    } else if (titles[p]) {
      doc.setFont("helvetica", "normal").setFontSize(20).setTextColor(0);
      doc.text(titles[p], hx + 8, FRAME.y + HEAD_H / 2 + 3);
    }
    const viewName = titles[p] === "" ? (back && p === 2 ? "BACK" : "FRONT") : "";
    if (viewName) {
      doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(110);
      doc.text(viewName, 89, 42, { align: "center" });
    }
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(110);
    doc.text(DISCLAIMER, FRAME.x + 4, FRAME.y + FRAME.h - 3);
    doc.text(`Page ${p} of ${pages}`, FRAME.x + FRAME.w - 4, FRAME.y + FRAME.h - 3, { align: "right" });
  }

  const name = (pack.styleId || pack.title || "tech-pack").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save(`${name || "tech-pack"}.pdf`);
}
