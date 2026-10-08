/** Spatial truss response model: the dimension-generic core with 3 DOFs per node. */
import type { EngineeringProblem } from "../../../core/problem";
import type { ResponseModel } from "../../domain";
import { createCoreTrussResponseModel, type CoreView } from "../truss/responseModelCore";
import { freeDofs3d } from "./model";
import { spaceTrussMass_kg, type SpaceTrussSpace } from "./spaceTrussSpace";

export function createSpaceTrussResponseModel(problem: EngineeringProblem, space: SpaceTrussSpace): ResponseModel {
  const free = freeDofs3d(space.buildModel(space.baselineParameters()));
  return createCoreTrussResponseModel({
    problem,
    dim: 3,
    free,
    view(params): CoreView {
      const model = space.buildModel(params);
      const loads = new Array<number>(3 * model.nodes.length).fill(0);
      for (const l of model.loads) {
        loads[3 * l.node] += l.fx_N;
        loads[3 * l.node + 1] += l.fy_N;
        loads[3 * l.node + 2] += l.fz_N;
      }
      return {
        dim: 3,
        nodeCount: model.nodes.length,
        coord: (n, a) => (a === 0 ? model.nodes[n].x : a === 1 ? model.nodes[n].y : model.nodes[n].z),
        members: model.members,
        loads,
        mass_kg: spaceTrussMass_kg(model),
      };
    },
  });
}
