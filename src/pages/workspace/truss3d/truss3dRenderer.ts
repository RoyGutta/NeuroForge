/**
 * Three.js renderer for the spatial truss viewport. No React and no physics:
 * it draws a `Truss3dView` (already mapped from the solved model) with one
 * instanced cylinder mesh for members, one instanced sphere mesh for nodes,
 * instanced cones for supports and arrow helpers for loads. Geometry is
 * reused across updates and disposed on `dispose()`.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Truss3dView } from "./truss3dView";

export type Pick = { kind: "member" | "node"; index: number } | null;

export interface RendererOptions {
  onPick?(pick: Pick): void;
  onHover?(pick: Pick): void;
}

const UP = new THREE.Vector3(0, 1, 0);

export class Truss3dRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly memberGeometry = new THREE.CylinderGeometry(1, 1, 1, 10, 1, false);
  private readonly nodeGeometry = new THREE.SphereGeometry(1, 12, 10);
  private readonly supportGeometry = new THREE.ConeGeometry(1, 1.6, 4);
  private readonly memberMaterial = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.15 });
  private readonly nodeMaterial = new THREE.MeshStandardMaterial({ color: 0xc4d6ca, roughness: 0.6 });
  private readonly supportMaterial = new THREE.MeshStandardMaterial({ color: 0x94a29e, roughness: 0.8 });
  private members: THREE.InstancedMesh | null = null;
  private nodes: THREE.InstancedMesh | null = null;
  private supports: THREE.InstancedMesh | null = null;
  private loadArrows: THREE.ArrowHelper[] = [];
  private axes: THREE.AxesHelper | null = null;
  private grid: THREE.GridHelper | null = null;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private view: Truss3dView | null = null;
  private selected: Pick = null;
  private hovered: Pick = null;
  private frame = 0;
  private resizeObserver: ResizeObserver | null = null;
  private readonly tmpMatrix = new THREE.Matrix4();
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpDir = new THREE.Vector3();
  private readonly tmpScale = new THREE.Vector3();
  private readonly tmpColor = new THREE.Color();
  private memberColors: string[] = [];

  constructor(private readonly canvas: HTMLCanvasElement, private readonly opts: RendererOptions = {}) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
    this.camera.up.set(0, 0, 1);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.addEventListener("change", () => this.requestRender());
    this.scene.add(new THREE.HemisphereLight(0xdfe9e3, 0x0c1613, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(3, -4, 6);
    this.scene.add(key);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("click", this.onClick);
    canvas.addEventListener("pointerleave", () => this.setHover(null));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();
  }

  /** Draw a mapped view. Camera is fitted on the first call or when `fit` is true. */
  update(view: Truss3dView, options: { fit?: boolean; showAxes?: boolean; showGrid?: boolean } = {}) {
    const first = this.view === null;
    this.view = view;
    this.memberColors = view.members.map((m) => m.color);
    this.rebuildMembers(view);
    this.rebuildNodes(view);
    this.rebuildSupports(view);
    this.rebuildLoads(view);
    this.setOverlays(!!options.showAxes, !!options.showGrid, view.bounds.size);
    if (first || options.fit) this.fit(view);
    this.applyHighlights();
    this.requestRender();
  }

  resetCamera() {
    if (this.view) this.fit(this.view);
    this.requestRender();
  }

  setSelected(pick: Pick) {
    this.selected = pick;
    this.applyHighlights();
    this.requestRender();
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("click", this.onClick);
    this.controls.dispose();
    this.members?.dispose();
    this.nodes?.dispose();
    this.supports?.dispose();
    for (const a of this.loadArrows) a.dispose();
    this.memberGeometry.dispose();
    this.nodeGeometry.dispose();
    this.supportGeometry.dispose();
    this.memberMaterial.dispose();
    this.nodeMaterial.dispose();
    this.supportMaterial.dispose();
    this.axes?.dispose();
    this.grid?.dispose();
    this.renderer.dispose();
  }

  private fit(view: Truss3dView) {
    const c = view.bounds.center;
    const size = view.bounds.size;
    this.controls.target.set(c.x, c.y, c.z);
    // Distance so the structure's extent fits the narrower screen axis with a margin, then a fixed oblique direction.
    const halfFov = (this.camera.fov * Math.PI) / 360;
    const dist = (0.7 * size) / Math.tan(halfFov) / Math.min(this.camera.aspect, 1);
    const dir = new THREE.Vector3(-0.55, -0.75, 0.42).normalize();
    this.camera.position.set(c.x + dir.x * dist, c.y + dir.y * dist, c.z + dir.z * dist);
    this.camera.near = size / 100;
    this.camera.far = size * 50;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private rebuildMembers(view: Truss3dView) {
    const n = view.members.length;
    if (!this.members || this.members.count !== n) {
      if (this.members) {
        this.scene.remove(this.members);
        this.members.dispose();
      }
      this.members = new THREE.InstancedMesh(this.memberGeometry, this.memberMaterial, n);
      this.members.name = "members";
      this.scene.add(this.members);
    }
    view.members.forEach((m, k) => {
      this.tmpDir.set(m.to.x - m.from.x, m.to.y - m.from.y, m.to.z - m.from.z);
      const L = this.tmpDir.length();
      this.tmpPos.set((m.from.x + m.to.x) / 2, (m.from.y + m.to.y) / 2, (m.from.z + m.to.z) / 2);
      this.tmpQuat.setFromUnitVectors(UP, this.tmpDir.normalize());
      this.tmpScale.set(m.radius, L, m.radius);
      this.tmpMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
      this.members!.setMatrixAt(k, this.tmpMatrix);
      this.members!.setColorAt(k, this.tmpColor.set(m.color));
    });
    this.members.instanceMatrix.needsUpdate = true;
    if (this.members.instanceColor) this.members.instanceColor.needsUpdate = true;
  }

  private rebuildNodes(view: Truss3dView) {
    const n = view.nodes.length;
    if (!this.nodes || this.nodes.count !== n) {
      if (this.nodes) {
        this.scene.remove(this.nodes);
        this.nodes.dispose();
      }
      this.nodes = new THREE.InstancedMesh(this.nodeGeometry, this.nodeMaterial, n);
      this.nodes.name = "nodes";
      this.scene.add(this.nodes);
    }
    const r = view.bounds.size * 0.012;
    view.nodes.forEach((p, i) => {
      this.tmpMatrix.compose(this.tmpPos.set(p.x, p.y, p.z), this.tmpQuat.identity(), this.tmpScale.set(r, r, r));
      this.nodes!.setMatrixAt(i, this.tmpMatrix);
      this.nodes!.setColorAt(i, this.tmpColor.set(0xc4d6ca));
    });
    this.nodes.instanceMatrix.needsUpdate = true;
    if (this.nodes.instanceColor) this.nodes.instanceColor.needsUpdate = true;
  }

  private rebuildSupports(view: Truss3dView) {
    const items = view.supports.filter((s) => s.fixZ || s.fixX || s.fixY);
    if (!this.supports || this.supports.count !== items.length) {
      if (this.supports) {
        this.scene.remove(this.supports);
        this.supports.dispose();
      }
      this.supports = new THREE.InstancedMesh(this.supportGeometry, this.supportMaterial, items.length);
      this.scene.add(this.supports);
    }
    const s = view.bounds.size * 0.03;
    items.forEach((sup, i) => {
      const p = view.nodes[sup.node];
      // Cone apex at the node, pointing up (+z); fully fixed supports are drawn larger.
      const full = sup.fixX && sup.fixY && sup.fixZ ? 1.35 : 1;
      this.tmpQuat.setFromUnitVectors(UP, new THREE.Vector3(0, 0, 1));
      this.tmpMatrix.compose(this.tmpPos.set(p.x, p.y, p.z - s * 0.8 * full), this.tmpQuat, this.tmpScale.set(s * full, s * full, s * full));
      this.supports!.setMatrixAt(i, this.tmpMatrix);
    });
    this.supports.instanceMatrix.needsUpdate = true;
  }

  private rebuildLoads(view: Truss3dView) {
    for (const a of this.loadArrows) {
      this.scene.remove(a);
      a.dispose();
    }
    this.loadArrows = [];
    const maxF = Math.max(1e-9, ...view.loads.map((l) => l.magnitude_N));
    // Only the applied loads are drawn (self-weight is lumped at every node and would clutter the view).
    const applied = view.loads.filter((l) => l.magnitude_N >= 0.25 * maxF);
    for (const l of applied) {
      const p = view.nodes[l.node];
      const dir = new THREE.Vector3(l.fx_N, l.fy_N, l.fz_N).normalize();
      const len = view.bounds.size * (0.08 + 0.12 * (l.magnitude_N / maxF));
      const origin = new THREE.Vector3(p.x, p.y, p.z).addScaledVector(dir, -len);
      const arrow = new THREE.ArrowHelper(dir, origin, len, 0xf25f5c, len * 0.3, len * 0.15);
      this.scene.add(arrow);
      this.loadArrows.push(arrow);
    }
  }

  private setOverlays(showAxes: boolean, showGrid: boolean, size: number) {
    if (showAxes && !this.axes) {
      this.axes = new THREE.AxesHelper(size * 0.25);
      this.scene.add(this.axes);
    } else if (!showAxes && this.axes) {
      this.scene.remove(this.axes);
      this.axes.dispose();
      this.axes = null;
    }
    if (showGrid && !this.grid) {
      this.grid = new THREE.GridHelper(size * 2, 20, 0x283b2f, 0x1a2a22);
      this.grid.rotation.x = Math.PI / 2;
      if (this.view) this.grid.position.set(this.view.bounds.center.x, this.view.bounds.center.y, this.view.bounds.min.z - size * 0.02);
      this.scene.add(this.grid);
    } else if (!showGrid && this.grid) {
      this.scene.remove(this.grid);
      this.grid.dispose();
      this.grid = null;
    }
  }

  private applyHighlights() {
    if (!this.members || !this.view) return;
    this.view.members.forEach((_, k) => {
      const isSel = this.selected?.kind === "member" && this.selected.index === k;
      const isHov = this.hovered?.kind === "member" && this.hovered.index === k;
      this.members!.setColorAt(k, this.tmpColor.set(isSel ? "#f2d279" : isHov ? "#ffffff" : this.memberColors[k]));
    });
    if (this.members.instanceColor) this.members.instanceColor.needsUpdate = true;
    if (this.nodes) {
      this.view.nodes.forEach((_, i) => {
        const isSel = this.selected?.kind === "node" && this.selected.index === i;
        const isHov = this.hovered?.kind === "node" && this.hovered.index === i;
        this.nodes!.setColorAt(i, this.tmpColor.set(isSel ? "#f2d279" : isHov ? "#ffffff" : "#c4d6ca"));
      });
      if (this.nodes.instanceColor) this.nodes.instanceColor.needsUpdate = true;
    }
  }

  private pickAt(ev: PointerEvent | MouseEvent): Pick {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets: THREE.Object3D[] = [];
    if (this.nodes) targets.push(this.nodes);
    if (this.members) targets.push(this.members);
    const hits = this.raycaster.intersectObjects(targets, false);
    const hit = hits[0];
    if (!hit || hit.instanceId === undefined) return null;
    return { kind: hit.object === this.nodes ? "node" : "member", index: hit.instanceId };
  }

  private setHover(pick: Pick) {
    const same = pick?.kind === this.hovered?.kind && pick?.index === this.hovered?.index;
    if (same) return;
    this.hovered = pick;
    this.canvas.style.cursor = pick ? "pointer" : "grab";
    this.applyHighlights();
    this.opts.onHover?.(pick);
    this.requestRender();
  }

  private onPointerMove = (ev: PointerEvent) => this.setHover(this.pickAt(ev));
  private onClick = (ev: MouseEvent) => {
    const pick = this.pickAt(ev);
    this.selected = pick;
    this.applyHighlights();
    this.opts.onPick?.(pick);
    this.requestRender();
  };

  private resize() {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, el.clientWidth);
    const h = Math.max(1, el.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  private requestRender() {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      // Damping needs a few more frames after interaction.
      if (this.controls.enableDamping) {
        this.frame = requestAnimationFrame(() => this.renderer.render(this.scene, this.camera));
      }
    });
  }
}
