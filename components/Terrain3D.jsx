"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import survey from "@/lib/data/survey.json";
import terrain from "@/lib/data/terrain.json";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { canUseWebGL } from "@/lib/webgl";

const { width: W, height: H, min: MIN, max: MAX } = terrain;
const HALF_W = W / 2;
const HALF_H = H / 2;
const OVERVIEW = { position: new THREE.Vector3(-150, 165, 205), target: new THREE.Vector3(0, 0, 8) };
const COLORS = { detour: "#ecbb71", direct: "#f3e3c9", hazard: "#ed916e", history: "#a1dbe0", ink: "#f1ebdd" };

/** Map pixel coordinates (x east, y south) to world space on the terrain plane. */
const worldX = x => x - HALF_W;
const worldZ = y => y - HALF_H;

function densify(points, step = 1) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 0; k < n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
  }
  out.push(points[points.length - 1]);
  return out;
}

function sampler(heights) {
  // Bilinear elevation (m above the map minimum) at pixel-edge coordinates.
  return (x, y) => {
    const cx = Math.min(W - 1, Math.max(0, x - 0.5));
    const cy = Math.min(H - 1, Math.max(0, y - 0.5));
    const x0 = Math.floor(cx);
    const y0 = Math.floor(cy);
    const x1 = Math.min(W - 1, x0 + 1);
    const y1 = Math.min(H - 1, y0 + 1);
    const fx = cx - x0;
    const fy = cy - y0;
    const top = heights[y0 * W + x0] * (1 - fx) + heights[y0 * W + x1] * fx;
    const bottom = heights[y1 * W + x0] * (1 - fx) + heights[y1 * W + x1] * fx;
    return top * (1 - fy) + bottom * fy;
  };
}

function ribbonMaterial(color) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { color: { value: new THREE.Color(color) } },
    vertexShader: `
      attribute float lift;
      varying float vLift;
      void main() {
        vLift = lift;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 color;
      varying float vLift;
      void main() {
        gl_FragColor = vec4(color, (1.0 - vLift) * 0.55);
      }`,
  });
}

/** Vertical curtain along a path, used to mark the dune exclusion boundary. */
function curtain(points, heightAt, exaggeration, tall, material) {
  const positions = [];
  const lift = [];
  const index = [];
  points.forEach(([x, y], i) => {
    const ground = heightAt(x, y) * exaggeration;
    positions.push(worldX(x), ground, worldZ(y), worldX(x), ground + tall, worldZ(y));
    lift.push(0, 1);
    if (i > 0) {
      const a = (i - 1) * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("lift", new THREE.Float32BufferAttribute(lift, 1));
  geometry.setIndex(index);
  return new THREE.Mesh(geometry, material);
}

function tube(points, heightAt, exaggeration, radius, color, offset = 0.9) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y]) => new THREE.Vector3(worldX(x), heightAt(x, y) * exaggeration + offset, worldZ(y))),
    false, "centripetal", 0,
  );
  const geometry = new THREE.TubeGeometry(curve, Math.max(8, points.length * 2), radius, 8, false);
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, transparent: true }));
}

/** Split the hazard polygon into runs that are not on the map border. */
function hazardRuns() {
  const onEdge = ([x, y]) => x <= 0.01 || y <= 0.01 || x >= W - 0.01 || y >= H - 0.01;
  const ring = [...survey.hazard, survey.hazard[0]];
  const runs = [];
  let run = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    if (onEdge(a) && onEdge(b)) {
      if (run.length > 1) runs.push(run);
      run = [];
      continue;
    }
    if (!run.length) run.push(a);
    run.push(b);
  }
  if (run.length > 1) runs.push(run);
  return runs.map(item => densify(item, 1.5));
}

const LABELS = [
  ...survey.stops.map(stop => ({ key: stop.label, x: stop.x, y: stop.y, text: stop.label, kind: "stop" })),
  { key: "dune", x: survey.duneLabel[0], y: survey.duneLabel[1], text: "Namib Dune", kind: "dune" },
];

/**
 * Interactive 3D view of the 290 × 195 m survey area: the 1 m USGS elevation model draped with HiRISE
 * imagery, the dune exclusion zone, both routes and the profile position. Drag to orbit, scroll to zoom.
 */
export default function Terrain3D({ routeName, profileIndex, onInspect, layers }) {
  const hostRef = useRef(null);
  const labelRefs = useRef({});
  const apiRef = useRef(null);
  const propsRef = useRef({ routeName, profileIndex, onInspect, layers });
  const [status, setStatus] = useState(() => (canUseWebGL() ? "loading" : "unsupported"));
  const [exaggeration, setExaggeration] = useState(3);
  const [flying, setFlying] = useState(false);

  useEffect(() => {
    propsRef.current = { routeName, profileIndex, onInspect, layers };
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !canUseWebGL()) return undefined;
    const reduced = prefersReducedMotion();
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.className = "terrain-canvas";
    host.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#1a1814");
    scene.fog = new THREE.Fog("#1a1814", 380, 720);
    const camera = new THREE.PerspectiveCamera(38, 1, 1, 2000);
    camera.position.copy(OVERVIEW.position).multiplyScalar(1.9).setY(420);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(OVERVIEW.target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 35;
    controls.maxDistance = 520;
    controls.maxPolarAngle = 1.38;
    controls.screenSpacePanning = false;

    const sun = new THREE.DirectionalLight("#fff0dc", 2.6);
    sun.position.set(-160, 120, -60);
    scene.add(sun, new THREE.HemisphereLight("#ffe2c0", "#3a2a20", 0.9));

    const world = new THREE.Group();
    scene.add(world);
    const overlays = new THREE.Group();
    world.add(overlays);

    let heights = null;
    let heightAt = () => 0;
    let terrainMesh = null;
    let walker = null;
    let routeMeshes = {};
    let historyMesh = null;
    let hazardGroup = null;
    let currentExaggeration = 3;
    const hazardMaterial = ribbonMaterial(COLORS.hazard);
    let needsFrame = true;
    let visible = true;
    let frame = 0;
    let flight = null;
    const scratch = new THREE.Vector3();
    const invalidate = () => { needsFrame = true; };

    function resize() {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      invalidate();
    }

    function clearOverlays() {
      overlays.traverse(object => {
        object.geometry?.dispose();
        if (object.material && object.material !== hazardMaterial) object.material.dispose();
      });
      overlays.clear();
      routeMeshes = {};
    }

    function buildOverlays() {
      if (!heights) return;
      clearOverlays();
      const ex = currentExaggeration;
      const { routeName: active, layers: shown } = propsRef.current;

      hazardGroup = new THREE.Group();
      hazardRuns().forEach(run => {
        hazardGroup.add(curtain(run, heightAt, ex, 7, hazardMaterial));
        hazardGroup.add(tube(run, heightAt, ex, 0.35, COLORS.hazard, 0.3));
      });
      hazardGroup.visible = shown.hazard;
      overlays.add(hazardGroup);

      historyMesh = tube(densify(survey.history, 2), heightAt, ex, 0.45, COLORS.history, 0.6);
      historyMesh.material.opacity = 0.75;
      historyMesh.visible = shown.history;
      overlays.add(historyMesh);

      ["direct", "detour"].forEach(name => {
        const mesh = tube(densify(survey.routes[name].path, 1), heightAt, ex, name === "detour" ? 0.7 : 0.5, COLORS[name], 1.1);
        routeMeshes[name] = mesh;
        overlays.add(mesh);
      });
      styleRoutes(active);

      survey.stops.forEach(stop => {
        const ground = heightAt(stop.x, stop.y) * ex;
        const pin = new THREE.Group();
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 9, 8), new THREE.MeshBasicMaterial({ color: COLORS.ink }));
        stem.position.y = 4.5;
        const head = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), new THREE.MeshBasicMaterial({ color: COLORS.detour }));
        head.position.y = 9.5;
        pin.add(stem, head);
        pin.position.set(worldX(stop.x), ground, worldZ(stop.y));
        overlays.add(pin);
      });

      walker = new THREE.Group();
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 26, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0.22, depthWrite: false }),
      );
      beam.position.y = 13;
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.7, 24, 16), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
      body.position.y = 1.8;
      const glow = new THREE.Mesh(
        new THREE.RingGeometry(2.2, 3.4, 40),
        new THREE.MeshBasicMaterial({ color: COLORS.detour, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.4;
      walker.add(beam, body, glow);
      walker.userData.glow = glow;
      overlays.add(walker);
      placeWalker(propsRef.current.profileIndex);
      invalidate();
    }

    function styleRoutes(active) {
      Object.entries(routeMeshes).forEach(([name, mesh]) => {
        mesh.material.opacity = name === active ? 1 : 0.35;
        mesh.renderOrder = name === active ? 2 : 1;
      });
      invalidate();
    }

    function walkerPoint(index, name = propsRef.current.routeName) {
      const profile = survey.routes[name].profile;
      const clamped = Math.min(Math.max(0, index), profile.length - 1);
      const a = profile[Math.floor(clamped)];
      const b = profile[Math.ceil(clamped)];
      const f = clamped - Math.floor(clamped);
      const mix = k => a[k] + (b[k] - a[k]) * f;
      return new THREE.Vector3(worldX(mix(1)), (mix(3) - MIN) * currentExaggeration, worldZ(mix(2)));
    }

    function placeWalker(index) {
      if (!walker) return;
      walker.position.copy(walkerPoint(index));
      invalidate();
    }

    function setExaggerationValue(value) {
      currentExaggeration = value;
      if (terrainMesh) terrainMesh.scale.y = value;
      buildOverlays();
    }

    function placeLabels() {
      const { width, height } = renderer.domElement.getBoundingClientRect();
      LABELS.forEach(item => {
        const element = labelRefs.current[item.key];
        if (!element || !heights) return;
        const lift = item.kind === "stop" ? 12 : 10;
        scratch.set(worldX(item.x), heightAt(item.x, item.y) * currentExaggeration + lift, worldZ(item.y)).project(camera);
        const hidden = scratch.z > 1 || Math.abs(scratch.x) > 1.05 || Math.abs(scratch.y) > 1.05;
        element.style.opacity = hidden ? "0" : "1";
        element.style.transform = `translate(${((scratch.x + 1) / 2 * width).toFixed(1)}px, ${((1 - scratch.y) / 2 * height).toFixed(1)}px)`;
      });
    }

    function loop(time) {
      frame = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      const moved = controls.update();
      if (walker?.userData.glow && !reduced) {
        const pulse = (time / 1400) % 1;
        walker.userData.glow.scale.setScalar(1 + pulse * 1.6);
        walker.userData.glow.material.opacity = 0.8 * (1 - pulse);
        needsFrame = true;
      }
      if (!moved && !needsFrame && !flight) return;
      needsFrame = false;
      renderer.render(scene, camera);
      placeLabels();
    }

    function flyTo(position, target, duration = 1.6) {
      if (reduced) {
        camera.position.copy(position);
        controls.target.copy(target);
        invalidate();
        return null;
      }
      const timeline = gsap.timeline({ onUpdate: invalidate });
      timeline.to(camera.position, { x: position.x, y: position.y, z: position.z, duration, ease: "power3.inOut" }, 0);
      timeline.to(controls.target, { x: target.x, y: target.y, z: target.z, duration, ease: "power3.inOut" }, 0);
      return timeline;
    }

    /** Camera follows the walker from start to Gobabeb, keeping the profile chart in sync. */
    function walkRoute(done) {
      const name = propsRef.current.routeName;
      const profile = survey.routes[name].profile;
      const state = { t: 0 };
      controls.enabled = false;
      let last = -1;
      const ahead = new THREE.Vector3();
      const step = () => {
        const index = Math.round(state.t * (profile.length - 1));
        const here = walkerPoint(state.t * (profile.length - 1), name);
        const next = walkerPoint(Math.min(profile.length - 1, index + 14), name);
        ahead.subVectors(next, here).setY(0);
        if (ahead.lengthSq() < 0.01) ahead.set(0, 0, -1);
        ahead.normalize();
        camera.position.set(here.x - ahead.x * 52, here.y + 38, here.z - ahead.z * 52);
        controls.target.set(here.x + ahead.x * 10, here.y + 2, here.z + ahead.z * 10);
        if (walker) walker.position.copy(here);
        if (index !== last) {
          last = index;
          propsRef.current.onInspect?.(index);
        }
        invalidate();
      };
      const start = walkerPoint(0, name);
      flight = gsap.timeline({
        onComplete: () => {
          flight = null;
          controls.enabled = true;
          flyTo(OVERVIEW.position, OVERVIEW.target, 2);
          done();
        },
      });
      flight
        .to(camera.position, { x: start.x + 30, y: start.y + 26, z: start.z + 30, duration: 1.4, ease: "power2.inOut", onUpdate: invalidate })
        .to(controls.target, { x: start.x, y: start.y, z: start.z, duration: 1.4, ease: "power2.inOut" }, 0)
        .to(state, { t: 1, duration: Math.max(6, profile.length / 26), ease: "sine.inOut", onUpdate: step });
      return () => {
        flight?.kill();
        flight = null;
        controls.enabled = true;
      };
    }

    apiRef.current = {
      route: name => { styleRoutes(name); placeWalker(propsRef.current.profileIndex); },
      index: placeWalker,
      layers: shown => {
        if (hazardGroup) hazardGroup.visible = shown.hazard;
        if (historyMesh) historyMesh.visible = shown.history;
        invalidate();
      },
      exaggeration: setExaggerationValue,
      walk: walkRoute,
      reset: () => flyTo(OVERVIEW.position, OVERVIEW.target),
      flying: () => Boolean(flight),
    };

    const imagery = new THREE.TextureLoader().load("/data/imagery.webp", invalidate);
    imagery.colorSpace = THREE.SRGBColorSpace;
    imagery.anisotropy = renderer.capabilities.getMaxAnisotropy();

    let cancelled = false;
    fetch("/data/terrain.bin")
      .then(response => {
        if (!response.ok) throw new Error(`terrain ${response.status}`);
        return response.arrayBuffer();
      })
      .then(buffer => {
        if (cancelled) return;
        const raw = new Uint16Array(buffer);
        heights = new Float32Array(raw.length);
        raw.forEach((value, i) => { heights[i] = value ? (value - 1) / 65534 * (MAX - MIN) : 0; });
        heightAt = sampler(heights);

        const geometry = new THREE.PlaneGeometry(W - 1, H - 1, W - 1, H - 1);
        geometry.rotateX(-Math.PI / 2);
        const position = geometry.attributes.position;
        for (let i = 0; i < position.count; i++) position.setY(i, heights[i]);
        geometry.computeVertexNormals();
        terrainMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: imagery, roughness: 1, metalness: 0 }));
        terrainMesh.scale.y = currentExaggeration;

        // Skirt so the block reads as a slab of ground rather than a floating sheet.
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(W - 1, 6, H - 1),
          new THREE.MeshStandardMaterial({ color: "#3a2f25", roughness: 1 }),
        );
        base.position.y = -3.05;
        world.add(terrainMesh, base);
        buildOverlays();
        setStatus("ready");
        if (!reduced) {
          flyTo(OVERVIEW.position, OVERVIEW.target, 2.4);
        } else {
          camera.position.copy(OVERVIEW.position);
        }
      })
      .catch(() => { if (!cancelled) setStatus("error"); });

    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(host);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; invalidate(); });
    observer.observe(host);
    controls.addEventListener("change", invalidate);
    resize();
    frame = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      flight?.kill();
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(controls.target);
      sizeObserver.disconnect();
      observer.disconnect();
      controls.dispose();
      clearOverlays();
      scene.traverse(object => {
        object.geometry?.dispose();
        [object.material].flat().filter(Boolean).forEach(material => material.dispose());
      });
      hazardMaterial.dispose();
      imagery.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => { apiRef.current?.route(routeName); }, [routeName]);
  useEffect(() => { if (!apiRef.current?.flying()) apiRef.current?.index(profileIndex); }, [profileIndex]);
  useEffect(() => { apiRef.current?.layers(layers); }, [layers]);
  useEffect(() => { if (status === "ready") apiRef.current?.exaggeration(exaggeration); }, [exaggeration, status]);

  const walkRef = useRef(null);
  useEffect(() => () => walkRef.current?.(), []);
  const walk = () => {
    if (flying) {
      walkRef.current?.();
      walkRef.current = null;
      setFlying(false);
      apiRef.current?.reset();
      return;
    }
    setFlying(true);
    walkRef.current = apiRef.current?.walk(() => { walkRef.current = null; setFlying(false); });
  };

  return (
    <div className="terrain-3d" ref={hostRef} data-status={status}>
      <div className="terrain-labels" aria-hidden="true">
        {LABELS.map(item => (
          <span key={item.key} className={`terrain-label terrain-label-${item.kind}`} ref={node => { labelRefs.current[item.key] = node; }}>
            {item.text}
          </span>
        ))}
      </div>
      {status === "loading" && <p className="terrain-status">Building terrain…</p>}
      {status === "error" && <p className="terrain-status">The elevation model could not be loaded.</p>}
      {status === "unsupported" && <p className="terrain-status">3D view needs WebGL, which this browser has turned off.</p>}
      <div className="terrain-controls">
        <button type="button" onClick={walk} disabled={status !== "ready"} aria-pressed={flying}>
          {flying ? "■ Stop walk" : "▶ Walk the route"}
        </button>
        <button type="button" onClick={() => apiRef.current?.reset()} disabled={status !== "ready" || flying}>Overview</button>
        <label className="terrain-exaggeration">
          <span>Relief ×{exaggeration}</span>
          <input type="range" min={1} max={6} step={0.5} value={exaggeration} onChange={event => setExaggeration(Number(event.target.value))} />
        </label>
      </div>
      <p className="terrain-hint">Drag to orbit · scroll or pinch to zoom · right-drag to pan</p>
    </div>
  );
}
