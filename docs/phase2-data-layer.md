# ORBIT Phase 2 Data Layer

This document records Phase 2 Step 3D and the three final-validation acceptance fixes. It describes the implemented read-only data layer over the processed datasets from `D:\ORBIT\data\processed\`. The immutable source files under `D:\ORBIT\Data\` are not read by the runtime importer and were not modified.

## 1. Existing application architecture

- Frontend: React 19 with Vite and TypeScript.
- Backend: Express 4 embedded with Vite middleware in `server.ts`.
- Existing persistence before Step 3D: none. Firebase is used only for Phase 1 email/password authentication.
- Environment conventions: Vite client variables use `VITE_*`; the data layer accepts optional server-side `ORBIT_DB_PATH` and `ORBIT_PROCESSED_DATA_DIR` overrides.
- Testing before Step 3D: no application test runner was configured; this step adds Node test-runner tests through the project esbuild/Node test harness.
- Existing API convention: Express JSON routes under `/api`, including `/api/health` and `/api/news`.

## 2. Storage technology

Step 3D uses a file-backed SQLite database through Node's built-in `node:sqlite` module. This avoids adding a database server or native dependency while preserving relational tables, foreign keys, checks, indexes, and transactions for the local ORBIT backend.

The supported runtime is Node.js 22.5 or newer. The default database path is `D:\ORBIT\data\orbit.db`; `ORBIT_DB_PATH` can override it. The importer reads `D:\ORBIT\data\processed\`; `ORBIT_PROCESSED_DATA_DIR` can override that directory.

## 3. Schema and relationships

The schema is created by `src/dataLayer/schema.ts` and opened by `src/dataLayer/database.ts`. Foreign-key enforcement is enabled for every connection.

### Loaded tables

- `data_sources`: processed source manifest, SHA-256, coverage, and raw-file modification flag.
- `financial_periods`: normalized financial-year dimension.
- `unit_definitions`: known, source-declared, and explicitly undocumented measurement semantics.
- `countries` and `country_aliases`: canonical countries plus mapped/manual-review supplier aliases.
- `products` and `product_aliases`: crude and petroleum-product dimensions.
- `ports` and `port_source_identities`: canonical/provisional ports plus source-specific identities, review states, and World Port Index `liquid_bulk_facility`/`oil_terminal_facility` source values.
- `refineries`: standardized refinery and capacity records with nullable coordinates.
- `shipping_lanes` and `shipping_lane_geometries`: lane metadata plus the real GeoJSON geometry payload loaded from the byte-preserved processed `shipping_lanes_v1.geojson`.
- `supplier_imports`: historical crude imports by supplier country and financial year.
- `crude_import_totals`: recent national crude totals, kept separate from supplier imports.
- `petroleum_consumption`: monthly consumption by product and financial year.
- `daily_port_activity`: source-grain activity at `(port_source_identity_id, activity_date)` with undocumented import/export units preserved.
- `global_oil_snapshots`: country-level global oil measures with nullable invalid/missing normalized metrics and preserved source text.
- `data_quality_summaries`, `data_quality_issues`, and `manual_review_records`: quality and review governance records.

### Schema-ready but intentionally empty tables

- `regions` is empty because no reviewed region mapping was supplied.
- `chokepoints` is empty because no chokepoint dataset was supplied.
- `strategic_reserves` is empty because no reserve dataset was supplied.
- `refinery_port_links`, `port_shipping_lane_links`, `chokepoint_shipping_lane_links`, and `import_route_links` are empty because the processed sources do not establish those relationships.

The importer does not infer a refinery-port, port-lane, supplier-route, chokepoint, or reserve relationship. `relationship_statuses` explicitly reports those states as `UNRESOLVED` or `NOT_CONNECTED`.

## 4. Import process

Run:

```text
npm run phase2:import
```

The importer:

1. Opens/creates the SQLite database and applies the schema.
2. Starts a transaction and clears only the prior normalized data-layer rows; it never deletes or writes under `D:\ORBIT\Data\`.
3. Loads the processed `data_source.csv` manifest and verifies source metadata fields.
4. Loads dimensions, source identities, facts, quality records, and manual-review tables.
5. Loads shipping-lane metadata and matches each deterministic source feature number/id to its processed GeoJSON geometry; no geometry is generated.
6. Loads explicit unit definitions and unresolved relationship statuses.
7. Commits atomically and records the import run.

Processed IDs are deterministic. Re-running the importer replaces the normalized snapshot in one transaction and does not duplicate facts. The raw source hashes and `raw_files_modified=NO` values remain available through `data_sources`.

## 5. Read-only API endpoints

All list endpoints return:

```json
{
  "data": [],
  "pagination": { "page": 1, "pageSize": 50, "total": 0, "totalPages": 0 }
}
```

Endpoints:

| Endpoint | Supported filters |
|---|---|
| `GET /api/phase2/countries` | `search`, `mappingStatus` |
| `GET /api/phase2/ports` | `search`, `mappingStatus` |
| `GET /api/phase2/refineries` | `search`, `company`, `state`, `hasCoordinates` |
| `GET /api/phase2/suppliers` | `financialYear`, `countryId`, `country` |
| `GET /api/phase2/imports/crude` | `financialYear` |
| `GET /api/phase2/imports/crude/totals` | `financialYear` |
| `GET /api/phase2/consumption` | `financialYear`, `product`, `productId`, `month` |
| `GET /api/phase2/global-oil` | `country`, `country_id` (or `countryId`) |
| `GET /api/phase2/lanes` | `category` |
| `GET /api/phase2/chokepoints` | none; currently empty |
| `GET /api/phase2/port-activity` | `page`, `pageSize`, `portId`, `year`, `from`, `to` |
| `GET /api/phase2/daily-port-activity` | Alias of `/api/phase2/port-activity` |
| `GET /api/phase2/data-quality` | `issueType`, `severity`, `status`, pagination |

`pageSize` is capped at 1,000; port activity defaults to 100 rows per page so the 59,556-row fact table is never returned in full by default. The data-quality response includes the summary rows, paginated issues, manual-review records, and unresolved relationship statuses.

## 6. Validation and tests

Run the test suite with:

```text
npm test
```

The tests use the real processed datasets and a temporary SQLite file. They cover schema creation, import counts, idempotent re-import, source facility flags, country/port/refinery/supplier/crude/consumption/global-oil queries, source GeoJSON geometry equality and validity, daily activity pagination and filters, data-quality output, and all Phase 2 HTTP endpoints.

Run the existing TypeScript check with:

```text
npm run lint
```

Build the existing application with:

```text
npm run build
```

## 7. Known limitations

- The SQLite implementation requires Node.js 22.5+ because `node:sqlite` is a Node experimental module in the supported runtime.
- Shipping-lane geometry is available for the three supplied features as `shipping_lane_geometries.geometry_json` and is returned by `/api/phase2/lanes` as a parsed GeoJSON `geometry` object. The processed GeoJSON copy is byte-preserved from the raw source; no geometry is synthesized.
- Port facility fields are source flags, not inferred capabilities. WPI values are preserved as supplied (`Yes`/`Unknown`); activity-only provisional ports have NULL facility fields because the source does not provide them.
- `/api/phase2/global-oil` exposes the 210 imported country snapshot rows with nullable normalized metrics and preserved source text; absent values remain NULL.
- Refinery latitude/longitude remain NULL, and no refinery-port links are loaded.
- Three daily activity port aliases remain manual review, including `Vizhinjam`, `Jaigad Port`, and `Kakinada`.
- Four supplier country identities remain manual review; their fact rows retain nullable `country_id`.
- Daily port import/export units and supplier trade-value units remain explicitly undocumented.
- Chokepoints and strategic reserves have schema support but no supplied source records.
- No frontend dashboard, Digital Twin, agent, simulation, optimization, prediction, or recommendation behavior is implemented in Step 3D.
