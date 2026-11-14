"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Defers rendering of a heavy section (and, with next/dynamic, its code and data)
 * until it is near the viewport, its anchor is targeted, or the browser is idle.
 * The placeholder keeps the section id so in-page links still land in the right place.
 */
export default function LazySection({ id, children }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return undefined;
    const show = () => setVisible(true);
    const targeted = () => window.location.hash === `#${id}`;
    if (targeted()) {
      show();
      return undefined;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) show();
    }, { rootMargin: "800px 0px" });
    observer.observe(ref.current);
    const onHash = () => targeted() && show();
    window.addEventListener("hashchange", onHash);
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(show, { timeout: 4000 })
      : window.setTimeout(show, 2500);
    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", onHash);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, [id, visible]);

  useEffect(() => {
    // Once mounted, re-apply a pending hash so the browser scrolls to the real section.
    if (visible && window.location.hash === `#${id}`) document.getElementById(id)?.scrollIntoView();
  }, [id, visible]);

  if (visible) return children;
  return <section ref={ref} id={id} className="lazy-placeholder" aria-busy="true" aria-label="Loading section" />;
}
