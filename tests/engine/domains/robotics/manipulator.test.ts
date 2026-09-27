import { describe, expect, test } from "vitest";
import { forwardKinematics, inverseKinematics, isReachable } from "../../../../src/engine/domains/robotics/manipulator/kinematics";
import { jointTorques_Nm } from "../../../../src/engine/domains/robotics/manipulator/statics";
import { cantileverTipDeflection_m, cantileverTipSlope_rad, tubeSection } from "../../../../src/engine/domains/robotics/manipulator/beam";

const G = 9.80665;

describe("two-link planar kinematics", () => {
  test("forward kinematics of a straight horizontal arm reaches (L1 + L2, 0)", () => {
    const p = forwardKinematics(0.5, 0.3, 0, 0);
    expect(p.x).toBeCloseTo(0.8, 12);
    expect(p.y).toBeCloseTo(0, 12);
    const elbow = forwardKinematics(0.5, 0.3, Math.PI / 2, -Math.PI / 2);
    expect(elbow.x).toBeCloseTo(0.3, 12);
    expect(elbow.y).toBeCloseTo(0.5, 12);
  });

  test("inverse kinematics returns two elbow solutions inside the annulus, one on the boundary, none outside", () => {
    const sols = inverseKinematics(0.5, 0.3, 0.4, 0.3);
    expect(sols).toHaveLength(2);
    for (const s of sols) {
      const p = forwardKinematics(0.5, 0.3, s.theta1, s.theta2);
      expect(p.x).toBeCloseTo(0.4, 9);
      expect(p.y).toBeCloseTo(0.3, 9);
    }
    expect(sols[0].theta2).toBeCloseTo(-sols[1].theta2, 9);
    const boundary = inverseKinematics(0.5, 0.3, 0.8, 0);
    expect(boundary.length).toBeGreaterThanOrEqual(1);
    expect(boundary[0].theta2).toBeCloseTo(0, 9);
    expect(inverseKinematics(0.5, 0.3, 0.9, 0)).toHaveLength(0);
    expect(inverseKinematics(0.5, 0.3, 0.1, 0)).toHaveLength(0); // inside the inner annulus radius (L1 - L2 = 0.2)
    expect(isReachable(0.5, 0.3, 0.9, 0)).toBe(false);
    expect(isReachable(0.5, 0.3, 0.4, 0.3)).toBe(true);
  });
});

describe("static joint torques under gravity", () => {
  const arm = { L1_m: 0.5, L2_m: 0.3, m1_kg: 1.2, m2_kg: 0.8, payload_kg: 2 };

  test("horizontal arm: textbook lever arms (link mass at mid-span, payload at tip)", () => {
    const t = jointTorques_Nm({ ...arm, theta1: 0, theta2: 0 });
    const tau2 = G * (arm.m2_kg * arm.L2_m / 2 + arm.payload_kg * arm.L2_m);
    const tau1 = G * (arm.m1_kg * arm.L1_m / 2 + (arm.m2_kg + arm.payload_kg) * arm.L1_m) + tau2;
    expect(t.tau2).toBeCloseTo(tau2, 9);
    expect(t.tau1).toBeCloseTo(tau1, 9);
  });

  test("vertical arm carries no gravity torque; folded-back link cancels part of the moment", () => {
    const up = jointTorques_Nm({ ...arm, theta1: Math.PI / 2, theta2: 0 });
    expect(up.tau1).toBeCloseTo(0, 9);
    expect(up.tau2).toBeCloseTo(0, 9);
    const folded = jointTorques_Nm({ ...arm, theta1: 0, theta2: Math.PI });
    const tau2 = -G * (arm.m2_kg * arm.L2_m / 2 + arm.payload_kg * arm.L2_m);
    expect(folded.tau2).toBeCloseTo(tau2, 9);
    expect(Math.abs(folded.tau1)).toBeLessThan(Math.abs(jointTorques_Nm({ ...arm, theta1: 0, theta2: 0 }).tau1));
  });
});

describe("tubular cantilever links", () => {
  test("tube section area and second moment follow the annulus formulas", () => {
    const s = tubeSection(0.02, 0.8); // outer radius 20 mm, inner = 0.8 x outer
    const ri = 0.016;
    expect(s.area_m2).toBeCloseTo(Math.PI * (0.02 ** 2 - ri ** 2), 15);
    expect(s.secondMoment_m4).toBeCloseTo((Math.PI / 4) * (0.02 ** 4 - ri ** 4), 18);
    expect(s.outerRadius_m).toBe(0.02);
  });

  test("tip deflection and slope of a cantilever with a point load and a uniform load", () => {
    const E = 69e9;
    const I = 1e-8;
    const L = 0.5;
    const P = 20;
    const w = 6;
    expect(cantileverTipDeflection_m({ P_N: P, w_N_m: 0, L_m: L, EI: E * I })).toBeCloseTo((P * L ** 3) / (3 * E * I), 15);
    expect(cantileverTipDeflection_m({ P_N: 0, w_N_m: w, L_m: L, EI: E * I })).toBeCloseTo((w * L ** 4) / (8 * E * I), 15);
    expect(cantileverTipSlope_rad({ P_N: P, w_N_m: w, L_m: L, EI: E * I })).toBeCloseTo((P * L ** 2) / (2 * E * I) + (w * L ** 3) / (6 * E * I), 15);
  });
});
