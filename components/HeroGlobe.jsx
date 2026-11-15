"use client";

import dynamic from "next/dynamic";

// three.js stays out of the first load; the hero image shows until the globe is ready.
const MarsGlobe = dynamic(() => import("./MarsGlobe"), { ssr: false });

export default function HeroGlobe() {
  return <MarsGlobe />;
}
