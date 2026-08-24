import type {
  NormalizedProcurementRequest,
  ProcurementInputValidationResult,
  ProcurementObjectiveWeights,
  ProcurementRequest,
} from './model';

const DEFAULT_OBJECTIVE_WEIGHTS: ProcurementObjectiveWeights = {
  cost: 1,
  risk: 1,
  transitTime: 1,
  reliabilityPenalty: 1,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const addIssue = (
  issues: { path: string; message: string }[],
  path: string,
  message: string,
): void => {
  issues.push({ path, message });
};

export const validateProcurementRequest = (
  input: unknown,
): ProcurementInputValidationResult => {
  const issues: { path: string; message: string }[] = [];

  if (!isRecord(input)) {
    return {
      valid: false,
      issues: [{ path: 'request', message: 'A procurement request is required.' }],
    };
  }

  const request = input as Partial<ProcurementRequest>;
  const supplyGap = request.supplyGap;

  if (!isRecord(supplyGap)) {
    addIssue(issues, 'supplyGap', 'Supply gap is required.');
  } else {
    if (!isFiniteNumber(supplyGap.quantity) || supplyGap.quantity < 0) {
      addIssue(issues, 'supplyGap.quantity', 'Supply gap quantity must be a finite non-negative number.');
    }
    if (!nonEmptyString(supplyGap.unit)) {
      addIssue(issues, 'supplyGap.unit', 'Supply gap unit is required.');
    }
  }

  if (!Array.isArray(request.suppliers) || request.suppliers.length === 0) {
    addIssue(issues, 'suppliers', 'At least one supplier is required.');
  }
  if (!Array.isArray(request.routes) || request.routes.length === 0) {
    addIssue(issues, 'routes', 'At least one route is required.');
  }
  if (!Array.isArray(request.lanes)) {
    addIssue(issues, 'lanes', 'Supplier-route lanes must be an array.');
  }

  const supplierIds = new Set<string>();
  const routeIds = new Set<string>();
  const laneIds = new Set<string>();
  const supplierUnit = isRecord(supplyGap) && typeof supplyGap.unit === 'string'
    ? supplyGap.unit
    : null;

  if (Array.isArray(request.suppliers)) {
    request.suppliers.forEach((supplier, index) => {
      const path = `suppliers[${index}]`;
      if (!isRecord(supplier)) {
        addIssue(issues, path, 'Supplier must be an object.');
        return;
      }
      if (!nonEmptyString(supplier.supplierId)) addIssue(issues, `${path}.supplierId`, 'Supplier ID is required.');
      if (!nonEmptyString(supplier.name)) addIssue(issues, `${path}.name`, 'Supplier name is required.');
      if (!isFiniteNumber(supplier.capacity) || supplier.capacity < 0) addIssue(issues, `${path}.capacity`, 'Supplier capacity must be finite and non-negative.');
      if (!nonEmptyString(supplier.capacityUnit)) addIssue(issues, `${path}.capacityUnit`, 'Supplier capacity unit is required.');
      if (nonEmptyString(supplier.supplierId)) {
        if (supplierIds.has(supplier.supplierId)) addIssue(issues, `${path}.supplierId`, 'Supplier IDs must be unique.');
        supplierIds.add(supplier.supplierId);
      }
      if (supplierUnit && nonEmptyString(supplier.capacityUnit) && supplier.capacityUnit !== supplierUnit) {
        addIssue(issues, `${path}.capacityUnit`, `Supplier capacity unit must match supply gap unit (${supplierUnit}).`);
      }
    });
  }

  if (Array.isArray(request.routes)) {
    request.routes.forEach((route, index) => {
      const path = `routes[${index}]`;
      if (!isRecord(route)) {
        addIssue(issues, path, 'Route must be an object.');
        return;
      }
      if (!nonEmptyString(route.routeId)) addIssue(issues, `${path}.routeId`, 'Route ID is required.');
      if (!nonEmptyString(route.name)) addIssue(issues, `${path}.name`, 'Route name is required.');
      if (!isFiniteNumber(route.capacity) || route.capacity < 0) addIssue(issues, `${path}.capacity`, 'Route capacity must be finite and non-negative.');
      if (!nonEmptyString(route.capacityUnit)) addIssue(issues, `${path}.capacityUnit`, 'Route capacity unit is required.');
      if (nonEmptyString(route.routeId)) {
        if (routeIds.has(route.routeId)) addIssue(issues, `${path}.routeId`, 'Route IDs must be unique.');
        routeIds.add(route.routeId);
      }
      if (supplierUnit && nonEmptyString(route.capacityUnit) && route.capacityUnit !== supplierUnit) {
        addIssue(issues, `${path}.capacityUnit`, `Route capacity unit must match supply gap unit (${supplierUnit}).`);
      }
    });
  }

  let costUnit: string | null = null;
  if (Array.isArray(request.lanes)) {
    request.lanes.forEach((lane, index) => {
      const path = `lanes[${index}]`;
      if (!isRecord(lane)) {
        addIssue(issues, path, 'Lane must be an object.');
        return;
      }
      if (!nonEmptyString(lane.laneId)) addIssue(issues, `${path}.laneId`, 'Lane ID is required.');
      if (!nonEmptyString(lane.supplierId) || !supplierIds.has(lane.supplierId as string)) addIssue(issues, `${path}.supplierId`, 'Lane must reference a known supplier.');
      if (!nonEmptyString(lane.routeId) || !routeIds.has(lane.routeId as string)) addIssue(issues, `${path}.routeId`, 'Lane must reference a known route.');
      if (typeof lane.compatible !== 'boolean') addIssue(issues, `${path}.compatible`, 'Lane compatibility must be boolean.');
      if (!isFiniteNumber(lane.procurementCostPerUnit) || lane.procurementCostPerUnit < 0) addIssue(issues, `${path}.procurementCostPerUnit`, 'Procurement cost must be finite and non-negative.');
      if (!nonEmptyString(lane.procurementCostUnit)) addIssue(issues, `${path}.procurementCostUnit`, 'Procurement cost unit is required.');
      if (!isFiniteNumber(lane.transitTimeDays) || lane.transitTimeDays < 0) addIssue(issues, `${path}.transitTimeDays`, 'Transit time must be finite and non-negative.');
      if (!isFiniteNumber(lane.riskScore) || lane.riskScore < 0 || lane.riskScore > 100) addIssue(issues, `${path}.riskScore`, 'Risk score must be between 0 and 100.');
      if (!isFiniteNumber(lane.reliabilityScore) || lane.reliabilityScore < 0 || lane.reliabilityScore > 1) addIssue(issues, `${path}.reliabilityScore`, 'Reliability score must be between 0 and 1.');
      if (nonEmptyString(lane.laneId)) {
        if (laneIds.has(lane.laneId)) addIssue(issues, `${path}.laneId`, 'Lane IDs must be unique.');
        laneIds.add(lane.laneId);
      }
      if (nonEmptyString(lane.procurementCostUnit)) {
        if (costUnit === null) costUnit = lane.procurementCostUnit;
        else if (costUnit !== lane.procurementCostUnit) addIssue(issues, `${path}.procurementCostUnit`, `Procurement cost unit must match ${costUnit}.`);
      }
    });
  }

  const providedWeights = request.objectiveWeights;
  const weights = {
    ...DEFAULT_OBJECTIVE_WEIGHTS,
    ...(isRecord(providedWeights) ? providedWeights : {}),
  } as ProcurementObjectiveWeights;
  for (const key of Object.keys(DEFAULT_OBJECTIVE_WEIGHTS) as (keyof ProcurementObjectiveWeights)[]) {
    if (!isFiniteNumber(weights[key]) || weights[key] < 0) {
      addIssue(issues, `objectiveWeights.${key}`, 'Objective weights must be finite and non-negative.');
    }
  }

  if (issues.length > 0) return { valid: false, issues };

  return {
    valid: true,
    issues: [],
    request: {
      ...(request as ProcurementRequest),
      objectiveWeights: weights,
    },
  };
};
