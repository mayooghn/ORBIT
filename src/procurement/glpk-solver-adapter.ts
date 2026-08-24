import type GLPKFactory from 'glpk.js/node';
import type { LP } from 'glpk.js/node';
import type {
  LinearConstraint,
  LinearOptimizationModel,
  SolverAdapter,
  SolverSolution,
} from './solver-adapter';

type GlpkFactory = typeof GLPKFactory;

/**
 * glpk.js is ESM, while the ORBIT development/production server bundle is
 * CommonJS with external packages. In that combination Node exposes the
 * ESM namespace as the default export of the interop wrapper. Resolve both
 * shapes so the live API uses the same GLPK factory as the test runner.
 */
const loadGlpk = async (): Promise<GlpkFactory> => {
  const imported = await import('glpk.js/node') as unknown as {
    default?: unknown;
  };
  const candidate = imported.default;

  if (typeof candidate === 'function') {
    return candidate as GlpkFactory;
  }

  if (
    candidate &&
    typeof candidate === 'object' &&
    'default' in candidate &&
    typeof candidate.default === 'function'
  ) {
    return candidate.default as GlpkFactory;
  }

  throw new Error('GLPK module did not expose a callable factory.');
};

const toGlpkBounds = (
  glpk: Awaited<ReturnType<GlpkFactory>>,
  constraint: LinearConstraint,
): { type: number; lb: number; ub: number } => {
  if (
    constraint.lowerBound !== null &&
    constraint.upperBound !== null &&
    constraint.lowerBound === constraint.upperBound
  ) {
    return {
      type: glpk.GLP_FX,
      lb: constraint.lowerBound,
      ub: constraint.upperBound,
    };
  }

  if (constraint.upperBound !== null) {
    return {
      type: glpk.GLP_UP,
      lb: constraint.lowerBound ?? 0,
      ub: constraint.upperBound,
    };
  }

  return {
    type: glpk.GLP_LO,
    lb: constraint.lowerBound ?? 0,
    ub: 0,
  };
};

const toGlpkModel = (
  glpk: Awaited<ReturnType<GlpkFactory>>,
  model: LinearOptimizationModel,
): LP => ({
  name: model.name,
  objective: {
    direction:
      model.direction === 'MINIMIZE' ? glpk.GLP_MIN : glpk.GLP_MAX,
    name: 'objective',
    vars: Object.entries(model.objectiveCoefficients).map(
      ([name, coef]) => ({ name, coef }),
    ),
  },
  subjectTo: model.subjectTo.map((constraint) => ({
    name: constraint.name,
    vars: Object.entries(constraint.coefficients).map(
      ([name, coef]) => ({ name, coef }),
    ),
    bnds: toGlpkBounds(glpk, constraint),
  })),
  bounds: model.variables.map((variable) => ({
    name: variable.name,
    type: variable.upperBound === null ? glpk.GLP_LO : glpk.GLP_DB,
    lb: variable.lowerBound,
    ub: variable.upperBound ?? 0,
  })),
});

const mapStatus = (
  glpk: Awaited<ReturnType<GlpkFactory>>,
  status: number,
): SolverSolution['status'] => {
  if (status === glpk.GLP_OPT) return 'OPTIMAL';
  if (status === glpk.GLP_FEAS) return 'FEASIBLE';
  if (status === glpk.GLP_INFEAS || status === glpk.GLP_NOFEAS) {
    return 'INFEASIBLE';
  }
  // GLPK reports GLP_UNDEF when presolve proves that no usable solution
  // exists before a basic solution is available. For this bounded procurement
  // model that is an infeasible demand/capacity system, not a usable result.
  if (status === glpk.GLP_UNDEF) return 'INFEASIBLE';
  if (status === glpk.GLP_UNBND) return 'UNBOUNDED';
  return 'ERROR';
};

export class GlpkSolverAdapter implements SolverAdapter {
  async solve(model: LinearOptimizationModel): Promise<SolverSolution> {
    const startedAt = Date.now();

    // GLPK cannot construct a zero-column problem. In this model, the only
    // zero-variable case is a demand with no compatible supplier-route lane.
    // Classify it deterministically before crossing the solver boundary.
    if (model.variables.length === 0) {
      const demandConstraint = model.subjectTo.find(
        (constraint) => constraint.name === 'supply_gap',
      );
      const demand = demandConstraint?.lowerBound ?? 0;
      const feasible = demand === 0;

      return {
        status: feasible ? 'OPTIMAL' : 'INFEASIBLE',
        objectiveValue: 0,
        variables: {},
        solveTimeMs: Date.now() - startedAt,
        rawStatus: null,
        ...(feasible ? {} : { error: 'No compatible supplier-route lane can satisfy the supply gap.' }),
      };
    }

    try {
      const glpk = await (await loadGlpk())();
      const result = glpk.solve(toGlpkModel(glpk, model), {
        msglev: glpk.GLP_MSG_OFF,
        presol: true,
      });
      const status = mapStatus(glpk, result.result.status);

      return {
        status,
        objectiveValue:
          Number.isFinite(result.result.z) ? result.result.z : 0,
        variables: result.result.vars,
        solveTimeMs: Date.now() - startedAt,
        rawStatus: result.result.status,
        ...(status === 'ERROR'
          ? { error: `GLPK returned status ${result.result.status}.` }
          : {}),
      };
    } catch (error) {
      return {
        status: 'ERROR',
        objectiveValue: 0,
        variables: {},
        solveTimeMs: Date.now() - startedAt,
        rawStatus: null,
        error:
          error instanceof Error
            ? error.message
            : 'The GLPK solver failed.',
      };
    }
  }
}
