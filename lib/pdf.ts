import type { EditablePack } from "./techPack";

const DISCLAIMER = "DRAFT: verify before sending to the factory.";

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the sketch image."));
    img.src = dataUrl;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read the sketch image."));
    r.readAsDataURL(file);
  });
}

/** Builds the factory PDF in the browser and downloads it. */
export async function downloadPdf(pack: EditablePack, sketch: File) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const lastY = () =>
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? margin;

  let y = margin;
  doc.setFont("helvetica", "bold").setFontSize(18);
  doc.text(pack.title || "Tech pack", margin, y + 6);
  y += 12;

  doc.setFillColor(254, 243, 199).rect(margin, y, contentW, 8, "F");
  doc.setTextColor(120, 53, 15).setFontSize(10);
  doc.text(DISCLAIMER, margin + 3, y + 5.5);
  doc.setTextColor(0);
  y += 14;

  // Sketch (left) and details (right)
  const dataUrl = await fileToDataUrl(sketch);
  const img = await loadImage(dataUrl);
  const boxW = 70;
  const boxH = 70;
  const scale = Math.min(boxW / img.width, boxH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const format = sketch.type === "image/png" ? "PNG" : sketch.type === "image/webp" ? "WEBP" : "JPEG";
  doc.setDrawColor(200).rect(margin, y, boxW, boxH);
  doc.addImage(dataUrl, format, margin + (boxW - w) / 2, y + (boxH - h) / 2, w, h);

  const textX = margin + boxW + 6;
  const textW = contentW - boxW - 6;
  doc.setFont("helvetica", "bold").setFontSize(10).text("Fit", textX, y + 4);
  doc.setFont("helvetica", "normal").text(pack.fit || "-", textX, y + 9);
  doc.setFont("helvetica", "bold").text("Fabric", textX, y + 17);
  doc.setFont("helvetica", "normal").text(doc.splitTextToSize(pack.fabric || "-", textW), textX, y + 22);
  doc.setFont("helvetica", "bold").text("Sizes", textX, y + 32);
  doc.setFont("helvetica", "normal").text(
    `${pack.sizes[0]} to ${pack.sizes[pack.sizes.length - 1]} (base ${pack.baseSize})`,
    textX,
    y + 37,
  );
  doc.setFont("helvetica", "bold").text("Description", textX, y + 45);
  doc.setFont("helvetica", "normal").text(
    doc.splitTextToSize(pack.description || "-", textW).slice(0, 8),
    textX,
    y + 50,
  );
  y += boxH + 8;

  const section = (title: string) => {
    if (y > pageH - 40) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold").setFontSize(12).text(title, margin, y);
    y += 3;
  };
  const head = { fillColor: [39, 39, 42] as [number, number, number] };
  const common = {
    margin: { left: margin, right: margin, bottom: 16 },
    styles: { fontSize: 9, cellPadding: 1.8 },
    headStyles: head,
  };

  section("Spec table (cm)");
  autoTable(doc, {
    ...common,
    startY: y,
    head: [["Point of measure", "Tol. +/-", ...pack.sizes.map((s) => (s === pack.baseSize ? `${s} (base)` : s))]],
    body: pack.spec.map((r) => [r.pom, r.tolerance, ...pack.sizes.map((s) => r.values[s] ?? "")]),
  });
  y = lastY() + 8;

  if (pack.notes.length) {
    section("Construction notes");
    autoTable(doc, {
      ...common,
      startY: y,
      head: [["Area", "Detail"]],
      body: pack.notes.map((n) => [n.area, n.detail]),
      columnStyles: { 0: { cellWidth: 38, fontStyle: "bold" } },
    });
    y = lastY() + 8;
  }

  if (pack.trims.length) {
    section("Trims and materials");
    autoTable(doc, {
      ...common,
      startY: y,
      head: [["Item", "Specification", "Qty"]],
      body: pack.trims.map((t) => [t.item, t.specification, t.quantity]),
      columnStyles: { 0: { cellWidth: 42 }, 2: { cellWidth: 34 } },
    });
    y = lastY() + 8;
  }

  if (pack.missing.length) {
    section("Still to confirm with the factory");
    autoTable(doc, {
      ...common,
      startY: y,
      head: [["#", "Question"]],
      body: pack.missing.map((q, i) => [String(i + 1), q]),
      columnStyles: { 0: { cellWidth: 10 } },
    });
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(110);
    doc.text(DISCLAIMER, margin, pageH - 8);
    doc.text(`Page ${p} of ${pages}`, pageW - margin, pageH - 8, { align: "right" });
  }

  const name = (pack.title || "tech-pack").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save(`${name || "tech-pack"}.pdf`);
}
