"use client";

import { useEffect, useRef, useState } from "react";

/** Sticky section menu with scroll progress and the section currently in view highlighted. */
export default function SectionNav({ items }) {
  const navRef = useRef(null);
  const [active, setActive] = useState(items[0][0]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.3;
      let current = items[0][0];
      for (const [id] of items) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= line) current = id;
      }
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setActive(current);
      setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  // Keep the active link visible in the horizontally scrolling menu on narrow screens.
  useEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector(`[data-id="${active}"]`);
    if (!nav || !link || nav.scrollWidth <= nav.clientWidth) return;
    const target = link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    nav.scrollTo({ left: Math.max(0, target), behavior: reducedMotion ? "instant" : "smooth" });
  }, [active]);

  return (
    <nav className="section-nav" aria-label="Planner sections">
      <div className="section-nav-links page-width" ref={navRef}>
        {items.map(([id, label]) => (
          <a key={id} href={`#${id}`} data-id={id} aria-current={active === id ? "location" : undefined}>
            {label}
          </a>
        ))}
      </div>
      <div className="section-nav-progress" aria-hidden="true" style={{ transform: `scaleX(${progress})` }} />
    </nav>
  );
}
