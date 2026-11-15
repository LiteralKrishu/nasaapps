"use client";

import { gsap, ScrollTrigger, SplitText, useGSAP, MOTION_OK } from "@/lib/gsap";

const PANELS = ".traverse-panel, .detail-panel";

function countUp(element, delay) {
  const target = Number(element.dataset.count);
  const decimals = Number(element.dataset.decimals ?? 0);
  const { prefix = "", suffix = "" } = element.dataset;
  const state = { value: 0 };
  const write = () => { element.textContent = `${prefix}${state.value.toFixed(decimals)}${suffix}`; };
  write();
  return gsap.to(state, { value: target, duration: 1.6, delay, ease: "power2.out", onUpdate: write });
}

function heroIntro(onComplete) {
  const hero = document.querySelector(".hero");
  if (!hero) return;
  const timeline = gsap.timeline({ defaults: { ease: "expo.out", duration: 1.1 }, onComplete });
  const title = hero.querySelector('[data-intro="split"]');
  const split = title && SplitText.create(title, { type: "words,chars", mask: "words" });

  timeline
    .from(hero.querySelector(".location"), { autoAlpha: 0, y: 14, duration: 0.8 }, 0.1)
    .from(split?.chars ?? title, { yPercent: 115, rotate: 6, stagger: 0.035 }, 0.2)
    .from(hero.querySelector(".hero-lede"), { autoAlpha: 0, y: 22 }, 0.55)
    .from(hero.querySelectorAll(".hero-actions a"), { autoAlpha: 0, y: 18, stagger: 0.08 }, 0.7)
    .from(hero.querySelectorAll(".hero-stats > div"), { autoAlpha: 0, y: 24, stagger: 0.07 }, 0.8)
    .from(hero.querySelectorAll(".hero-missions li"), { autoAlpha: 0, y: 10, stagger: 0.04, duration: 0.6 }, 1.05)
    .from(hero.querySelector(".hero-hint"), { autoAlpha: 0, duration: 0.8 }, 1.6);
  hero.querySelectorAll("[data-count]").forEach((element, index) => countUp(element, 0.9 + index * 0.08));

  // Hero copy drifts up and fades as the page scrolls into the planner.
  gsap.to(hero.querySelectorAll(".hero-copy, .hero-stats, .hero-missions, .hero-hint"), {
    yPercent: -18, autoAlpha: 0.15, ease: "none",
    scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.4 },
  });
}

function magnetic(selector) {
  const cleanups = [...document.querySelectorAll(selector)].map(element => {
    const x = gsap.quickTo(element, "x", { duration: 0.5, ease: "power3.out" });
    const y = gsap.quickTo(element, "y", { duration: 0.5, ease: "power3.out" });
    const move = event => {
      const box = element.getBoundingClientRect();
      x((event.clientX - box.left - box.width / 2) * 0.25);
      y((event.clientY - box.top - box.height / 2) * 0.35);
    };
    const leave = () => { x(0); y(0); };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
    };
  });
  return () => cleanups.forEach(cleanup => cleanup());
}

/** Panels rise in as they enter; sections that mount later (lazy) are picked up too. */
function revealPanels() {
  const seen = new WeakSet();
  const prepare = () => {
    const fresh = [...document.querySelectorAll(PANELS)].filter(panel => !seen.has(panel));
    if (!fresh.length) return;
    fresh.forEach(panel => seen.add(panel));
    // Leave anything already on screen alone so deep links never flash.
    const below = fresh.filter(panel => panel.getBoundingClientRect().top > window.innerHeight * 0.92);
    gsap.set(below, { autoAlpha: 0, y: 48 });
    below.forEach(panel => gsap.set(panel.querySelectorAll(":scope > .detail-heading"), { autoAlpha: 0, y: 26 }));
    ScrollTrigger.batch(below, {
      start: "top 88%",
      once: true,
      onEnter: batch => {
        gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12, clearProps: "transform,opacity,visibility" });
        batch.forEach(panel => gsap.to(panel.querySelectorAll(":scope > .detail-heading"), {
          autoAlpha: 1, y: 0, duration: 1, delay: 0.15, clearProps: "transform,opacity,visibility",
        }));
      },
    });
    ScrollTrigger.refresh();
  };
  prepare();

  let pending = 0;
  const observer = new MutationObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(prepare);
  });
  const main = document.querySelector("main");
  if (main) observer.observe(main, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    cancelAnimationFrame(pending);
  };
}

/** Page-wide GSAP choreography; renders nothing. Everything is skipped under reduced motion. */
export default function Motion() {
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add(MOTION_OK, () => {
      // Magnetic buttons start after the intro so the two never fight over the same transform.
      let stopMagnetic = () => {};
      heroIntro(() => { stopMagnetic = magnetic(".hero-actions a"); });
      const stopReveal = revealPanels();
      document.documentElement.classList.remove("js-motion");
      return () => {
        stopReveal();
        stopMagnetic();
      };
    });
    document.documentElement.classList.remove("js-motion");
    return () => media.revert();
  });
  return null;
}
