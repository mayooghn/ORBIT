# ORBIT — Energy Supply-Chain Intelligence

ORBIT is an energy supply-chain intelligence platform with real Phase 2 data, the Phase 3 Digital Twin, and Phase 4 geopolitical risk analysis and monitoring. The protected command-center shell uses Firebase email/password authentication.

## Run locally

Prerequisites: Node.js 22.5+ and npm. The Phase 2 data layer uses the built-in `node:sqlite` module. The repository also includes `bun.lock`; use Bun when it is available.

1. Install dependencies:

   `npm install`

2. Copy `.env.example` to `.env.local` and provide the Firebase web configuration values for the project. Set `GEMINI_API_KEY` only as a server-side variable when using the Assistant or automatic monitoring.

3. Enable Email/Password under Firebase Authentication providers.

4. Start the local application server:

   `npm run dev`

The application is available at `http://localhost:3000`.

### Automatic geopolitical monitoring

n8n is the primary scheduler and news-fetching layer. `ORBIT_MONITORING_ENABLED=false` is the default so ORBIT does not independently poll Google News/RSS and consume Gemini quota twice. Set `ORBIT_MONITORING_ENABLED=true` only to opt into ORBIT's existing internal Google News/direct RSS polling as a fallback or manual local scheduler. `ORBIT_MONITORING_INTERVAL_MS` defaults to 15 minutes and is bounded to avoid aggressive polling. `ORBIT_MONITORING_MAX_ARTICLES_PER_SCAN` bounds the newest energy-threat candidates sent through Gemini when the fallback monitor is enabled.

Monitoring results are available from `/api/geopolitical-risk/monitor/status`, `/api/geopolitical-risk/monitor/events`, `/api/geopolitical-risk/monitor/relevant-events`, `/api/geopolitical-risk/monitor/alerts/high`, and `/api/geopolitical-risk/monitor/alerts/critical`. External automation can send an article to `POST /api/geopolitical-risk/monitor/events`; it is processed by the same Phase 4 pipeline.

### n8n external automation

ORBIT includes one importable, self-hosted n8n workflow at [`n8n/orbit-phase4-energy-monitoring.json`](D:/ORBIT/n8n/orbit-phase4-energy-monitoring.json). It is the primary external fetching and delivery layer; Gemini extraction, Phase 4.1–4.6 deterministic processing, risk scoring, Digital Twin integration, SQLite persistence, alerts, and UI remain inside ORBIT. The existing internal Google News/direct RSS monitor remains available but is disabled by default.

The workflow runs every 15 minutes and follows this path:

`Schedule Trigger → Build Google News RSS Queries → Fetch Google News RSS → Normalize and Filter Energy Candidates → POST Candidate to ORBIT`

It uses the same oil and energy threat query set as ORBIT, removes obvious non-energy stories, deduplicates within a run, and posts only this canonical envelope:

```json
{
  "id": "n8n-3a1f9c20",
  "title": "Strait of Hormuz oil shipping disruption",
  "description": "Tanker traffic was temporarily halted.",
  "source": "Example Energy Wire",
  "sourceUrl": "https://example.com/article",
  "publishedAt": "2026-08-21T12:00:00.000Z"
}
```

ORBIT receives this at `POST /api/geopolitical-risk/monitor/events`. The `id` is stable for the canonical article URL and title, so repeated scheduled runs receive a `409` duplicate response without creating another event. The workflow is configured to continue on RSS and webhook HTTP failures, including duplicate responses.

#### Import and run locally

1. Start ORBIT with `npm run dev` and leave `ORBIT_MONITORING_ENABLED=false` in `.env.local` so n8n is the only automatic fetch scheduler.
2. Run a local/self-hosted n8n instance, for example with `npx n8n` or a local Docker container. No paid n8n service is required.
3. Import `n8n/orbit-phase4-energy-monitoring.json` from the n8n Workflows menu.
4. Configure the n8n process variable `ORBIT_WEBHOOK_URL` to the ORBIT endpoint:

   - n8n running directly on the host: `http://127.0.0.1:3000/api/geopolitical-risk/monitor/events`
   - n8n running in Docker while ORBIT runs on the host: `http://host.docker.internal:3000/api/geopolitical-risk/monitor/events`

   The imported HTTP Request node also contains the Docker URL as a fallback. If the n8n instance blocks environment-variable expressions, edit that node's URL to the reachable ORBIT URL directly.

5. Save, execute once manually to verify connectivity, then activate the workflow. Inspect `/api/geopolitical-risk/monitor/status`, `/api/geopolitical-risk/monitor/events`, and `/api/geopolitical-risk/monitor/alerts` in ORBIT for the resulting records.

n8n does not contain duplicate Gemini, risk, or Digital Twin logic. Direct RSS URLs configured through `ORBIT_MONITORING_RSS_FEEDS` continue to be supported by ORBIT's internal fallback monitor when `ORBIT_MONITORING_ENABLED=true`.

#### Responsibility boundary

1. n8n schedules and fetches Google News RSS (and can be extended with other RSS/API fetch nodes).
2. n8n normalizes, filters, deduplicates, and sends article metadata to the ORBIT webhook.
3. ORBIT sends the article through Gemini to extract a structured geopolitical event.
4. ORBIT's deterministic Phase 4.1–4.6 logic calculates classification, relevance, and risk.
5. ORBIT's Digital Twin integration determines affected infrastructure and relationships.
6. ORBIT persists the complete result in SQLite and exposes events, alerts, APIs, and the monitoring UI.

## Verification

`npm run lint` runs the TypeScript check and `npm run build` creates the Vite client and production server bundles.

The browser Assistant and monitoring panel require a signed-in Firebase session. Gemini keys stay on the server and are never exposed to the client bundle.
