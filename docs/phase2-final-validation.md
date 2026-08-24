# ORBIT Phase 2 Final Validation

Validation scope: final acceptance testing for Phase 2 Steps 3A-3D against the live Express API and the loaded SQLite data layer. The raw files under `D:\ORBIT\Data` were treated as immutable and were not modified.

Validation date: 2026-08-21

## 1. Executive result

The data layer returns real processed Phase 2 data for the core country, supplier-import, crude-total, port, refinery, consumption, daily-activity, and quality queries. However, the Phase 2 acceptance surface is incomplete:

1. World Port Index oil-terminal/liquid-bulk facility flags are not present in processed `port.csv`, the SQLite `ports` table, or `/api/phase2/ports`.
2. `global_oil_snapshots` is populated in SQLite, but there is no repository method or read-only API endpoint for querying it.
3. The raw shipping-lane GeoJSON is valid, but the data layer loads only lane metadata; `shipping_lane_geometries.geometry_json` is NULL for all three lanes and no API endpoint returns GeoJSON geometry.

These are acceptance failures, not reasons to invent values or infer relationships.

## 2. Queries performed

The following live API queries were executed against `http://localhost:3000`:

| Query | Purpose | Result |
|---|---|---|
| `GET /api/health` | Server and data-layer readiness | `AVAILABLE`; `phase2DataLayer=READY` |
| `GET /api/phase2/countries?pageSize=1000` | Canonical country dimension | 210 rows |
| `GET /api/phase2/suppliers?pageSize=1000` | Supplier crude-import facts | 128 rows |
| `GET /api/phase2/suppliers?countryId=country-6c1925d6560c7c47d21c&pageSize=100` | Country-to-supplier join for Saudi Arabia | 3 rows, 113,419,094 tonnes |
| `GET /api/phase2/imports/crude/totals?pageSize=10` | Recent national crude totals | 3 rows |
| `GET /api/phase2/ports?pageSize=1000` | Port dimension and coordinates | 59 rows; 56 with coordinates |
| `GET /api/phase2/ports?search=Sikka&pageSize=10` | Port filter | Sikka, 22.433333 latitude, 69.833333 longitude |
| `GET /api/phase2/refineries?pageSize=1000` | Refinery capacity | 24 rows |
| `GET /api/phase2/refineries?search=Digboi&pageSize=10` | Refinery filter | IOC, Digboi; 650 thousand metric tonnes/year |
| `GET /api/phase2/consumption?pageSize=1000` | Petroleum consumption facts | 3,888 total rows; 12 products; 27 financial periods |
| `GET /api/phase2/consumption?product=LPG&financialYear=2024-25&pageSize=100` | Product and period filter | 12 monthly rows; 31,323 metric tonnes |
| `GET /api/phase2/lanes?pageSize=100` | Shipping-lane metadata | 3 lanes; valid metadata flags |
| `GET /api/phase2/port-activity?pageSize=5` | Bounded daily activity | 5 returned; 59,556 total |
| `GET /api/phase2/port-activity?page=2&pageSize=25&year=2019&portId=port-21bd5d045171a73e0012` | Activity pagination/filter | 25 returned; 365 matching rows |
| `GET /api/phase2/data-quality?pageSize=1000` | Quality and manual review | 35 issues, 11 manual-review records, 5 unresolved relationships |

Additional read-only SQLite queries were used for the populated global-oil table, activity mapping counts, relationship-link counts, and shipping geometry payload status.

## 3. Acceptance-test results

### 3.1 Supplier countries and crude quantities

The supplier endpoint returned 128 real rows representing 56 distinct source-normalized supplier-country labels across FY2014-15, FY2015-16, and FY2016-17. Six supplier rows retain a NULL `country_id` because their country mappings remain manual review.

The table below reports the recorded quantity across all available historical supplier-import years. The API retains the individual financial-year rows and can filter them with `financialYear`.

| Supplier label | Recorded quantity, tonnes |
|---|---:|
| Albania | 82,959 |
| Algeria | 2,300,133 |
| Angola | 19,952,609 |
| Argentina | 527,819 |
| Australia | 855,051 |
| Azerbaijan | 1,411,391 |
| Brazil | 12,884,972 |
| Brunei | 4,116,132 |
| Cameroon | 3,597,253 |
| Canada | 82,335 |
| Chad | 1,513,256 |
| China | 145,508 |
| Colombia | 4,355,491 |
| Cote D' Ivoire | 225,466 |
| Democratic Republic of the Congo | 210,995 |
| Ecuador | 3,494,708 |
| Egypt | 8,056,499 |
| Equatorial Guinea | 3,398,275 |
| Gabon | 1,229,210 |
| Germany | 9 |
| Greece | 28,938 |
| Guinea | 631,436 |
| Indonesia | 780,315 |
| Iran | 51,956,514 |
| Iraq | 97,471,077 |
| Israel | 9 |
| Japan | 315,204 |
| Kazakhstan | 1,930,704 |
| Kuwait | 39,143,754 |
| Kyrghyzstan | 194,889 |
| Libya | 66,046 |
| Malaysia | 11,859,483 |
| Mexico | 17,886,127 |
| Netherlandantil | 607,643 |
| Netherlands | 1,817,497 |
| Nigeria | 58,608,898 |
| Oman | 1,720,159 |
| Pakistan Ir | 45,705 |
| Panama C Z | 59,036 |
| Qatar | 12,540,895 |
| Republic of the Congo | 712,916 |
| Russia | 859,257 |
| Saudi Arabia | 113,419,094 |
| Singapore | 3 |
| South Korea | 540,657 |
| South Sudan | 91,371 |
| Sri Lanka | 118,184 |
| Sudan | 1,053,136 |
| Togo | 145,711 |
| Turkey | 2,263,667 |
| Turkmenistan | 135,870 |
| United Arab Emirates | 50,409,004 |
| United States | 44,321 |
| Unspecified | 2,120,783 |
| Venezuela | 66,911,761 |
| Yemen | 213,391 |

**Result:** PASS with documented manual-review limitations. Country-to-supplier joins work for 122 of 128 supplier rows; six rows remain explicitly unresolved.

### 3.2 Recent national crude-import totals

`GET /api/phase2/imports/crude/totals` returned the separate recent national series:

| Financial year | Quantity | Unit |
|---|---:|---|
| 2023-24 | 234,261.5795730779 | thousand metric tonnes |
| 2024-25 | 243,224.97136204902 | thousand metric tonnes |
| 2025-26 | 245,768.67364293197 | thousand metric tonnes |

**Result:** PASS. The recent national totals are not incorrectly merged with the historical supplier-country series.

### 3.3 Ports and coordinates

`GET /api/phase2/ports?pageSize=1000` returned 59 port records. Fifty-six records have World Port Index coordinates. The three records without coordinates are provisional/manual-review activity identities: `Jaigad Port`, `Kakinada`, and `Vizhinjam`.

Representative coordinate results:

| Port | Latitude | Longitude | Status |
|---|---:|---:|---|
| Sikka | 22.433333 | 69.833333 | MAPPED |
| Kamarajar Port | 13.261389 | 80.342500 | MAPPED |
| Paradip | 20.266667 | 86.683333 | MAPPED |
| Chennai (Madras) | 13.100000 | 80.300000 | MAPPED |
| Jawaharlal Nehru Port (Nhava Shiva) | 18.950000 | 72.950000 | MAPPED |
| Vishakhapatnam | 17.683333 | 83.300000 | MAPPED |
| Machilipatnam | 16.150000 | 81.150000 | MANUAL_REVIEW |
| Machilipatnam | 16.150000 | 81.166667 | MANUAL_REVIEW |

The complete 59-record result remains available from the endpoint; duplicate Machilipatnam source identities are intentionally retained separately.

**Result:** PASS with limitation. Available coordinates are queryable; three unresolved provisional identities have NULL coordinates.

### 3.4 Port facility information

The port API response fields are:

`port_id`, `canonical_port_name`, `source_port_name`, `source_name_variants`, `un_locode`, `latitude`, `longitude`, `country`, `country_id`, `source_dataset`, `mapping_status`, `mapping_method`, `source_record_key`, `world_port_index_number`, and `source_unlocode_status`.

The response contains no `oil_terminal_facility` or `liquid_bulk_facility` fields. Therefore the data layer cannot answer which ports have those facility flags, even though those fields existed in the raw World Port Index source.

**Result:** FAIL. Facility fields must be carried through a future processed-data/data-layer revision before this acceptance question can pass.

### 3.5 Refineries and capacities

`GET /api/phase2/refineries?pageSize=1000` returned 24 refinery records with a total recorded capacity of 267,116 thousand metric tonnes/year.

| Refinery | State | Capacity (thousand metric tonnes/year) |
|---|---|---:|
| BPC, Bina | Madhya Pradesh | 7,800 |
| BPC, Kochi | Kerala | 15,500 |
| BPC, Mumbai | Maharashtra | 12,000 |
| CPCL, Cauvery Basin* | Chennai | 0 |
| CPCL,Manali | Chennai | 10,500 |
| HMEL, GGSR | Punjab | 11,300 |
| HPC, Mumbai | Maharashtra | 9,500 |
| HPC, Visakh | Andhra Pradesh | 15,000 |
| HRRL, Pachpadra | Rajasthan | 9,000 |
| IOC, Barauni | Bihar | 6,000 |
| IOC, Bongaigaon | Assam | 2,700 |
| IOC, Digboi | Assam | 650 |
| IOC, Guwahati | Assam | 1,200 |
| IOC, Haldia | West Bengal | 8,000 |
| IOC, Koyali | Gujarat | 13,700 |
| IOC, Mathura | Uttar Pradesh | 8,000 |
| IOC, Panipat | Haryana | 15,000 |
| IOC, Paradip | Odisha | 15,000 |
| MRPL, Mangalore | Karnataka | 15,000 |
| NEL, Vadinar | Gujarat | 20,000 |
| NRL, Numaligarh | Assam | 3,000 |
| ONGC, Tatipaka | Andhra Pradesh | 66 |
| RIL, Jamnagar | Gujarat | 33,000 |
| RPL (SEZ), Jamnagar | Gujarat | 35,200 |

All refinery coordinates are NULL, as required by the cleaning report.

**Result:** PASS with limitation. Capacity queries work; coordinates and refinery-port relationships remain unresolved.

### 3.6 Petroleum products and consumption

The consumption data layer contains 3,888 rows for 12 products across 27 financial periods, FY1998-99 through FY2024-25. Products are:

`ATF`, `Bitumen`, `FO & LSHS`, `HSD`, `LDO`, `LPG`, `Lubricants & Greases`, `MS`, `Naphtha`, `Others`, `Petroleum coke`, and `SKO`.

The filtered query `GET /api/phase2/consumption?product=LPG&financialYear=2024-25&pageSize=100` returned 12 monthly rows totaling 31,323 metric tonnes.

**Result:** PASS. Product and financial-period filters work without merging petroleum products into crude oil.

### 3.7 Global oil information

The SQLite `global_oil_snapshots` table contains 210 real country rows:

- 210 rows have proven-reserves values.
- 207 rows have production values.
- 207 rows have import values.
- 207 rows have export values.
- 4 rows retain missing metrics.

The normalized table preserves nullable numeric metrics and source rank text. However, the current repository has no `getGlobalOilSnapshots` query and the API has no `/api/phase2/global-oil` endpoint. The data is present in SQLite but is not exposed through the required repository/API query surface.

**Result:** FAIL for exposed data-layer access; underlying table population is valid.

### 3.8 Shipping lanes and geometry

`GET /api/phase2/lanes?pageSize=100` returned three metadata records:

| Category | Geometry type | Metadata valid | Coordinate points |
|---|---|---|---:|
| Major | MultiLineString | TRUE | 5,678 |
| Middle | MultiLineString | TRUE | 6,862 |
| Minor | MultiLineString | TRUE | 16,226 |

The original raw GeoJSON was independently validated read-only: all three features are valid `MultiLineString` structures with 28,766 coordinate points. But the SQLite `shipping_lane_geometries` table has `geometry_json=NULL` for all three rows, and no endpoint returns GeoJSON geometry.

**Result:** FAIL. Metadata and raw geometry validation pass, but the current data layer cannot retrieve valid GeoJSON geometry.

### 3.9 Daily port activity

`GET /api/phase2/port-activity?pageSize=5` returned five rows with a total of 59,556. The filtered page query returned 25 rows from a 365-row 2019 Sikka subset.

SQLite mapping counts:

- 53,175 rows with `port_mapping_status=MAPPED`.
- 6,381 rows with `port_mapping_status=MANUAL_REVIEW`.

The `import_export_unit_status` remains `UNDOCUMENTED`; no unit conversion was introduced.

**Result:** PASS with limitation. Activity is queryable and paginated; unresolved port aliases remain visible.

### 3.10 Data quality and manual review

`GET /api/phase2/data-quality?pageSize=1000` returned:

- 35 traceable quality issues.
- 13 quality-summary records.
- 11 manual-review records.
- 5 unresolved/not-connected relationship statuses.

Issue counts:

| Issue type | Count |
|---|---:|
| duplicate_source_identifier | 4 |
| invalid_rank | 4 |
| missing_identifier | 6 |
| missing_metadata | 3 |
| missing_metric | 12 |
| unresolved_port_mapping | 3 |
| unresolved_region_mapping | 2 |
| zero_reported_value | 1 |

Unresolved relationship statuses:

| Relationship | Status |
|---|---|
| Refinery to port | UNRESOLVED |
| Port to shipping lane | UNRESOLVED |
| Chokepoint to shipping lane | NOT_CONNECTED |
| Supplier import to route | UNRESOLVED |
| Strategic reserve | NOT_CONNECTED |

**Result:** PASS. Quality and manual-review information is exposed and not hidden.

## 4. Integration requirements

| Requirement | Status | Evidence |
|---|---|---|
| A. Country -> SupplierImport | PASS WITH LIMITATION | Country ID filter returned Saudi Arabia's three supplier rows; 122/128 supplier rows have mapped country IDs and six remain manual review. |
| B. Port -> DailyPortActivity | PASS WITH LIMITATION | 53,175 activity rows use mapped ports; 6,381 retain manual-review port status. |
| C. Refinery records with capacity | PASS | 24 records and 267,116 thousand metric tonnes/year returned. |
| D. Shipping lanes with valid GeoJSON geometry | FAIL | Raw GeoJSON is valid, but geometry payloads are not loaded or exposed by the data layer. |
| E. Crude totals by financial year | PASS | FY2023-24, FY2024-25, and FY2025-26 returned with quantities and units. |
| F. Consumption by product and financial period | PASS | LPG/FY2024-25 filter returned 12 real monthly records. |
| G. Bounded daily-activity pagination | PASS | Default and filtered pages returned bounded results; 59,556 rows were not returned by default. |
| H. Data-quality exposure | PASS | 35 issues, 11 manual-review records, and five relationship statuses returned. |
| I. No false unresolved relationships | PASS | All five relationship-link tables contain zero records; unresolved statuses are explicit. |
| J. Phase 1 build | PASS | `npm run build` completed successfully. |

## 5. Remaining data limitations and manual review

- Four country identities covering six supplier rows remain manual review: `Netherlandantil`, `Pakistan Ir`, `Panama C Z`, and `Unspecified`.
- Seven port manual-review records remain: duplicate World Port Index number `49460.0`, duplicate `INKRI` UN/LOCODE records, and unresolved `Vizhinjam`, `Jaigad Port`, and `Kakinada` activity aliases.
- 6,381 activity rows retain manual-review port mappings.
- Refinery coordinates and refinery-port relationships are unavailable.
- Port facility flags for liquid bulk and oil terminals were not carried into the processed port/data-layer schema.
- Global-oil snapshots have no repository/API read endpoint.
- Shipping-lane geometry payloads are not loaded into SQLite or returned by an API.
- Daily port import/export units and supplier trade-value units remain undocumented.
- Chokepoints and strategic reserves have no supplied source records.
- Supplier imports end in FY2016-17, while recent national crude totals begin in FY2023-24.
- Global-oil and World Port Index observation dates are not supplied.

## 6. Integrity and scope checks

- Raw-file SHA-256 fingerprints remained unchanged for all eight source datasets.
- SQLite foreign-key check returned zero violations.
- The importer remains repeatable and idempotent; the loaded counts match the Phase 2 Step 3C cleaning report.
- No mock, synthetic, demo, or fabricated operational data was introduced.
- No raw data, Phase 1 visual design, Digital Twin, agents, simulation, optimization, predictive ML, or recommendation behavior was added.

## 7. Phase 2 completion status

The core Phase 2 data layer is operational and returns real processed data, but the acceptance requirements for facility attributes, global-oil API exposure, and retrievable GeoJSON geometry are not all satisfied.

# PHASE 2 NOT READY

Do not proceed to Digital Twin or Phase 3 implementation until the three failed acceptance items are resolved with source-traceable data-layer changes.
