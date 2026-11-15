"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { canUseWebGL } from "@/lib/webgl";

// Namib Dune, Gale Crater (planetocentric, east-positive).
const SITE = { lat: -4.7, lon: 137.4 };
const RAD = Math.PI / 180;
const FACE_SITE = -Math.PI / 2 - SITE.lon * RAD; // globe yaw that puts the site in front of the camera
const REST_YAW = FACE_SITE - 0.5; // rest a little to the side so the marker sits toward the copy
const TILT = 0.1;

function toVector(lat, lon, radius = 1) {
  return new THREE.Vector3(
    radius * Math.cos(lat * RAD) * Math.cos(lon * RAD),
    radius * Math.sin(lat * RAD),
    -radius * Math.cos(lat * RAD) * Math.sin(lon * RAD),
  );
}

const atmosphereShader = {
  uniforms: { glow: { value: new THREE.Color("#e8935c") }, power: { value: 2.4 } },
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform vec3 glow;
    uniform float power;
    varying vec3 vNormal;
    void main() {
      float intensity = pow(max(0.0, 0.66 - dot(vNormal, vec3(0.0, 0.0, 1.0))), power);
      gl_FragColor = vec4(glow, 1.0) * intensity * 0.75;
    }`,
};

const rimShader = {
  uniforms: { glow: { value: new THREE.Color("#ffc896") } },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      vec4 world = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vView = normalize(-world.xyz);
      gl_Position = projectionMatrix * world;
    }`,
  fragmentShader: `
    uniform vec3 glow;
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      float rim = pow(1.0 - max(0.0, dot(vNormal, vView)), 3.5);
      gl_FragColor = vec4(glow, rim * 0.35);
    }`,
};

function starField(count) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(30 + Math.random() * 30);
    positions.set([v.x, v.y, v.z], i * 3);
    sizes[i] = Math.random() ** 3 * 2.2 + 0.4;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { scale: { value: 1 } },
    vertexShader: `
      attribute float size;
      uniform float scale;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * scale;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      void main() {
        float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(vec3(1.0, 0.95, 0.88), smoothstep(0.5, 0.0, d) * 0.85);
      }`,
  });
  return new THREE.Points(geometry, material);
}

/** Rotating 3D Mars for the hero, with the Namib Dune landing site marked. Drag to spin. */
export default function MarsGlobe() {
  const hostRef = useRef(null);
  const labelRef = useRef(null);
  const [supported] = useState(canUseWebGL);

  useEffect(() => {
    const host = hostRef.current;
    const label = labelRef.current;
    if (!host || !supported) return undefined;
    const reduced = prefersReducedMotion();

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    camera.position.set(0, 0, 4.4);

    const sun = new THREE.DirectionalLight("#fff1e0", 3.6);
    sun.position.set(-3.2, 1.6, 2.4);
    scene.add(sun, new THREE.AmbientLight("#5a3a2c", 0.22));

    const stars = starField(1400);
    scene.add(stars);

    const globe = new THREE.Group();
    globe.rotation.set(TILT, REST_YAW, 0);
    scene.add(globe);

    const texture = new THREE.TextureLoader().load("/data/marsquake-basemap.webp", () => { invalidate(); });
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 64),
      new THREE.MeshStandardMaterial({
        map: texture, bumpMap: texture, bumpScale: 3.2, color: "#f0a67c", roughness: 0.95, metalness: 0,
      }),
    );
    globe.add(planet);
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.004, 96, 64),
      new THREE.ShaderMaterial({ ...rimShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    ));
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.12, 64, 48),
      new THREE.ShaderMaterial({ ...atmosphereShader, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    scene.add(atmosphere);

    // Landing-site marker: a bright core and an expanding ring, aligned to the surface.
    const sitePosition = toVector(SITE.lat, SITE.lon, 1.002);
    const marker = new THREE.Group();
    marker.position.copy(sitePosition);
    marker.lookAt(sitePosition.clone().multiplyScalar(2));
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.013, 24), new THREE.MeshBasicMaterial({ color: "#fff4dc" }));
    const ringMaterial = new THREE.MeshBasicMaterial({ color: "#ecbb71", transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.036, 48), ringMaterial);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.024, 48), new THREE.MeshBasicMaterial({ color: "#ecbb71", side: THREE.DoubleSide }));
    marker.add(core, ring, halo);
    globe.add(marker);

    // Interaction and motion state.
    const view = { yaw: REST_YAW, zoom: 0, lift: 0, spin: 0 };
    let velocity = 0;
    let drag = null;
    let returnTween = null;
    let visible = true;
    let frame = 0;
    let needsFrame = true;
    let lastTime = performance.now();
    let elapsed = 0;
    const worldSite = new THREE.Vector3();
    const toCamera = new THREE.Vector3();
    const projected = new THREE.Vector3();

    function invalidate() { needsFrame = true; }

    function resize() {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Keep the whole globe in frame on narrow, tall containers.
      camera.fov = camera.aspect < 1 ? 32 / Math.max(camera.aspect, 0.6) : 32;
      camera.updateProjectionMatrix();
      stars.material.uniforms.scale.value = renderer.getPixelRatio() * Math.min(1.4, height / 520);
      invalidate();
    }

    function placeLabel() {
      if (!label) return;
      marker.getWorldPosition(worldSite);
      toCamera.copy(camera.position).sub(worldSite).normalize();
      const facing = worldSite.clone().normalize().dot(toCamera);
      projected.copy(worldSite).project(camera);
      const { width, height } = renderer.domElement.getBoundingClientRect();
      const x = (projected.x + 1) / 2 * width;
      const y = (1 - projected.y) / 2 * height;
      label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      label.style.opacity = String(Math.max(0, Math.min(1, (facing - 0.15) * 4)));
    }

    function render() {
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += delta;
      const time = elapsed;
      if (!drag) {
        view.yaw += velocity * delta;
        velocity *= Math.pow(0.04, delta);
        if (Math.abs(velocity) < 0.002) velocity = 0;
      }
      const drift = reduced ? 0 : Math.sin(time * 0.18) * 0.16;
      globe.rotation.y = view.yaw + view.spin + drift;
      globe.rotation.x = TILT - view.lift * 0.25;
      camera.position.z = 4.4 - view.zoom * 1.5;
      camera.position.y = view.lift * 0.35;
      camera.lookAt(0, view.lift * 0.15, 0);
      stars.rotation.y = time * 0.004;

      const pulse = reduced ? 0.4 : (time * 0.55) % 1;
      ring.scale.setScalar(1 + pulse * 2.4);
      ringMaterial.opacity = (1 - pulse) * 0.9;

      renderer.render(scene, camera);
      placeLabel();
    }

    function loop() {
      frame = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      // Reduced motion: render only when something changed.
      if (reduced && !needsFrame && !drag && velocity === 0) return;
      needsFrame = false;
      render();
    }

    const returnToSite = () => {
      returnTween?.kill();
      // Take the shortest way back to the landing site.
      const turn = Math.PI * 2;
      const target = REST_YAW + Math.round((view.yaw - REST_YAW) / turn) * turn;
      returnTween = gsap.to(view, { yaw: target, duration: 2.2, ease: "power2.inOut", delay: 2.5, onUpdate: invalidate });
    };

    const canvas = renderer.domElement;
    const onPointerDown = event => {
      returnTween?.kill();
      drag = { x: event.clientX, yaw: view.yaw, last: event.clientX, time: performance.now() };
      velocity = 0;
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add("is-dragging");
    };
    const onPointerMove = event => {
      if (!drag) return;
      const width = canvas.getBoundingClientRect().width || 1;
      view.yaw = drag.yaw + (event.clientX - drag.x) / width * Math.PI * 1.4;
      const now = performance.now();
      const dt = Math.max(1, now - drag.time) / 1000;
      velocity = (event.clientX - drag.last) / width * Math.PI * 1.4 / dt;
      drag.last = event.clientX;
      drag.time = now;
      invalidate();
    };
    const onPointerUp = () => {
      if (!drag) return;
      drag = null;
      canvas.classList.remove("is-dragging");
      velocity = Math.max(-6, Math.min(6, velocity));
      returnToSite();
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; invalidate(); });
    observer.observe(host);
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(host);
    resize();

    // Intro: the planet spins into view and settles on Gale Crater.
    const ctx = gsap.context(() => {
      if (!reduced) {
        gsap.fromTo(view, { spin: -Math.PI * 1.15 }, { spin: 0, duration: 3.2, ease: "expo.out", delay: 0.15 });
        gsap.fromTo(host, { autoAlpha: 0, scale: 0.86 }, { autoAlpha: 1, scale: 1, duration: 1.8, ease: "power2.out" });
        gsap.from(marker.scale, { x: 0, y: 0, z: 0, duration: 0.9, delay: 2.2, ease: "back.out(2.5)" });
        gsap.fromTo(label, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, delay: 2.6 });
      }
      // Scrolling past the hero dives toward the landing site.
      gsap.to(view, {
        zoom: 1, lift: 1, ease: "none",
        scrollTrigger: {
          trigger: host.closest(".hero") ?? host, start: "top top", end: "bottom top", scrub: reduced ? true : 0.6,
          onUpdate: invalidate,
        },
      });
    });

    loop();

    return () => {
      cancelAnimationFrame(frame);
      ctx.revert();
      returnTween?.kill();
      observer.disconnect();
      sizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      scene.traverse(object => {
        object.geometry?.dispose();
        const materials = [object.material].flat().filter(Boolean);
        materials.forEach(material => material.dispose());
      });
      texture.dispose();
      renderer.dispose();
      canvas.remove();
      ScrollTrigger.refresh();
    };
  }, [supported]);

  if (!supported) return null;
  return (
    <div className="hero-globe" ref={hostRef} aria-hidden="true">
      <div className="globe-label" ref={labelRef}>
        <span className="globe-label-line"></span>
        <span className="globe-label-text"><strong>Gale Crater</strong>Namib Dune · 4.7° S 137.4° E</span>
      </div>
    </div>
  );
}
