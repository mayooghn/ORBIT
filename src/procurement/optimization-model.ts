import type {
  LinearOptimizationModel,
  LinearConstraint,
} from './solver-adapter';
import type { NormalizedProcurementRequest } from './model';

export interface ProcurementOptimizationModel {
  linearModel: LinearOptimizationModel;
  laneVariableNames: Record<string, string>;
}

const variableNameForIndex = (index: number): string => `procurement_${index}`;

const buildConstraint = (
  name: string,
  coefficients: Record<string, number>,
  upperBound: number | null,
  lowerBound: number | null,
): LinearConstraint => ({
  name,
  coefficients,
  upperBound,
  lowerBound,
});

export const buildProcurementOptimizationModel = (
  request: NormalizedProcurementRequest,
): ProcurementOptimizationModel => {
  const compatibleLanes = request.lanes
    .filter((lane) => lane.compatible)
    .sort((left, right) => left.laneId.localeCompare(right.laneId));

  const laneVariableNames: Record<string, string> = {};
  const objectiveCoefficients: Record<string, number> = {};
  const variables = compatibleLanes.map((lane, index) => {
    const variableName = variableNameForIndex(index);
    laneVariableNames[lane.laneId] = variableName;
    objectiveCoefficients[variableName] =
      request.objectiveWeights.cost * lane.procurementCostPerUnit +
      request.objectiveWeights.risk * lane.riskScore +
      request.objectiveWeights.transitTime * lane.transitTimeDays +
      request.objectiveWeights.reliabilityPenalty *
        (1 - lane.reliabilityScore);

    return {
      name: variableName,
      lowerBound: 0,
      upperBound: null,
    };
  });

  const subjectTo: LinearConstraint[] = [
    buildConstraint(
      'supply_gap',
      Object.fromEntries(
        compatibleLanes.map((lane) => [
          laneVariableNames[lane.laneId],
          1,
        ]),
      ),
      request.supplyGap.quantity,
      request.supplyGap.quantity,
    ),
  ];

  for (const supplier of request.suppliers) {
    subjectTo.push(
      buildConstraint(
        `supplier_capacity_${supplier.supplierId}`,
        Object.fromEntries(
          compatibleLanes
            .filter((lane) => lane.supplierId === supplier.supplierId)
            .map((lane) => [laneVariableNames[lane.laneId], 1]),
        ),
        supplier.capacity,
        null,
      ),
    );
  }

  for (const route of request.routes) {
    subjectTo.push(
      buildConstraint(
        `route_capacity_${route.routeId}`,
        Object.fromEntries(
          compatibleLanes
            .filter((lane) => lane.routeId === route.routeId)
            .map((lane) => [laneVariableNames[lane.laneId], 1]),
        ),
        route.capacity,
        null,
      ),
    );
  }

  return {
    linearModel: {
      name: 'orbit_procurement_optimization',
      direction: 'MINIMIZE',
      variables,
      objectiveCoefficients,
      subjectTo,
    },
    laneVariableNames,
  };
};
