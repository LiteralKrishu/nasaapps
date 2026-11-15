import { IBM_Plex_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-serif", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-mono", display: "swap" });

const DESCRIPTION = "Plan a safe Marswalk around Namib Dune in Gale Crater: route, suit budget, weather, radiation and marsquakes from NASA Curiosity, MRO, MAVEN, InSight, Perseverance and SWIM data, with a go / no-go call.";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

const MOTION_BOOT = `(function(){var d=document.documentElement;if(matchMedia("(prefers-reduced-motion: no-preference)").matches){d.classList.add("js-motion");setTimeout(function(){d.classList.remove("js-motion")},3000)}})()`;

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
  themeColor: "#151613",
  colorScheme: "dark",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Hide intro elements until GSAP takes over; give up after 3 s so content is never lost. */}
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
