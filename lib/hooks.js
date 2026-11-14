"use client";

import { useEffect, useState } from "react";

/** Tracks an element's rendered size with a ResizeObserver. */
export function useElementSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const update = () => {
      const { width, height } = element.getBoundingClientRect();
      setSize(previous => (previous.width === width && previous.height === height ? previous : { width, height }));
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/** Reads a CSS custom property from the document root. Client-only. */
export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Sizes a canvas backing store for the device pixel ratio and returns a scaled 2D context. */
export function prepareCanvas(canvas, width, height, maxScale = 2) {
  const scale = Math.min(maxScale, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  return context;
}

/** Picks a 1/2/5 × 10ⁿ tick step that is at least the rough step. */
export function niceStep(roughStep) {
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  return [1, 2, 5, 10].map(value => value * magnitude).find(value => value >= roughStep);
}

export const METHODS_URL = "https://github.com/YASHCHAUDHARI007/nasaapps/blob/main/docs/methods.md";
