import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME}, a Marswalk planner for Namib Dune in Gale Crater`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CHECKS = [["Route & terrain", "#8fd19e"], ["Suit consumables", "#8fd19e"], ["Weather", "#ecbb71"], ["Radiation", "#8fd19e"], ["Marsquakes", "#8fd19e"]];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", padding: 72, color: "#f1ebdd",
        background: "radial-gradient(circle at 85% 20%, #5a3322 0%, #151613 55%)", fontFamily: "serif",
      }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#ecbb71", fontFamily: "monospace" }}>
            NAMIB DUNE · GALE CRATER
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 104, lineHeight: 1, letterSpacing: -3 }}>{SITE_NAME}</div>
            <div style={{ fontSize: 34, marginTop: 24, color: "#ada99a", maxWidth: 640, fontFamily: "sans-serif", lineHeight: 1.35 }}>
              Plan a Marswalk around Namib Dune with NASA observations.
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#ada99a", fontFamily: "monospace" }}>
            NASA Space Apps Challenge 2026
          </div>
        </div>
        <div style={{
          display: "flex", flexDirection: "column", width: 340, marginLeft: 40, alignSelf: "center", padding: 28, gap: 16,
          background: "#1b1d18", border: "2px solid #373930", borderTop: "6px solid #ecbb71", borderRadius: 8,
        }}>
          <div style={{ display: "flex", fontSize: 18, color: "#ada99a", fontFamily: "monospace", letterSpacing: 2 }}>MISSION READINESS</div>
          <div style={{ display: "flex", fontSize: 64, color: "#ecbb71" }}>Caution</div>
          {CHECKS.map(([label, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, fontFamily: "sans-serif" }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
