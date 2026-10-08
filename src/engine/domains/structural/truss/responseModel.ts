/**
 * Planar truss response model: an adapter over the dimension-generic core
 * (`responseModelCore.ts`). Verified to reproduce the pre-refactor planar
 * response model bit for bit (tests/engine/domains/truss3d/domain.test.ts).
 */
import type { EngineeringProblem } from "../../../core/problem";
import type { ResponseModel } from "../../domain";
import type { BridgeSpace } from "./bridgeSpace";
import { freeDofsOf } from "./evaluate";
import { trussMass_kg } from "./metrics";
import { createCoreTrussResponseModel, type CoreView } from "./responseModelCore";

export function createTrussResponseModel(problem: EngineeringProblem, space: BridgeSpace): ResponseModel {
  const free = freeDofsOf(space.buildModel(space.baselineParameters()));
  return createCoreTrussResponseModel({
    problem,
    dim: 2,
    free,
    view(params): CoreView {
      const model = space.buildModel(params);
      const loads = new Array<number>(2 * model.nodes.length).fill(0);
      for (const l of model.loads) {
        loads[2 * l.node] += l.fx_N;
        loads[2 * l.node + 1] += l.fy_N;
      }
      return {
        dim: 2,
        nodeCount: model.nodes.length,
        coord: (n, a) => (a === 0 ? model.nodes[n].x : model.nodes[n].y),
        members: model.members,
        loads,
        mass_kg: trussMass_kg(model),
      };
    },
  });
}
