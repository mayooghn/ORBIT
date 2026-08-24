import Groq from 'groq-sdk';
import type { GeopoliticalEventClassification } from './classification';
import type { GeopoliticalSupplyChainRelevance } from './relevance';
import type { GeopoliticalRiskAssessment } from './risk';
import type { GeopoliticalRiskDigitalTwinIntegration } from './digitalTwinIntegration';
import type { GeopoliticalEvent } from './model';

export interface GroqModelClient {
  chat: {
    completions: {
      create(options: {
        model: string;
        messages: Array<{ role: 'system' | 'user'; content: string }>;
        max_completion_tokens?: number;
        response_format?: {
          type: 'json_schema';
          json_schema: {
            name: string;
            description?: string;
            strict?: boolean;
            schema: Record<string, unknown>;
          };
        };
      }): Promise<{ choices?: Array<{ message?: { content?: string | null } }> }>;
    };
  };
}

export interface GroqExplanationInput {
  request: string;
  event: GeopoliticalEvent;
  classification: GeopoliticalEventClassification;
  relevance: GeopoliticalSupplyChainRelevance;
  risk: GeopoliticalRiskAssessment;
  digitalTwinImpact: GeopoliticalRiskDigitalTwinIntegration;
}

export interface GroqServiceContract {
  extractEvent(request: string): Promise<unknown>;
  explain(input: GroqExplanationInput): Promise<string>;
}

export class GroqConfigurationError extends Error {
  constructor(message = 'Groq is not configured. Set GROQ_AGENT_API_KEY or GROQ_NEWS_API_KEY on the server.') {
    super(message);
    this.name = 'GroqConfigurationError';
  }
}

export class GroqServiceError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GroqServiceError';
    this.status = status;
  }
}

export class GroqRateLimitError extends GroqServiceError {
  readonly retryAfterMs: number;
  readonly retryAt: string;

  constructor(retryAfterMs: number) {
    const boundedRetryAfterMs = Math.max(1_000, Math.min(Math.round(retryAfterMs), 24 * 60 * 60 * 1000));
    const retryAt = new Date(Date.now() + boundedRetryAfterMs).toISOString();
    super(`Groq rate limit reached. Automated monitoring is paused until ${retryAt}.`, 429);
    this.name = 'GroqRateLimitError';
    this.retryAfterMs = boundedRetryAfterMs;
    this.retryAt = retryAt;
  }
}

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b';

const geopoliticalEventSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    timestamp: { type: 'string' },
    source: { type: 'string' },
    sourceUrl: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    location: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    countriesInvolved: { type: 'array', items: { type: 'string' }, minItems: 1 },
    category: {
      type: 'string',
      enum: ['conflict', 'sanctions', 'political_instability', 'trade_restriction', 'maritime_disruption', 'diplomatic_escalation', 'infrastructure_disruption', 'other'],
    },
    severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
  },
  required: ['id', 'title', 'description', 'timestamp', 'source', 'sourceUrl', 'location', 'countriesInvolved', 'category', 'severity'],
};

const extractionSystemPrompt = 'Return one JSON ORBIT event matching the schema. Extract only event facts; do not calculate risk or invent Digital Twin assets. For hypothetical requests, use the request as source and current time as timestamp.';

const explanationSystemPrompt = 'Write 2 concise sentences explaining the supplied deterministic ORBIT result. Use only its values; do not recalculate risk or invent assets, relationships, capacities, or flows.';

const DEFAULT_RATE_LIMIT_RETRY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the extraction max_completion_tokens from process.env.EXTRACTION_MAX_COMPLETION_TOKENS.
 * Parses as a positive integer; defaults to 1000 when absent or invalid.
 */
export const getExtractionMaxCompletionTokens = (): number => {
  const raw = process.env.EXTRACTION_MAX_COMPLETION_TOKENS;
  if (raw) {
    const parsed = parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 1000;
};

/**
 * Returns the explanation max_completion_tokens from process.env.EXPLANATION_MAX_COMPLETION_TOKENS.
 * Parses as a positive integer; defaults to 400 when absent or invalid.
 * The previous hardcoded value of 140 caused finish_reason:'length' truncation on openai/gpt-oss-20b.
 */
export const getExplanationMaxCompletionTokens = (): number => {
  const raw = process.env.EXPLANATION_MAX_COMPLETION_TOKENS;
  if (raw) {
    const parsed = parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 400;
};

const headerValue = (error: unknown, name: string): string | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const headers = (error as { headers?: unknown }).headers;
  if (headers && typeof (headers as { get?: unknown }).get === 'function') {
    const value = (headers as { get(name: string): string | null }).get(name);
    return value || undefined;
  }
  if (headers && typeof headers === 'object') {
    const record = headers as Record<string, unknown>;
    const value = record[name] ?? record[name.toLowerCase()];
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
};

const retryAfterMsFor = (error: unknown): number => {
  const retryAfterMsHeader = headerValue(error, 'retry-after-ms');
  if (retryAfterMsHeader) {
    const milliseconds = Number(retryAfterMsHeader);
    if (Number.isFinite(milliseconds) && milliseconds >= 0) return milliseconds;
  }

  const retryAfterHeader = headerValue(error, 'retry-after');
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
    const retryAt = Date.parse(retryAfterHeader);
    if (Number.isFinite(retryAt)) return Math.max(0, retryAt - Date.now());
  }

  return DEFAULT_RATE_LIMIT_RETRY_MS;
};

const isRateLimitError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const status = (error as { status?: unknown }).status;
  const message = error instanceof Error ? error.message : String(error);
  return status === 429 || /\b429\b|rate[_ -]?limit|tokens? per day|rate_limit_exceeded/i.test(message);
};

const responseText = (response: { choices?: Array<{ message?: { content?: string | null } }> }): string => {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new GroqServiceError('Groq returned an empty response.');
  return content.trim();
};

const compactExplanationInput = (input: GroqExplanationInput): Record<string, unknown> => ({
  request: input.request,
  event: {
    title: input.event?.title,
    description: input.event?.description,
    location: input.event?.location,
    countriesInvolved: input.event?.countriesInvolved,
    category: input.event?.category,
    severity: input.event?.severity,
  },
  classification: {
    energyRelevant: input.classification?.energyRelevant,
    region: input.classification?.region,
  },
  relevance: {
    relevant: input.relevance?.relevant,
    matchedNodeTypes: input.relevance?.matchedNodeTypes,
    matchedLocations: input.relevance?.matchedLocations,
    matchedCountries: input.relevance?.matchedCountries,
  },
  risk: {
    riskLevel: input.risk?.riskLevel,
    riskScore: input.risk?.riskScore,
    factors: input.risk?.factors?.map(({ name, points }) => ({ name, points })),
  },
  digitalTwinImpact: {
    relevant: input.digitalTwinImpact?.relevant,
    affectedNodeTypes: input.digitalTwinImpact?.affectedNodeTypes,
    affectedCapacity: input.digitalTwinImpact?.affectedCapacity,
    affectedFlow: input.digitalTwinImpact?.affectedFlow,
  },
});

export interface GroqServiceOptions {
  apiKey?: string;
  model?: string;
  client?: GroqModelClient;
  configurationName?: 'AGENT' | 'NEWS';
}

export class GroqService implements GroqServiceContract {
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly configurationName: 'AGENT' | 'NEWS' | undefined;
  private client: GroqModelClient | undefined;

  constructor(options: GroqServiceOptions = {}) {
    this.apiKey = options.apiKey;
    this.model = options.model || DEFAULT_GROQ_MODEL;
    this.configurationName = options.configurationName;
    this.client = options.client;
  }

  private getClient(): GroqModelClient {
    if (this.client) return this.client;
    if (!this.apiKey) {
      const keyName = this.configurationName ? `GROQ_${this.configurationName}_API_KEY` : 'GROQ_API_KEY';
      throw new GroqConfigurationError(`Groq is not configured. Set ${keyName} on the server.`);
    }
    this.client = new Groq({ apiKey: this.apiKey, maxRetries: 0 }) as unknown as GroqModelClient;
    return this.client;
  }

  toJSON(): { provider: 'GroqService'; model: string } {
    return { provider: 'GroqService', model: this.model };
  }

  private async generate(messages: Array<{ role: 'system' | 'user'; content: string }>, structured = false): Promise<string> {
    const client = this.getClient();
    const maxCompletionTokens = structured ? getExtractionMaxCompletionTokens() : getExplanationMaxCompletionTokens();

    // ── ORBIT AGENT DEBUG ──────────────────────────────────────
    console.log('[ORBIT AGENT DEBUG] Groq request', {
      provider: this.configurationName ?? 'UNKNOWN',
      credentialSource: this.configurationName === 'AGENT' ? 'GROQ_AGENT_API_KEY' : this.configurationName === 'NEWS' ? 'GROQ_NEWS_API_KEY' : 'GROQ_API_KEY',
      model: this.model,
      responseFormat: structured ? 'json_schema' : 'text',
      maxCompletionTokens,
    });
    // ──────────────────────────────────────────────────────────

    /**
     * Perform a single Groq API attempt.
     * Returns the trimmed content string on success.
     * Throws GroqServiceError, GroqRateLimitError, or a raw SDK error.
     */
    const attempt = async (): Promise<string> => {
      const response = await client.chat.completions.create({
        model: this.model,
        messages,
        max_completion_tokens: maxCompletionTokens,
        ...(structured ? {
          response_format: {
            type: 'json_schema' as const,
            json_schema: {
              name: 'geopolitical_event',
              description: 'A validated ORBIT geopolitical event.',
              strict: true,
              schema: geopoliticalEventSchema,
            },
          },
        } : {}),
      });

      // ── ORBIT AGENT DEBUG ────────────────────────────────────
      const rawChoice = (response as unknown as { choices?: Array<{ finish_reason?: string; message?: { content?: string | null } }> }).choices?.[0];
      console.log('[ORBIT AGENT DEBUG] Groq response', {
        provider: this.configurationName ?? 'UNKNOWN',
        model: this.model,
        responseFormat: structured ? 'json_schema' : 'text',
        maxCompletionTokens,
        choicesLength: (response as unknown as { choices?: unknown[] }).choices?.length ?? 0,
        finishReason: rawChoice?.finish_reason ?? 'N/A',
        hasMessage: rawChoice?.message !== undefined,
        hasContent: typeof rawChoice?.message?.content === 'string',
        contentLength: typeof rawChoice?.message?.content === 'string' ? rawChoice.message.content.length : 0,
      });
      // ────────────────────────────────────────────────────────

      return responseText(response);
    };

    const isJsonValidateFailedError = (error: unknown): boolean => {
      if (!error || typeof error !== 'object') return false;
      const message = error instanceof Error ? error.message : String(error);
      return /json_validate_failed/i.test(message);
    };

    try {
      return await attempt();
    } catch (error) {
      if (error instanceof GroqServiceError) throw error;
      if (isRateLimitError(error)) {
        console.warn('[ORBIT Groq] Rate limit reached; automatic retries are disabled.', {
          model: this.model,
          retryAfterMs: retryAfterMsFor(error),
        });
        throw new GroqRateLimitError(retryAfterMsFor(error));
      }

      // ── ORBIT AGENT DEBUG ────────────────────────────────────
      const errMsg = error instanceof Error ? error.message : 'unknown error';
      const errCode = (error instanceof Error && 'code' in error) ? String((error as { code?: unknown }).code) : 'N/A';
      const httpStatus = (error instanceof Error && 'status' in error) ? String((error as { status?: unknown }).status) : 'N/A';
      console.error('[ORBIT AGENT DEBUG] Groq error', {
        provider: this.configurationName ?? 'UNKNOWN',
        model: this.model,
        responseFormat: structured ? 'json_schema' : 'text',
        maxCompletionTokens,
        errorCode: errCode,
        errorStatus: httpStatus,
        errorMessage: errMsg,
      });
      // ────────────────────────────────────────────────────────

      // Retry once for json_validate_failed on structured extraction calls.
      // This error occurs when openai/gpt-oss-20b transiently fails to fill the schema.
      if (structured && isJsonValidateFailedError(error)) {
        console.warn('[ORBIT Groq] json_validate_failed on structured extraction, retrying once.', {
          model: this.model,
          provider: this.configurationName ?? 'UNKNOWN',
        });
        try {
          return await attempt();
        } catch (retryError) {
          if (retryError instanceof GroqServiceError) throw retryError;
          if (isRateLimitError(retryError)) {
            throw new GroqRateLimitError(retryAfterMsFor(retryError));
          }
          const retryMsg = retryError instanceof Error ? retryError.message : 'unknown error';
          console.error('[ORBIT Groq] Retry also failed', { model: this.model, errorMessage: retryMsg });
          throw new GroqServiceError(`Groq request failed after retry: ${retryMsg}`);
        }
      }

      console.error('[ORBIT Groq] Request failed', {
        model: this.model,
        responseFormat: structured ? 'json_schema' : 'text',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: errMsg,
      });
      throw new GroqServiceError(`Groq request failed: ${errMsg}`);
    }
  }

  async extractEvent(request: string): Promise<unknown> {
    const response = await this.generate([
      { role: 'system', content: extractionSystemPrompt },
      { role: 'user', content: request },
    ], true);
    try {
      return JSON.parse(response) as unknown;
    } catch {
      throw new GroqServiceError('Groq returned invalid structured event JSON.');
    }
  }

  async explain(input: GroqExplanationInput): Promise<string> {
    const maxAttempts = 2;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Attempt to generate explanation
        return await this.generate([
          { role: 'system', content: explanationSystemPrompt },
          { role: 'user', content: JSON.stringify(compactExplanationInput(input)) },
        ]);
      } catch (error) {
        // If the error indicates an empty response, retry once.
        if (error instanceof GroqServiceError && error.message.includes('empty response')) {
          if (attempt < maxAttempts - 1) {
            console.warn('[ORBIT Groq] Empty explanation response, retrying...', { attempt: attempt + 1 });
            continue;
          }
        }
        // Propagate other errors or after final attempt
        throw error;
      }
    }
    // Fallback if all attempts fail to get a valid explanation
    console.warn('[ORBIT Groq] Unable to obtain explanation after retries; returning fallback message.');
    return 'Explanation could not be generated at this time.';
  }
}

export const createGroqAgentProvider = (
  overrides: Omit<GroqServiceOptions, 'configurationName'> = {},
): GroqService => new GroqService({
  ...overrides,
  apiKey: overrides.apiKey ?? process.env.GROQ_AGENT_API_KEY ?? '',
  model: overrides.model ?? process.env.GROQ_AGENT_MODEL ?? DEFAULT_GROQ_MODEL,
  configurationName: 'AGENT',
});

export const createGroqNewsProvider = (
  overrides: Omit<GroqServiceOptions, 'configurationName'> = {},
): GroqService => new GroqService({
  ...overrides,
  apiKey: overrides.apiKey ?? process.env.GROQ_NEWS_API_KEY ?? '',
  model: overrides.model ?? process.env.GROQ_NEWS_MODEL ?? DEFAULT_GROQ_MODEL,
  configurationName: 'NEWS',
});

export { geopoliticalEventSchema };
