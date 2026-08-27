import { GoogleGenAI } from '@google/genai';
import type { GeopoliticalEventClassification } from './classification';
import type { GeopoliticalSupplyChainRelevance } from './relevance';
import type { GeopoliticalRiskAssessment } from './risk';
import type { GeopoliticalRiskDigitalTwinIntegration } from './digitalTwinIntegration';
import type { GeopoliticalEvent } from './model';

export interface GeminiModelClient {
  models: {
    generateContent(options: {
      model: string;
      contents: string;
      config?: { responseMimeType?: string };
    }): Promise<{ text?: string }>;
  };
}

export interface GeminiExplanationInput {
  request: string;
  event: GeopoliticalEvent;
  classification: GeopoliticalEventClassification;
  relevance: GeopoliticalSupplyChainRelevance;
  risk: GeopoliticalRiskAssessment;
  digitalTwinImpact: GeopoliticalRiskDigitalTwinIntegration;
}

export interface GeminiService {
  extractEvent(request: string): Promise<unknown>;
  explain(input: GeminiExplanationInput): Promise<string>;
}

export class GeminiConfigurationError extends Error {
  constructor(message = 'Gemini is not configured. Set GEMINI_API_KEY on the server.') {
    super(message);
    this.name = 'GeminiConfigurationError';
  }
}

export class GeminiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiServiceError';
  }
}

const removeCodeFence = (value: string): string => value
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/\s*```$/i, '')
  .trim();

const extractionPrompt = (request: string): string => `
You are the extraction component of the ORBIT geopolitical risk agent.
Convert the user's natural-language request into one JSON object matching this exact event shape:
{
  "id": "stable event identifier",
  "title": "short event title",
  "description": "factual event description",
  "timestamp": "ISO-8601 date-time",
  "source": "source attribution or User request",
  "sourceUrl": "optional HTTP(S) URL",
  "location": "optional location",
  "countriesInvolved": ["at least one directly relevant country"],
  "category": "conflict | sanctions | political_instability | trade_restriction | maritime_disruption | diplomatic_escalation | infrastructure_disruption | other",
  "severity": "low | medium | high | critical"
}
Return JSON only. Do not include markdown. Do not invent Digital Twin nodes, relationships, capacities, flows, risk scores, or affected assets. Extract only event information needed by ORBIT; for a hypothetical request, use the request as the source and the request time as timestamp.

User request:
${request}
`;

const explanationPrompt = (input: GeminiExplanationInput): string => `
You are the explanation component of the ORBIT geopolitical risk agent.
Explain the deterministic ORBIT result in 2 concise sentences for a human operator.
Focus on the event impact, risk level, and affected supply chain assets.
Do NOT include mathematical point breakdowns or individual factor scores (such as event severity 20, energy relevance 10, etc.).
Use only the supplied JSON. Do not recalculate or change riskLevel, riskScore, node IDs, edge IDs, capacities, flows, or any other factual value. If a value is empty or unavailable, say so plainly. Do not introduce assets or relationships not present in the supplied result.

Supplied ORBIT result:
${JSON.stringify(input)}
`;

export class GoogleGeminiService implements GeminiService {
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private client: GeminiModelClient | undefined;

  constructor(options: { apiKey?: string; model?: string; client?: GeminiModelClient } = {}) {
    this.apiKey = options.apiKey !== undefined ? options.apiKey : process.env.GEMINI_API_KEY;
    this.model = options.model || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    this.client = options.client;
  }

  private getClient(): GeminiModelClient {
    if (this.client) return this.client;
    if (!this.apiKey) throw new GeminiConfigurationError();
    this.client = new GoogleGenAI({ apiKey: this.apiKey }) as unknown as GeminiModelClient;
    return this.client;
  }

  private async generate(prompt: string, jsonResponse = false): Promise<string> {
    const client = this.getClient();
    try {
      const response = await client.models.generateContent({
        model: this.model,
        contents: prompt,
        ...(jsonResponse ? { config: { responseMimeType: 'application/json' } } : {}),
      });
      const text = response.text?.trim();
      if (!text) throw new GeminiServiceError('Gemini returned an empty response.');
      return text;
    } catch (error) {
      if (error instanceof GeminiServiceError) throw error;
      const cause = error instanceof Error && error.cause instanceof Error ? error.cause : undefined;
      console.error('[ORBIT Gemini] Request failed', {
        model: this.model,
        responseFormat: jsonResponse ? 'json' : 'text',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : 'unknown error',
        causeName: cause?.name,
        causeMessage: cause?.message,
        causeCode: cause && 'code' in cause ? cause.code : undefined,
      });
      throw new GeminiServiceError(`Gemini request failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  async extractEvent(request: string): Promise<unknown> {
    const response = await this.generate(extractionPrompt(request), true);
    try {
      return JSON.parse(removeCodeFence(response)) as unknown;
    } catch {
      throw new GeminiServiceError('Gemini returned invalid structured event JSON.');
    }
  }

  async explain(input: GeminiExplanationInput): Promise<string> {
    return this.generate(explanationPrompt(input));
  }
}
