# ORBIT Phase 2 Cleaning Report

This report documents Phase 2 Step 3C cleaning and canonical mapping. The source files under `D:\ORBIT\Data` were treated as immutable and were read only. All generated datasets are under `D:\ORBIT\data\processed\`.

Generated at: `2026-08-21T18:36:09`

## 1. Processing policy

- No raw source file was modified, overwritten, renamed, moved, or deleted.
- Every processed record retains `source_dataset` and a source row, feature, or source-identity key.
- Canonical IDs are deterministic hashes of reviewed source/canonical identities; no random IDs were created.
- Missing values remain NULL/empty in normalized fields; explicit source zeroes remain zero.
- No coordinates, capacities, routes, refinery-port links, chokepoints, or strategic-reserve values were invented.
- No commodity-wise port mapping source was found in the project beyond the audited World Port Index and daily port-activity files. No additional commodity-port relationship was created.

## 2. Files created

| File | Purpose |
|---|---|
| `data_source.csv` | Source manifest, coverage, SHA-256 fingerprints, and derived-output traceability |
| `financial_period.csv` | Shared normalized financial-year dimension |
| `product.csv` | Canonical product dimension, including crude oil and 12 consumption products |
| `product_source_mapping.csv` | Product source-label/code mappings |
| `country.csv` | Canonical country entity table |
| `country_source_mapping.csv` | Source country-to-canonical mappings |
| `manual_review/country_manual_review.csv` | Ambiguous/unmatched country mappings |
| `port.csv` | Canonical/provisional port identities and source facility flags |
| `port_source_mapping.csv` | World Port Index and daily-activity identity mappings |
| `manual_review/port_manual_review.csv` | Duplicate identifiers and unresolved port aliases |
| `refinery.csv` | Standardized refinery/company/state/capacity records with NULL coordinates |
| `supplier_imports.csv` | Historical crude imports by supplier country and financial year |
| `crude_import_totals.csv` | Recent national crude-import totals kept as a separate series |
| `petroleum_consumption.csv` | Monthly product consumption |
| `global_oil_snapshot.csv` | Global oil data with nullable invalid/missing metrics |
| `daily_port_activity.csv` | Daily port activity with canonical/provisional port IDs |
| `shipping_lanes_metadata.csv` | Three lane-category feature metadata and geometry validation |
| `shipping_lanes_v1.geojson` | Byte-preserved processed copy of the source shipping-lane geometry |
| `data_quality_summary.csv` | Row, null, duplicate, invalid, and unresolved-mapping metrics |
| `data_quality_issues.csv` | Traceable row/field-level quality issues |

## 3. Source and output counts

| Dataset | Input rows/features | Output rows | Excluded |
|---|---:|---:|---:|
| `financial_period` | 28 | 28 | 0 |
| `product` | 13 | 13 | 0 |
| `country` | 210 | 210 | 0 |
| `country_source_mapping` | 266 | 266 | 0 |
| `port` | 59 | 59 | 0 |
| `port_source_mapping` | 84 | 84 | 0 |
| `refinery` | 24 | 24 | 0 |
| `supplier_imports` | 128 | 128 | 0 |
| `crude_import_totals` | 3 | 3 | 0 |
| `petroleum_consumption` | 3888 | 3888 | 0 |
| `global_oil_snapshot` | 210 | 210 | 0 |
| `daily_port_activity` | 59556 | 59556 | 0 |
| `shipping_lanes_metadata` | 3 | 3 | 0 |

### Excluded rows

- Total excluded rows: **0**.
- The supplier cleaner was instructed to retain only `Petroleum: Crude`; all 128 supplied rows already matched, so none were excluded.
- No rows were excluded from global oil, port activity, refinery, consumption, crude-total, or shipping-lane outputs. Invalid/missing fields were preserved with review flags or NULL normalized values.

## 4. Country canonicalization

- Canonical country entities created: **210**.
- Distinct source mapping rows created: **266**.
- Unresolved/manual-review country identities: **4** distinct identities, covering **6** supplier rows.
- Safe explicit repairs: replacement-character variants of global `Côte d'Ivoire`/`Curaçao` map to their accented canonical names when encountered; supplier `Cote D' Ivoire` maps to `Côte d'Ivoire`; supplier `Kyrghyzstan` maps to `Kyrgyzstan`.
- Manual review: `Netherlandantil`, `Pakistan Ir`, `Panama C Z`, and `Unspecified`. These were not guessed or mapped.
- Supplier `country_code` values were preserved as source codes; no ISO standard was assumed.

## 5. Port canonicalization

- Port source identities processed: **84** (56 World Port Index rows plus 28 daily activity port identities).
- Canonical/provisional port records created: **59**.
- Port source identities with non-MAPPED status: **5**; activity rows carrying unresolved port mappings: **6381**; manual-review records including duplicate identifiers: **7**.
- Safe aliases applied only where the target name was unique and the alias was explicit: Cochin/Kochi, Dhamra Port/Dhamra, Haldia/Haldia Port, Karaikal/Karaikal Port, Kattupalli/Kattupalli Port, Krishnapatnam Port/Krishnapatnam, Mormugao/Marmagao, Mumbai-JNPT/Nhava Sheva, Pipavav/Pipavav Bandar, V. O. Chidambaranar/Tuticorin, Visakhapatnam/Vishakhapatnam, and Deendayal/Kandla.
- `Vizhinjam`, `Jaigad Port`, and `Kakinada` remain manual review; candidates are none, `Jaigarh Bay`, and `Kakinada Bay`, respectively.
- World Port Index `49460.0` Machilipatnam rows were retained as separate source identities; the duplicate `INKRI` code was not used as a merge key.
- World Port Index `liquid_bulk_facility` and `oil_terminal_facility` values are preserved as source strings; blank values on provisional activity-only identities remain unresolved.
- No refinery-to-port or commodity-to-port relationships were created.

## 6. Refinery cleaning

- Refinery rows processed: **24**.
- Company and state names were standardized for whitespace/casing while source names were retained.
- Capacity was retained in `thousand_metric_tonnes_per_year`.
- Latitude and longitude are NULL for all refinery rows because the source provides no reliable coordinates.
- State mapping review rows: **2**; the source label `CHENNAI` was not converted to a different state.
- The reported zero capacity for `CPCL, Cauvery Basin*` remains zero and is flagged `ZERO_REPORTED`.

## 7. Supplier imports, crude totals, and consumption

- Supplier imports were retained only for `Petroleum: Crude`; quantity was normalized to tonnes and the original country/product/unit fields were preserved.
- `supplier_imports.csv` remains FY2014-15 through FY2016-17.
- `crude_import_totals.csv` remains a separate national series for FY2023-24 through FY2025-26; it was not combined with supplier imports.
- Petroleum consumption remains 12 separate petroleum products and was not merged into crude oil.
- Supplier trade-value values remain source values with undocumented currency/scale; no conversion or aggregation was performed.

## 8. Global oil and daily activity handling

- Global oil em-dash ranks were preserved in `source_rank` and normalized `rank` was left NULL.
- Global missing metrics were left NULL; explicit zero values were preserved as zero.
- Daily activity dates were parsed and normalized to ISO dates after validating the repeated year/month/day fields.
- Daily port-call values were validated as non-negative counts.
- Daily import/export values were preserved numerically, but their unit remains `UNDOCUMENTED`; no tonnes or other unit was invented.

## 9. Shipping-lane handling

- The original `shipping_lanes_v1.geojson` was not modified; a byte-preserved copy is written to `data/processed/shipping_lanes_v1.geojson` for the read-only importer.
- Metadata was created for **3** features: Major, Middle, and Minor.
- Geometry structure and coordinate bounds were validated with a 1e-9 floating-point boundary tolerance; no route names, endpoints, commodities, chokepoints, or port relationships were added.
- Feature names are absent from the source and remain NULL in metadata.

## 10. Data quality summary

The machine-readable summary is `data_quality_summary.csv`. Important-field null counts are stored as JSON in that file.

| Issue type | Count |
|---|---:|
| `duplicate_source_identifier` | 4 |
| `invalid_rank` | 4 |
| `missing_identifier` | 6 |
| `missing_metadata` | 3 |
| `missing_metric` | 12 |
| `unresolved_port_mapping` | 3 |
| `unresolved_region_mapping` | 2 |
| `zero_reported_value` | 1 |

The detailed issue file is `data_quality_issues.csv`; each issue retains the source dataset and source row/record key where available.

## 11. Remaining limitations

1. Country mappings still require review for four ambiguous supplier labels covering six supplier rows.
2. Three daily port aliases remain unresolved, and World Port Index duplicate identifiers/UN/LOCODE collisions remain separate source identities.
3. No reliable refinery coordinates or refinery-port relationships are available.
4. Daily port import/export units and supplier trade-value units remain undocumented.
5. Global oil and World Port Index observation dates are not supplied.
6. Shipping lanes have real geometry but no semantic route endpoints or chokepoint mappings.
7. Time ranges remain non-overlapping across supplier imports and recent national crude totals.
8. No database implementation, API exposure, Digital Twin, agents, or UI changes were performed.

## 12. Traceability

- `data_source.csv` records source paths, input counts, SHA-256 fingerprints, and derived outputs.
- Processed fact records retain `source_dataset` and `source_row_number`.
- Port mappings retain source dataset, source record key, original source name, and mapping method/status.
- Country mappings retain source name, source normalized name, source dataset, and source code where available.
- The raw source files remain outside the processed directory and were not modified.
