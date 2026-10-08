import { useEffect, useMemo, useRef } from "react";
import type { CoreSolution } from "../../../engine/domains/structural/truss/feaCore";
import type { Truss3dModel } from "../../../engine/domains/structural/truss3d/model";
import { Truss3dRenderer, type Pick } from "./truss3dRenderer";
import { buildTruss3dView, type Truss3dMode } from "./truss3dView";

export interface Truss3dViewportProps {
  model: Truss3dModel;
  result: CoreSolution;
  mode: Truss3dMode;
  safetyFactor: number;
  areaMax_m2: number;
  deformScale: number;
  showAxes: boolean;
  showGrid: boolean;
  selected: Pick;
  onPick(pick: Pick): void;
  /** Incremented by the parent to refit the camera. */
  fitToken: number;
  ariaLabel?: string;
}

/**
 * React shell around the three.js renderer. React owns state; the pure
 * mapping turns the solved model into drawable data; the renderer only
 * draws. The renderer instance lives for the component's lifetime and is
 * disposed on unmount.
 */
export function Truss3dViewport(p: Truss3dViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Truss3dRenderer | null>(null);
  const onPickRef = useRef(p.onPick);
  onPickRef.current = p.onPick;
  const view = useMemo(() => buildTruss3dView(p.model, p.result, { mode: p.mode, safetyFactor: p.safetyFactor, areaMax_m2: p.areaMax_m2, deformScale: p.deformScale }), [p.model, p.result, p.mode, p.safetyFactor, p.areaMax_m2, p.deformScale]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const r = new Truss3dRenderer(canvasRef.current, { onPick: (pick) => onPickRef.current(pick) });
    rendererRef.current = r;
    return () => {
      r.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.update(view, { showAxes: p.showAxes, showGrid: p.showGrid });
  }, [view, p.showAxes, p.showGrid]);

  useEffect(() => {
    rendererRef.current?.setSelected(p.selected);
  }, [p.selected]);

  const fitRef = useRef(p.fitToken);
  useEffect(() => {
    if (fitRef.current !== p.fitToken) {
      fitRef.current = p.fitToken;
      rendererRef.current?.resetCamera();
    }
  }, [p.fitToken]);

  return <canvas ref={canvasRef} className="three" role="img" aria-label={p.ariaLabel ?? "Spatial truss viewport"} />;
}
