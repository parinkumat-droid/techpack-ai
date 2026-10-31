import { ImageResponse } from "next/og";

export const alt = "FreeAITechPacker: AI tech packs from a garment photo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1d1a0e",
          color: "#f5f2e9",
          padding: 72,
        }}
      >
        <div style={{ fontSize: 30, color: "#ff6b73", letterSpacing: 4 }}>
          AI TECH PACK GENERATOR
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.05 }}>
            FreeAITechPacker
          </div>
          <div style={{ fontSize: 40, color: "#d9d3c0", marginTop: 24 }}>
            One garment photo in. A factory-ready tech pack out.
          </div>
        </div>
        <div style={{ fontSize: 30, color: "#d9d3c0" }}>
          freeaitechpacker.vercel.app
        </div>
      </div>
    ),
    size,
  );
}
