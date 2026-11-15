import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource-variable/instrument-sans";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./globals.css";

const DESCRIPTION = "Plan a safe Marswalk around Namib Dune in Gale Crater: route, suit budget, weather, radiation and marsquakes from NASA Curiosity, MRO, MAVEN, InSight, Perseverance and SWIM data, with a go / no-go call.";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Namib Dune · Marswalk planner",
  description: DESCRIPTION,
  applicationName: "Marswalk planner",
  keywords: ["Mars", "Gale Crater", "Namib Dune", "Curiosity", "EVA planning", "NASA Space Apps"],
  openGraph: { title: "Namib Dune · Marswalk planner", description: DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: "Namib Dune · Marswalk planner", description: DESCRIPTION },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#141211",
  colorScheme: "dark",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
