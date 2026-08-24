import express, { type Express, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { createServer as createViteServer } from 'vite';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) loadEnvFile(envLocalPath);

import { fetchGoogleNews, getNewsIngestionStatus } from './src/services/dataIngestion/googleNews';
import { openPhase2Database } from './src/dataLayer/database';
import { Phase2Repository } from './src/dataLayer/repository';
import { createDigitalTwinRuntime, type DigitalTwinRuntime } from './src/digitalTwin/runtime';
import { isOperationalState } from './src/digitalTwin/state';
import type { OperationalState } from './src/digitalTwin/model';
import type {
  ActivityQuery,
  ConsumptionQuery,
  CrudeQuery,
  CountryQuery,
  GlobalOilQuery,
  PortQuery,
  RefineryQuery,
  SupplierQuery,
} from './src/dataLayer/repository';
import {
  createGeopoliticalRiskIntelligenceAgent,
  type GeopoliticalRiskAgent,
} from './src/geopoliticalEvents/agent';
import {
  createGroqAgentProvider,
  createGroqNewsProvider,
  GroqConfigurationError,
  GroqRateLimitError,
  GroqServiceError,
} from './src/geopoliticalEvents/groq';
import {
  DuplicateMonitoredEventError,
  ExternalCandidateBudgetExceededError,
  GeopoliticalMonitoringService,
  IrrelevantMonitoringCandidateError,
  MonitoringRefreshConfigurationError,
  MonitoringRefreshTriggerError,
  type ExternalMonitoringEventInput,
  type ExternalMonitoringScanInput,
} from './src/geopoliticalEvents/monitoring';

import { ScenarioEngine } from './src/scenarios/scenario-engine';
import { buildScenarioNodeList } from './src/scenarios/scenario-node-catalog';
import { SqliteScenarioBaselineProvider } from './src/scenarios/sqlite-baseline-provider';
import type { ScenarioInput } from './src/scenarios/model';
import {
  optimizeProcurement,
  buildProcurementRequestFromScenario,
  DemoScenarioProcurementDataProvider,
  SqliteScenarioProcurementDataProvider,
  validateProcurementRequest,
  type ScenarioProcurementDataProvider,
} from './src/procurement';
import {
  optimizeStrategicReserve,
  validateStrategicReserveInput,
  type StrategicReserveOptimizationInput,
} from './src/reserves';

const queryText = (
  request: Request,
  name: string,
): string | undefined => {
  const raw = request.query[name];

  return typeof raw === 'string' && raw.trim()
    ? raw.trim()
    : undefined;
};

const queryInteger = (
  request: Request,
  name: string,
  defaultValue?: number,
  min = 1,
  max = 2200,
): number | undefined => {
  const text = queryText(request, name);

  if (text === undefined) return defaultValue;

  const parsed = Number(text);

  if (
    !Number.isInteger(parsed) ||
    parsed < min ||
    parsed > max
  ) {
    return defaultValue;
  }

  return parsed;
};

const queryBoolean = (
  request: Request,
  name: string,
): boolean | undefined => {
  const text = queryText(request, name)?.toLowerCase();

  if (text === 'true') return true;
  if (text === 'false') return false;

  return undefined;
};

const listOptions = (
  request: Request,
  defaultPageSize = 50,
) => ({
  page: queryInteger(
    request,
    'page',
    1,
    1,
    100000,
  ),
  pageSize: queryInteger(
    request,
    'pageSize',
    defaultPageSize,
    1,
    1000,
  ),
});

const dateQuery = (
  request: Request,
  name: string,
): string | undefined => {
  const text = queryText(request, name);

  return text &&
    /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? text
    : undefined;
};

const handlePhase2Error = (
  response: Response,
  error: unknown,
): void => {
  console.error(
    '[ORBIT Phase 2] Data query failed:',
    error,
  );

  response.status(500).json({
    status: 'ERROR',
    error: 'Phase 2 data query failed.',
  });
};

const handleDigitalTwinError = (
  response: Response,
  error: unknown,
): void => {
  const message =
    error instanceof Error
      ? error.message
      : 'Digital Twin request failed.';

  const statusCode =
    message.includes('not found')
      ? 404
      : message.includes('not disrupted or blocked')
        ? 409
        : 400;

  response.status(statusCode).json({
    status: 'ERROR',
    error: message,
  });
};

const handleGeopoliticalAgentError = (
  response: Response,
  error: unknown,
): void => {
  const message =
    error instanceof Error
      ? error.message
      : 'Geopolitical risk agent request failed.';

  if (error instanceof GroqRateLimitError) {
    response.status(429).json({
      status: 'ERROR',
      code: 'GROQ_RATE_LIMITED',
      error: message,
      retryAfterMs: error.retryAfterMs,
      retryAt: error.retryAt,
    });

    return;
  }

  const statusCode =
    error instanceof GroqConfigurationError
      ? 503
      : error instanceof GroqServiceError
        ? 502
        : message.includes('Invalid geopolitical event') ||
            message.includes('request is required')
          ? 400
          : 500;

  response.status(statusCode).json({
    status: 'ERROR',
    error: message,
  });
};

const handleMonitoringError = (
  response: Response,
  error: unknown,
): void => {
  const message =
    error instanceof Error
      ? error.message
      : 'Geopolitical monitoring request failed.';

  if (error instanceof GroqRateLimitError) {
    response.status(429).json({
      status: 'ERROR',
      code: 'GROQ_RATE_LIMITED',
      error: message,
      retryAfterMs: error.retryAfterMs,
      retryAt: error.retryAt,
    });

    return;
  }

  if (error instanceof ExternalCandidateBudgetExceededError) {
    response.status(429).json({
      status: 'ERROR',
      code: 'EXTERNAL_CANDIDATE_BUDGET_EXCEEDED',
      error: message,
      maxCandidates: error.maxCandidates,
    });

    return;
  }

  const statusCode =
    error instanceof DuplicateMonitoredEventError
      ? 409
      : error instanceof IrrelevantMonitoringCandidateError
        ? 422
        : message.includes('required') ||
            message.includes('invalid')
          ? 400
          : 502;

  response.status(statusCode).json({
    status: 'ERROR',
    error: message,
  });
};

const handleMonitoringRefreshError = (
  response: Response,
  error: unknown,
): void => {
  const message = error instanceof Error ? error.message : 'External monitoring refresh failed.';
  const statusCode = error instanceof MonitoringRefreshConfigurationError ? 503 : error instanceof MonitoringRefreshTriggerError ? 502 : 500;
  response.status(statusCode).json({ status: 'ERROR', error: message });
};

type ScenarioInputParseResult =
  | { input: ScenarioInput }
  | { error: string };

const parseScenarioInput = (
  body: unknown,
): ScenarioInputParseResult => {
  const candidate = body as Partial<ScenarioInput> | undefined;

  if (
    typeof candidate?.eventId !== 'string' ||
    !candidate.eventId.trim()
  ) {
    return { error: 'eventId is required.' };
  }

  if (
    typeof candidate.durationDays !== 'number' ||
    !Number.isFinite(candidate.durationDays) ||
    candidate.durationDays <= 0
  ) {
    return {
      error: 'durationDays must be greater than zero.',
    };
  }

  if (
    candidate.severity !== 'LOW' &&
    candidate.severity !== 'MEDIUM' &&
    candidate.severity !== 'HIGH' &&
    candidate.severity !== 'CRITICAL'
  ) {
    return {
      error: 'severity must be LOW, MEDIUM, HIGH, or CRITICAL.',
    };
  }

  if (
    typeof candidate.affectedNodeId !== 'string' ||
    !candidate.affectedNodeId.trim()
  ) {
    return { error: 'affectedNodeId is required.' };
  }

  if (
    typeof candidate.capacityReductionPercent !== 'number' ||
    !Number.isFinite(candidate.capacityReductionPercent) ||
    candidate.capacityReductionPercent < 0 ||
    candidate.capacityReductionPercent > 100
  ) {
    return {
      error:
        'capacityReductionPercent must be between 0 and 100.',
    };
  }

  return {
    input: {
      eventId: candidate.eventId.trim(),
      durationDays: candidate.durationDays,
      severity: candidate.severity,
      affectedNodeId: candidate.affectedNodeId.trim(),
      capacityReductionPercent: candidate.capacityReductionPercent,
    },
  };
};

type ScenarioReserveAnalysisConfig = Pick<
  StrategicReserveOptimizationInput,
  'currentReserve' | 'demand' | 'replenishmentRate' | 'minimumReserveThreshold'
>;

const parseScenarioReserveAnalysis = (
  body: unknown,
):
  | { config: ScenarioReserveAnalysisConfig }
  | { error: string }
  | undefined => {
  if (!body || typeof body !== 'object' || !('reserveAnalysis' in body)) {
    return undefined;
  }

  const candidate = (body as { reserveAnalysis?: unknown }).reserveAnalysis;
  if (!candidate || typeof candidate !== 'object') {
    return { error: 'reserveAnalysis must be an object.' };
  }

  const value = candidate as Partial<ScenarioReserveAnalysisConfig>;
  const fields: Array<keyof ScenarioReserveAnalysisConfig> = [
    'currentReserve',
    'demand',
    'replenishmentRate',
    'minimumReserveThreshold',
  ];

  for (const field of fields) {
    if (
      typeof value[field] !== 'number' ||
      !Number.isFinite(value[field]) ||
      value[field] < 0
    ) {
      return {
        error: `reserveAnalysis.${field} must be a finite, non-negative number.`,
      };
    }
  }

  return { config: value as ScenarioReserveAnalysisConfig };
};

const readStateUpdate = (
  request: Request,
):
  | {
      nodeId: string;
      state: OperationalState;
    }
  | {
      error: string;
    } => {
  const body = request.body as
    | {
        nodeId?: unknown;
        state?: unknown;
      }
    | undefined;

  const nodeId =
    typeof body?.nodeId === 'string'
      ? body.nodeId.trim()
      : '';

  if (!nodeId) {
    return {
      error: 'nodeId is required.',
    };
  }

  if (!isOperationalState(body?.state)) {
    return {
      error:
        'state must be one of: operational, reduced, disrupted, blocked.',
    };
  }

  return {
    nodeId,
    state: body.state,
  };
};

const stateSummary = (
  nodes: Array<{
    operationalState: string;
  }>,
) => {
  const counts: Record<string, number> = {
    operational: 0,
    reduced: 0,
    disrupted: 0,
    blocked: 0,
  };

  for (const node of nodes) {
    counts[node.operationalState] =
      (counts[node.operationalState] || 0) + 1;
  }

  return {
    nodeCount: nodes.length,
    byState: counts,
  };
};

export const createApp = (
  repository: Phase2Repository,
  digitalTwin: DigitalTwinRuntime =
    createDigitalTwinRuntime(repository),
  geopoliticalRiskAgent: GeopoliticalRiskAgent =
    createGeopoliticalRiskIntelligenceAgent(
      digitalTwin,
      createGroqAgentProvider(),
  ),
  monitoring?: GeopoliticalMonitoringService,
  scenarioProcurementDataProvider?: ScenarioProcurementDataProvider,
): Express => {
  const app = express();

  app.use(express.json());

  // ============================================================
  // PHASE 5 SCENARIO ENGINE
  // ============================================================

  const scenarioBaselineProvider =
    new SqliteScenarioBaselineProvider(repository);

  const scenarioEngine =
    new ScenarioEngine(
      scenarioBaselineProvider,
    );

  const procurementDataProvider =
    scenarioProcurementDataProvider ??
    new SqliteScenarioProcurementDataProvider(repository);
  const demoProcurementDataProvider =
    new DemoScenarioProcurementDataProvider();

  // ============================================================
  // HEALTH
  // ============================================================

  app.get('/api/health', (_request, response) => {
    response.json({
      status: 'AVAILABLE',
      service: 'ORBIT application server',
      phase:
        'Phase 2 - Real Data Ingestion and Data Layer',
      timestamp: new Date().toISOString(),

      capabilities: {
        authentication: 'READY',
        newsIngestion:
          getNewsIngestionStatus(),
        phase2DataLayer:
          repository.getStatus(),
        digitalTwin: 'NOT_CONNECTED',
        mlInference: 'NOT_CONNECTED',
        geminiAssistant: 'NOT_CONNECTED',
      },
    });
  });

  // ============================================================
  // NEWS
  // ============================================================

  app.get('/api/news', async (_request, response) => {
    try {
      response.json(
        await fetchGoogleNews(),
      );
    } catch (error) {
      console.error(
        '[ORBIT News] Ingestion failed unexpectedly:',
        error,
      );

      response.json({
        status: 'ERROR',
        source: 'Google News RSS',
        retrievedAt:
          new Date().toISOString(),
        count: 0,
        articles: [],
      });
    }
  });

  // ============================================================
  // GEOPOLITICAL RISK AGENT
  // ============================================================

  app.post(
    '/api/geopolitical-risk/agent',
    async (request, response) => {
      const body = request.body as
        | {
            request?: unknown;
          }
        | undefined;

      if (
        typeof body?.request !== 'string' ||
        !body.request.trim()
      ) {
        response.status(400).json({
          status: 'ERROR',
          error: 'request is required.',
        });

        return;
      }

      try {
        response.json({
          status: 'AVAILABLE',
          ...(await geopoliticalRiskAgent.analyze(
            body.request,
          )),
        });
      } catch (error) {
        handleGeopoliticalAgentError(
          response,
          error,
        );
      }
    },
  );

  // ============================================================
  // GEOPOLITICAL MONITORING
  // ============================================================

  app.get(
    '/api/geopolitical-risk/monitor/status',
    (_request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: 'ERROR',
          error:
            'Geopolitical monitoring is not configured.',
        });

        return;
      }

      response.json({
        status: 'AVAILABLE',
        monitoring:
          monitoring.getStatus(),
      });
    },
  );

  app.post(
    '/api/geopolitical-risk/monitor/refresh',
    async (_request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: 'ERROR',
          error: 'Geopolitical monitoring is not configured.',
        });
        return;
      }

      try {
        const refresh = await monitoring.triggerExternalRefresh();
        response.status(202).json({ status: 'TRIGGERED', refresh });
      } catch (error) {
        handleMonitoringRefreshError(response, error);
      }
    },
  );

  app.post(
    '/api/geopolitical-risk/monitor/scans',
    (request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: 'ERROR',
          error: 'Geopolitical monitoring is not configured.',
        });
        return;
      }

      try {
        const scan = monitoring.recordExternalScan(request.body as ExternalMonitoringScanInput);
        response.status(201).json({ status: 'AVAILABLE', scan });
      } catch (error) {
        handleMonitoringError(response, error);
      }
    },
  );

  app.get(
    '/api/geopolitical-risk/monitor/events',
    (request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: 'ERROR',
          error:
            'Geopolitical monitoring is not configured.',
        });

        return;
      }

      const limit =
        queryInteger(
          request,
          'limit',
          50,
          1,
          200,
        ) || 50;

      const events =
        monitoring.getEvents(limit);

      response.json({
        status: 'AVAILABLE',
        count: events.length,
        events,
      });
    },
  );

  app.get(
    '/api/geopolitical-risk/monitor/alerts',
    (request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: 'ERROR',
          error:
            'Geopolitical monitoring is not configured.',
        });

        return;
      }

      const limit =
        queryInteger(
          request,
          'limit',
          50,
          1,
          200,
        ) || 50;

      const alerts =
        monitoring.getAlerts(limit);

      response.json({
        status: 'AVAILABLE',
        count: alerts.length,
        alerts,
      });
    },
  );

  app.get(
    '/api/geopolitical-risk/monitor/relevant-events',
    (request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: 'ERROR',
          error:
            'Geopolitical monitoring is not configured.',
        });

        return;
      }

      const limit =
        queryInteger(
          request,
          'limit',
          50,
          1,
          200,
        ) || 50;

      const events =
        monitoring.getRelevantEvents(limit);

      response.json({
        status: 'AVAILABLE',
        count: events.length,
        events,
      });
    },
  );

  app.get(
    '/api/geopolitical-risk/monitor/alerts/high',
    (request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: 'ERROR',
          error:
            'Geopolitical monitoring is not configured.',
        });

        return;
      }

      const limit =
        queryInteger(
          request,
          'limit',
          50,
          1,
          200,
        ) || 50;

      const alerts =
        monitoring.getHighRiskAlerts(limit);

      response.json({
        status: 'AVAILABLE',
        count: alerts.length,
        alerts,
      });
    },
  );

  app.get(
    '/api/geopolitical-risk/monitor/alerts/critical',
    (request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: 'ERROR',
          error:
            'Geopolitical monitoring is not configured.',
        });

        return;
      }

      const limit =
        queryInteger(
          request,
          'limit',
          50,
          1,
          200,
        ) || 50;

      const alerts =
        monitoring.getCriticalAlerts(limit);

      response.json({
        status: 'AVAILABLE',
        count: alerts.length,
        alerts,
      });
    },
  );

  app.post(
    '/api/geopolitical-risk/monitor/events',
    async (request, response) => {
      if (!monitoring) {
        response.status(503).json({
          status: 'ERROR',
          error:
            'Geopolitical monitoring is not configured.',
        });

        return;
      }

      try {
        const record =
          await monitoring.ingestExternal(
            request.body as ExternalMonitoringEventInput,
          );

        response.status(201).json({
          status: 'AVAILABLE',
          event: record,
          alert:
            record.alertLevel === 'high' ||
            record.alertLevel === 'critical',
        });
      } catch (error) {
        handleMonitoringError(
          response,
          error,
        );
      }
    },
  );

  // ============================================================
  // PHASE 5 SCENARIO SIMULATION API
  // ============================================================

  app.get(
    '/api/scenarios/nodes',
    (_request, response) => {
      try {
        const nodeList = buildScenarioNodeList(
          digitalTwin.stateEngine.getCurrentTwin(),
          scenarioBaselineProvider,
        );

        response.json(nodeList);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Scenario node list unavailable.';

        response.status(500).json({
          status: 'ERROR',
          error: message,
        });
      }
    },
  );

  app.post(
    '/api/scenarios/simulate',
    (request, response) => {
      const body =
        request.body as
          | Partial<ScenarioInput>
          | undefined;

      if (
        typeof body?.eventId !== 'string' ||
        !body.eventId.trim()
      ) {
        response.status(400).json({
          status: 'ERROR',
          error: 'eventId is required.',
        });

        return;
      }

      if (
        typeof body.durationDays !== 'number' ||
        !Number.isFinite(body.durationDays) ||
        body.durationDays <= 0
      ) {
        response.status(400).json({
          status: 'ERROR',
          error:
            'durationDays must be greater than zero.',
        });

        return;
      }

      if (
        body.severity !== 'LOW' &&
        body.severity !== 'MEDIUM' &&
        body.severity !== 'HIGH' &&
        body.severity !== 'CRITICAL'
      ) {
        response.status(400).json({
          status: 'ERROR',
          error:
            'severity must be LOW, MEDIUM, HIGH, or CRITICAL.',
        });

        return;
      }

      if (
        typeof body.affectedNodeId !== 'string' ||
        !body.affectedNodeId.trim()
      ) {
        response.status(400).json({
          status: 'ERROR',
          error:
            'affectedNodeId is required.',
        });

        return;
      }

      if (
        typeof body.capacityReductionPercent !==
          'number' ||
        !Number.isFinite(
          body.capacityReductionPercent,
        ) ||
        body.capacityReductionPercent < 0 ||
        body.capacityReductionPercent > 100
      ) {
        response.status(400).json({
          status: 'ERROR',
          error:
            'capacityReductionPercent must be between 0 and 100.',
        });

        return;
      }

      const reserveAnalysis = parseScenarioReserveAnalysis(request.body);
      if (reserveAnalysis && 'error' in reserveAnalysis) {
        response.status(400).json({
          status: 'ERROR',
          error: reserveAnalysis.error,
        });

        return;
      }
      const reserveConfig = reserveAnalysis && 'config' in reserveAnalysis
        ? reserveAnalysis.config
        : undefined;

      try {
        const input: ScenarioInput = {
          eventId:
            body.eventId.trim(),

          durationDays:
            body.durationDays,

          severity:
            body.severity,

          affectedNodeId:
            body.affectedNodeId.trim(),

          capacityReductionPercent:
            body.capacityReductionPercent,
        };

        const result =
          scenarioEngine.run(
            digitalTwin.stateEngine,
            input,
          );

        const reserveOptimization = reserveConfig
          ? (() => {
              if (result.shortageUnit === 'unavailable') {
                return {
                  status: 'UNAVAILABLE' as const,
                  error:
                    'Strategic reserve analysis is unavailable because the scenario supply gap is not verified.',
                };
              }

              const reserveInput: StrategicReserveOptimizationInput = {
                ...reserveConfig,
                supplyGap: result.shortage,
                disruptionDuration: result.input.durationDays,
                alternativeProcurement: result.alternativeCapacity,
              };
              const reserve = optimizeStrategicReserve(reserveInput);
              repository.saveStrategicReserveOptimization(
                reserveInput,
                reserve,
              );
              return { status: 'AVAILABLE' as const, reserve };
            })()
          : undefined;

        response.json({
          status: 'AVAILABLE',
          scenario: result,
          ...(reserveOptimization ? { reserveOptimization } : {}),
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Scenario simulation failed.';

        const statusCode =
          message.includes('not found')
            ? 404
            : message.includes('required') ||
                message.includes('must be') ||
                message.includes('between')
              ? 400
              : 500;

        response.status(statusCode).json({
          status: 'ERROR',
          error: message,
        });
      }
    },
  );

  // ============================================================
  // PHASE 8 STRATEGIC RESERVE OPTIMIZATION
  // ============================================================

  app.post(
    '/api/reserves/optimize',
    (request, response) => {
      const validation = validateStrategicReserveInput(request.body);

      if (!validation.valid || !validation.input) {
        response.status(400).json({
          status: 'ERROR',
          error: 'Invalid strategic reserve optimization request.',
          issues: validation.issues,
        });

        return;
      }

      try {
        const reserve = optimizeStrategicReserve(validation.input);
        repository.saveStrategicReserveOptimization(
          validation.input,
          reserve,
        );
        response.json({
          status: 'AVAILABLE',
          reserve,
        });
      } catch (error) {
        console.error(
          '[ORBIT Strategic Reserve] Optimization failed:',
          error,
        );
        response.status(500).json({
          status: 'ERROR',
          error: 'Strategic reserve optimization failed.',
        });
      }
    },
  );

  // ============================================================
  // PHASE 7 SCENARIO-TO-PROCUREMENT INTEGRATION
  // ============================================================

  app.post(
    '/api/scenarios/procurement',
    async (request, response) => {
      const parsedInput = parseScenarioInput(request.body);

      if ('error' in parsedInput) {
        response.status(400).json({
          status: 'ERROR',
          error: parsedInput.error,
        });

        return;
      }

      try {
        const scenario = scenarioEngine.run(
          digitalTwin.stateEngine,
          parsedInput.input,
        );
        const resolution = buildProcurementRequestFromScenario(
          scenario,
          digitalTwin.stateEngine.getCurrentTwin(),
          request.query.dataSource === 'demo'
            ? demoProcurementDataProvider
            : procurementDataProvider,
        );

        if (
          resolution.status === 'UNAVAILABLE' ||
          !resolution.request
        ) {
          response.status(422).json({
            status: 'UNAVAILABLE',
            error: resolution.reason || 'Procurement data is unavailable.',
            source: resolution.source,
            scenario,
          });

          return;
        }

        const procurement = await optimizeProcurement(
          resolution.request,
        );

        if (procurement.status === 'INFEASIBLE') {
          response.status(200).json({
            status: 'INFEASIBLE',
            scenario,
            procurement,
            source: resolution.source,
          });

          return;
        }

        if (procurement.status === 'OPTIMAL') {
          response.status(200).json({
            status: 'OPTIMAL',
            scenario,
            procurement,
            source: resolution.source,
          });

          return;
        }

        console.error(
          '[ORBIT Scenario Procurement] Optimization returned an internal error:',
          procurement.error,
        );
        response.status(500).json({
          status: 'ERROR',
          error: 'Scenario procurement optimization failed.',
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Scenario procurement integration failed.';
        const statusCode =
          message.includes('not found')
            ? 404
            : 500;

        console.error(
          '[ORBIT Scenario Procurement] Integration failed:',
          error,
        );
        response.status(statusCode).json({
          status: 'ERROR',
          error: message,
        });
      }
    },
  );

  // ============================================================
  // PHASE 7 PROCUREMENT OPTIMIZATION
  // ============================================================

  app.post(
    '/api/procurement/optimize',
    async (request, response) => {
      const validation = validateProcurementRequest(request.body);

      if (!validation.valid || !validation.request) {
        response.status(400).json({
          status: 'ERROR',
          error: 'Invalid procurement request.',
          issues: validation.issues,
        });

        return;
      }

      try {
        const result = await optimizeProcurement(validation.request);

        if (result.status === 'INFEASIBLE') {
          response.status(200).json({
            status: 'INFEASIBLE',
            procurement: result,
          });

          return;
        }

        if (result.status === 'OPTIMAL') {
          response.status(200).json({
            status: 'OPTIMAL',
            procurement: result,
          });

          return;
        }

        console.error(
          '[ORBIT Procurement] Optimization returned an internal error:',
          result.error,
        );
        response.status(500).json({
          status: 'ERROR',
          error: 'Procurement optimization failed.',
        });
      } catch (error) {
        console.error(
          '[ORBIT Procurement] Optimization failed unexpectedly:',
          error,
        );
        response.status(500).json({
          status: 'ERROR',
          error: 'Procurement optimization failed unexpectedly.',
        });
      }
    },
  );

  // ============================================================
  // DIGITAL TWIN
  // ============================================================

  app.get(
    '/api/digital-twin',
    (_request, response) => {
      try {
        const graph =
          digitalTwin.stateEngine.getCurrentTwin();

        response.json({
          status: 'AVAILABLE',
          graph,
        });
      } catch (error) {
        handleDigitalTwinError(
          response,
          error,
        );
      }
    },
  );

  app.get(
    '/api/digital-twin/state/:nodeId',
    (request, response) => {
      try {
        response.json({
          status: 'AVAILABLE',
          state:
            digitalTwin.stateEngine.getCurrentNodeState(
              request.params.nodeId,
            ),
        });
      } catch (error) {
        handleDigitalTwinError(
          response,
          error,
        );
      }
    },
  );

  app.post(
    '/api/digital-twin/state',
    (request, response) => {
      const update =
        readStateUpdate(request);

      if ('error' in update) {
        response.status(400).json({
          status: 'ERROR',
          error: update.error,
        });

        return;
      }

      try {
        response.json({
          status: 'AVAILABLE',
          state:
            digitalTwin.stateEngine.updateNodeState(
              update.nodeId,
              update.state,
            ),
        });
      } catch (error) {
        handleDigitalTwinError(
          response,
          error,
        );
      }
    },
  );

  app.post(
    '/api/digital-twin/reset',
    (_request, response) => {
      try {
        const graph =
          digitalTwin.stateEngine.resetToBaseline();

        response.json({
          status: 'AVAILABLE',
          graph,
          summary: stateSummary(
            graph.nodes,
          ),
        });
      } catch (error) {
        handleDigitalTwinError(
          response,
          error,
        );
      }
    },
  );

  app.post(
    '/api/digital-twin/impact',
    (request, response) => {
      const body =
        request.body as
          | {
              nodeId?: unknown;
            }
          | undefined;

      const nodeId =
        typeof body?.nodeId === 'string'
          ? body.nodeId.trim()
          : '';

      if (!nodeId) {
        response.status(400).json({
          status: 'ERROR',
          error: 'nodeId is required.',
        });

        return;
      }

      try {
        response.json({
          status: 'AVAILABLE',
          impact:
            digitalTwin.impactAnalyzer.analyzeNode(
              nodeId,
            ),
        });
      } catch (error) {
        handleDigitalTwinError(
          response,
          error,
        );
      }
    },
  );

  // ============================================================
  // PHASE 2 DATA API
  // ============================================================

  app.get(
    '/api/phase2/countries',
    (request, response) => {
      try {
        const query: CountryQuery = {
          ...listOptions(request),
          search:
            queryText(
              request,
              'search',
            ),
          mappingStatus:
            queryText(
              request,
              'mappingStatus',
            ),
        };

        response.json(
          repository.getCountries(query),
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error,
        );
      }
    },
  );

  app.get(
    '/api/phase2/ports',
    (request, response) => {
      try {
        const query: PortQuery = {
          ...listOptions(request),
          search:
            queryText(
              request,
              'search',
            ),
          mappingStatus:
            queryText(
              request,
              'mappingStatus',
            ),
        };

        response.json(
          repository.getPorts(query),
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error,
        );
      }
    },
  );

  app.get(
    '/api/phase2/refineries',
    (request, response) => {
      try {
        const query: RefineryQuery = {
          ...listOptions(request),
          search:
            queryText(
              request,
              'search',
            ),
          company:
            queryText(
              request,
              'company',
            ),
          state:
            queryText(
              request,
              'state',
            ),
          hasCoordinates:
            queryBoolean(
              request,
              'hasCoordinates',
            ),
        };

        response.json(
          repository.getRefineries(query),
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error,
        );
      }
    },
  );

  app.get(
    '/api/phase2/suppliers',
    (request, response) => {
      try {
        const query: SupplierQuery = {
          ...listOptions(request),
          financialYear:
            queryText(
              request,
              'financialYear',
            ),
          countryId:
            queryText(
              request,
              'countryId',
            ),
          country:
            queryText(
              request,
              'country',
            ),
        };

        response.json(
          repository.getSuppliers(query),
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error,
        );
      }
    },
  );

  app.get(
    '/api/phase2/imports/crude',
    (request, response) => {
      try {
        const query: CrudeQuery = {
          ...listOptions(request),
          financialYear:
            queryText(
              request,
              'financialYear',
            ),
        };

        response.json(
          repository.getCrudeImports(query),
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error,
        );
      }
    },
  );

  app.get(
    '/api/phase2/imports/crude/totals',
    (request, response) => {
      try {
        const query: CrudeQuery = {
          ...listOptions(request),
          financialYear:
            queryText(
              request,
              'financialYear',
            ),
        };

        response.json(
          repository.getCrudeImportTotals(query),
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error,
        );
      }
    },
  );

  app.get(
    '/api/phase2/consumption',
    (request, response) => {
      try {
        const query: ConsumptionQuery = {
          ...listOptions(request),
          financialYear:
            queryText(
              request,
              'financialYear',
            ),
          product:
            queryText(
              request,
              'product',
            ),
          productId:
            queryText(
              request,
              'productId',
            ),
          month:
            queryInteger(
              request,
              'month',
              undefined,
              1,
              12,
            ),
        };

        response.json(
          repository.getConsumption(query),
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error,
        );
      }
    },
  );

  app.get(
    '/api/phase2/global-oil',
    (request, response) => {
      try {
        const query: GlobalOilQuery = {
          ...listOptions(request),
          country:
            queryText(
              request,
              'country',
            ),
          countryId:
            queryText(
              request,
              'country_id',
            ) ||
            queryText(
              request,
              'countryId',
            ),
        };

        response.json(
          repository.getGlobalOil(query),
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error,
        );
      }
    },
  );

  app.get(
    '/api/phase2/lanes',
    (request, response) => {
      try {
        response.json(
          repository.getLanes({
            ...listOptions(request),
            category:
              queryText(
                request,
                'category',
              ),
          }),
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error,
        );
      }
    },
  );

  app.get(
    '/api/phase2/chokepoints',
    (request, response) => {
      try {
        response.json(
          repository.getChokepoints(
            listOptions(request),
          ),
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error,
        );
      }
    },
  );

  const portActivityHandler = (
    request: Request,
    response: Response,
  ) => {
    try {
      const query: ActivityQuery = {
        ...listOptions(
          request,
          100,
        ),

        portId:
          queryText(
            request,
            'portId',
          ),

        year:
          queryInteger(
            request,
            'year',
            undefined,
            1900,
            2200,
          ),

        from:
          dateQuery(
            request,
            'from',
          ),

        to:
          dateQuery(
            request,
            'to',
          ),
      };

      response.json(
        repository.getPortActivity(
          query,
        ),
      );
    } catch (error) {
      handlePhase2Error(
        response,
        error,
      );
    }
  };

  app.get(
    '/api/phase2/port-activity',
    portActivityHandler,
  );

  app.get(
    '/api/phase2/daily-port-activity',
    portActivityHandler,
  );

  app.get(
    '/api/phase2/data-quality',
    (request, response) => {
      try {
        response.json(
          repository.getDataQuality({
            ...listOptions(request),
            issueType:
              queryText(
                request,
                'issueType',
              ),
            severity:
              queryText(
                request,
                'severity',
              ),
            status:
              queryText(
                request,
                'status',
              ),
          }),
        );
      } catch (error) {
        handlePhase2Error(
          response,
          error,
        );
      }
    },
  );

  return app;
};

export async function startServer(): Promise<void> {
  const database =
    openPhase2Database();

  const repository =
    new Phase2Repository(
      database,
    );

  const digitalTwin =
    createDigitalTwinRuntime(
      repository,
    );

  const geopoliticalRiskAgent =
    createGeopoliticalRiskIntelligenceAgent(
      digitalTwin,
      createGroqAgentProvider(),
    );

  const newsGroqProvider =
    createGroqNewsProvider();

  const monitoring =
    new GeopoliticalMonitoringService(
      database,
      geopoliticalRiskAgent,
      {},
      undefined,
      undefined,
      {
        runtime: digitalTwin,
        newsProvider: newsGroqProvider,
      },
    );

  const app =
    createApp(
      repository,
      digitalTwin,
      geopoliticalRiskAgent,
      monitoring,
    );

  monitoring.start();

  const PORT = 3000;

  const isProduction =
    process.env.NODE_ENV ===
      'production' ||
    process.argv.includes(
      '--production',
    );

  if (!isProduction) {
    const vite =
      await createViteServer({
        server: {
          middlewareMode: true,
          host: '0.0.0.0',
          port: PORT,
        },

        appType: 'spa',
      });

    app.use(
      vite.middlewares,
    );
  } else {
    const distPath =
      path.join(
        process.cwd(),
        'dist',
      );

    app.use(
      express.static(
        distPath,
      ),
    );

    app.get(
      '*',
      (_request, response) => {
        response.sendFile(
          path.join(
            distPath,
            'index.html',
          ),
        );
      },
    );
  }

  app.listen(
    PORT,
    '0.0.0.0',
    () => {
      console.log(
        `[ORBIT Core] Server running on http://0.0.0.0:${PORT}`,
      );

      console.log(
        `[ORBIT Phase 2] Data layer status: ${repository.getStatus()}`,
      );
    },
  );

}

const isServerEntry =
  process.env.ORBIT_START_SERVER ===
    'true' ||
  process.argv.includes(
    '--production',
  ) ||
  /[\\/]server\.(ts|js)$/.test(
    process.argv[1] || '',
  );

if (isServerEntry) {
  startServer().catch(
    (error) => {
      console.error(
        '[ORBIT Core] Failed to start server:',
        error,
      );

      process.exit(1);
    },
  );
}
