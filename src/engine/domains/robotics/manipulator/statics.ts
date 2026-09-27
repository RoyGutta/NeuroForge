/**
 * Static joint torques of a planar two-link arm holding a payload against
 * gravity. Each link's mass acts at its mid-length; the payload acts at the
 * tip. Positive torque counteracts the gravity moment (right-hand rule about
 * +z with gravity along -y).
 *
 *   tau2 = g (m2 L2/2 + mp L2) cos(theta1 + theta2)
 *   tau1 = g [(m1 L1/2 + (m2 + mp) L1) cos(theta1)] + tau2
 */
export const GRAVITY_M_S2 = 9.80665;

export interface ArmStaticsInput {
  L1_m: number;
  L2_m: number;
  m1_kg: number;
  m2_kg: number;
  payload_kg: number;
  theta1: number;
  theta2: number;
}

export function jointTorques_Nm(a: ArmStaticsInput): { tau1: number; tau2: number } {
  const g = GRAVITY_M_S2;
  const tau2 = g * (a.m2_kg * a.L2_m * 0.5 + a.payload_kg * a.L2_m) * Math.cos(a.theta1 + a.theta2);
  const tau1 = g * (a.m1_kg * a.L1_m * 0.5 + (a.m2_kg + a.payload_kg) * a.L1_m) * Math.cos(a.theta1) + tau2;
  return { tau1, tau2 };
}
