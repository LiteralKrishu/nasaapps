/** True when the browser can create a WebGL context (checked once, client-side only). */
let supported;
export function canUseWebGL() {
  if (supported !== undefined) return supported;
  try {
    const canvas = document.createElement("canvas");
    supported = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    supported = false;
  }
  return supported;
}
