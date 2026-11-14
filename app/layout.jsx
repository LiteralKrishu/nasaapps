import "./globals.css";

export const metadata = {
  title: "Namib Dune · Martian Map",
  description: "Plan a Marswalk around Namib Dune in Gale Crater using NASA Curiosity, MAVEN, SWIM, MOXIE and InSight data.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
