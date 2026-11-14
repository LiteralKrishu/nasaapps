import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  { ignores: [".next/**", "node_modules/**", "out/**", "scripts/**"] },
  {
    // Images are pre-sized WebP/PNG science figures, several with absolutely positioned overlays.
    rules: { "@next/next/no-img-element": "off" },
  },
];

export default config;
