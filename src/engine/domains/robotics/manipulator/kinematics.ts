/**
 * Planar two-link (RR) manipulator kinematics. Joint 1 at the origin, link
 * 1 of length L1, joint 2 at its end, link 2 of length L2; angles measured
 * from the +x axis (theta1 absolute, theta2 relative to link 1). Gravity is
 * along -y, so the plane is vertical.
 */

export interface JointAngles {
  theta1: number;
  theta2: number;
}

export function forwardKinematics(L1: number, L2: number, theta1: number, theta2: number): { x: number; y: number } {
  return {
    x: L1 * Math.cos(theta1) + L2 * Math.cos(theta1 + theta2),
    y: L1 * Math.sin(theta1) + L2 * Math.sin(theta1 + theta2),
  };
}

/** Reachable iff |L1 - L2| <= distance <= L1 + L2 (with a small tolerance). */
export function isReachable(L1: number, L2: number, x: number, y: number): boolean {
  const d = Math.hypot(x, y);
  const eps = 1e-9 * (L1 + L2);
  return d <= L1 + L2 + eps && d >= Math.abs(L1 - L2) - eps;
}

/**
 * Closed-form inverse kinematics. Returns the elbow-down and elbow-up
 * solutions (one solution when the target is on the workspace boundary,
 * none when unreachable).
 */
export function inverseKinematics(L1: number, L2: number, x: number, y: number): JointAngles[] {
  if (!isReachable(L1, L2, x, y)) return [];
  const d2 = x * x + y * y;
  let c2 = (d2 - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  c2 = Math.min(1, Math.max(-1, c2));
  const s2 = Math.sqrt(Math.max(0, 1 - c2 * c2));
  const solutions: JointAngles[] = [];
  for (const sign of s2 > 1e-12 ? [1, -1] : [1]) {
    const theta2 = Math.atan2(sign * s2, c2);
    const k1 = L1 + L2 * c2;
    const k2 = L2 * sign * s2;
    const theta1 = Math.atan2(y, x) - Math.atan2(k2, k1);
    solutions.push({ theta1, theta2 });
  }
  return solutions;
}
