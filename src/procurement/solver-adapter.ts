export interface LinearVariable {
  name: string;
  lowerBound: number;
  upperBound: number | null;
}

export interface LinearConstraint {
  name: string;
  coefficients: Record<string, number>;
  lowerBound: number | null;
  upperBound: number | null;
}

export interface LinearOptimizationModel {
  name: string;
  direction: 'MINIMIZE' | 'MAXIMIZE';
  variables: LinearVariable[];
  objectiveCoefficients: Record<string, number>;
  subjectTo: LinearConstraint[];
}

export interface SolverSolution {
  status: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'UNBOUNDED' | 'ERROR';
  objectiveValue: number;
  variables: Record<string, number>;
  solveTimeMs: number;
  rawStatus: number | null;
  error?: string;
}

export interface SolverAdapter {
  solve(model: LinearOptimizationModel): Promise<SolverSolution>;
}
