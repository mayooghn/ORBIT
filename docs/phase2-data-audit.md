# ORBIT Phase 2 Data Audit

Audit scope: the supplied files under `D:\ORBIT\Data` were inspected without modifying, renaming, moving, deleting, or overwriting any raw data file. This is an inspection and modeling report only. No Digital Twin, agents, simulation, optimization, recommendation, predictive ML, or UI work is included.

Audit date: 2026-08-21

## 1. Executive summary

The package contains seven CSV datasets, one GeoJSON shipping-lane dataset, and a README. The data is primarily India-focused, with two global/reference datasets:

- Global oil-country reference data: 210 country rows.
- India crude-import totals: 3 financial-year rows.
- India daily port activity: 59,556 rows covering 28 ports and 2,127 dates.
- India petroleum consumption: 3,888 monthly product rows covering 12 products and 27 financial years.
- India refinery capacity: 24 refinery rows.
- India World Port Index subset: 56 port rows.
- Shipping lanes: 3 GeoJSON features containing 28,766 coordinate points across 239 line parts.
- Historical supplier-level Indian crude imports: 128 rows covering 3 financial years and 56 supplier countries.

The strongest current identifiers are:

- `country` in `global_oil_country.csv`, subject to country-name normalization and missing ranks.
- `financial_year` in the two aggregate crude-import tables.
- `portid + date` in daily port activity.
- `product + financial_year + month_number` in petroleum consumption.
- `company + refinery` in refinery capacity.
- Supplier `financial_year + country_normalized` or `financial_year + country_code`.

The most important integration limitation is that daily port activity and the World Port Index do not share a stable port identifier. Their names overlap for 13 of the 28 activity ports exactly, but 15 require alias or manual mapping. Refinery rows have no coordinates or port identifiers, and shipping-lane geometry has no route endpoints or port references.

## 2. File inventory and row counts

| File | Format | Rows/features | Coverage or snapshot | Primary observation |
|---|---:|---:|---|---|
| `global_oil_country.csv` | CSV | 210 rows | Unstated | Country-level oil reserves, production, consumption, exports, imports |
| `india_crude_import_totals_2023_2026.csv` | CSV | 3 rows | FY2023-24 to FY2025-26 | India aggregate crude imports |
| `india_daily_port_activity_2019_2024.csv` | CSV | 59,556 rows | 2019-01-01 to 2024-10-27 | Daily activity and estimated trade measures for 28 Indian ports |
| `india_petroleum_consumption.csv` | CSV | 3,888 rows | FY1998-99 to FY2024-25 | Monthly consumption for 12 petroleum products |
| `india_refinery_capacity_april_2026.csv` | CSV | 24 rows | 1 Apr 2026 snapshot | Refinery/company/state capacity |
| `india_world_port_index.csv` | CSV | 56 rows | Snapshot date unstated | Indian port characteristics and coordinates |
| `shipping_lanes_v1.geojson` | GeoJSON | 3 features | Snapshot/version date unstated | Major, middle, and minor global shipping-lane geometries |
| `supplier_crude_imports_2014_2017.csv` | CSV | 128 rows | FY2014-15 to FY2016-17 | India crude imports by supplier country |
| `README.md` | Markdown | Documentation | Package-level | Source descriptions and cleaning notes |

## 3. Dataset schemas and findings

### 3.1 `global_oil_country.csv`

**Rows:** 210.

| Column | Meaning and unit |
|---|---|
| `Rank` | Source ranking; expected integer, but four rows contain an em dash (`—`) instead of a numeric rank |
| `country` | Country or territory name; no ISO3 field |
| `proven_reserves_barrels` | Proven reserves in barrels; stock quantity |
| `production_barrels_per_day` | Oil production in barrels per day |
| `consumption_barrels_per_day` | Oil consumption in barrels per day |
| `exports_barrels_per_day` | Oil exports in barrels per day |
| `imports_barrels_per_day` | Oil imports in barrels per day |

**Key candidates and quality:**

- `country` is unique across all 210 rows and is the best natural identifier in this file, but it is not a canonical country key.
- Numeric ranks are unique from 1 through 206; four rows have `Rank = —` (`Gaza Strip`, `Macau`, `Montserrat`, and `Tokelau`).
- Missing flow values are present in four rows: South Sudan has a missing consumption value; Curaçao is rendered with a replacement character in the country label and has missing production, exports, and imports; Gaza Strip and Tokelau have missing production, consumption, exports, and imports.
- The file has no observation year, as-of date, source-version field, or geography standard. It should therefore be modeled as a dated reference snapshot with its source date retained as nullable metadata until confirmed.

### 3.2 `india_crude_import_totals_2023_2026.csv`

**Rows:** 3.

| Column | Meaning and unit |
|---|---|
| `financial_year` | Fiscal-year label: `2023-24`, `2024-25`, `2025-26` |
| `crude_import_thousand_metric_tonnes` | Total Indian crude imports in thousand metric tonnes |

**Key candidates and quality:**

- `financial_year` is unique and is the natural key for this aggregate series.
- No missing values or duplicate financial years were found.
- This is a national aggregate and cannot be allocated to supplier, port, refinery, route, or product without additional data.

### 3.3 `india_daily_port_activity_2019_2024.csv`

**Rows:** 59,556.

**Coverage:** 28 ports x 2,127 dates = 59,556 rows. Dates run from `2019-01-01 00:00:00+00` through `2024-10-27 00:00:00+00`. The file name suggests 2019-2024, but the supplied data ends on 27 October 2024.

| Column group | Columns | Meaning and unit |
|---|---|---|
| Date | `date`, `year`, `month`, `day` | Timestamp plus repeated date components; the timestamp includes `+00` |
| Port identity | `portid`, `portname`, `country`, `ISO3` | Source port identifier, name, country, and ISO3; all rows are India / `IND` |
| Port calls | `portcalls_container`, `portcalls_dry_bulk`, `portcalls_general_cargo`, `portcalls_roro`, `portcalls_tanker`, `portcalls_cargo`, `portcalls` | Daily port-call counts by category and total |
| Imports | `import_container`, `import_dry_bulk`, `import_general_cargo`, `import_roro`, `import_tanker`, `import_cargo`, `import` | Daily estimated import measures; the supplied package does not document their unit |
| Exports | `export_container`, `export_dry_bulk`, `export_general_cargo`, `export_roro`, `export_tanker`, `export_cargo`, `export` | Daily estimated export measures; the supplied package does not document their unit |
| Source identity | `ObjectId` | Source row/object identifier |

**Key candidates and quality:**

- `portid + date` is a strong natural key: no duplicate combinations were found.
- `ObjectId` is unique in the supplied file but should be treated as a source identifier, not the canonical ORBIT key.
- All 28 ports have all 2,127 dates; there are no missing rows in the port/date Cartesian panel.
- `date`, `year`, `month`, and `day` are mutually consistent for all rows.
- No missing values, invalid numeric values, or negative activity/trade measures were found.
- Port-call fields have an interpretable unit of counts. The import/export fields are described by the README as trade estimates, but no mass, volume, currency, or other unit is present in the schema. They must not be silently labeled as tonnes.
- `portid` values are source-specific (`port1199`, `port1331`, etc.) and do not appear in the World Port Index file.

### 3.4 `india_petroleum_consumption.csv`

**Rows:** 3,888 = 12 products x 27 financial years x 12 months.

| Column | Meaning and unit |
|---|---|
| `product` | Petroleum product category |
| `financial_year` | FY1998-99 through FY2024-25 |
| `calendar_year` | Calendar year associated with the month |
| `month_number` | Month number 1-12 |
| `month_name` | Three-letter uppercase month label |
| `consumption_metric_tonnes` | Consumption in metric tonnes |

Products are `ATF`, `Bitumen`, `FO & LSHS`, `HSD`, `LDO`, `LPG`, `Lubricants & Greases`, `MS`, `Naphtha`, `Others`, `Petroleum coke`, and `SKO`.

**Key candidates and quality:**

- `product + financial_year + month_number` is unique and is the natural fact key.
- No missing values or duplicate keys were found.
- Month names match month numbers, and calendar years match the April-March financial-year convention for all rows.
- This is an India-level monthly consumption series with no region, consumer, refinery, port, or product-code dimension beyond the supplied labels.

### 3.5 `india_refinery_capacity_april_2026.csv`

**Rows:** 24; 11 companies; 24 refinery names; 15 state labels.

| Column | Meaning and unit |
|---|---|
| `company` | Refinery-owning company |
| `refinery` | Refinery name |
| `state` | State/location label |
| `capacity_thousand_metric_tonnes_per_year` | Nameplate capacity in thousand metric tonnes per year |

**Key candidates and quality:**

- `company + refinery` is unique and is the best natural key in the supplied file.
- No stable refinery ID, coordinates, commissioning status, or effective-end date is present.
- Total supplied capacity is `267,116` thousand metric tonnes per year.
- One row has zero capacity: `CPCL, Cauvery Basin*`. The asterisk and zero require source interpretation before use in capacity calculations.
- The state value `CHENNAI` is not a conventional Indian state name and should be normalized or retained as a source location label with a separate canonical state mapping.
- Capacity is a snapshot dated 1 April 2026 according to the README, not a time series.

### 3.6 `india_world_port_index.csv`

**Rows:** 56; 55 distinct port names and 55 distinct raw World Port Index numbers.

| Column | Meaning and unit |
|---|---|
| `world_port_index_number` | World Port Index identifier; represented as values such as `49460.0` |
| `port_name` | Port name |
| `alternate_port_name` | Alternate name; blank in 46 rows |
| `un_locode` | UN/LOCODE-style port code; blank in 6 rows |
| `country` | Country; all rows are India |
| `water_body` | Water body text |
| `latitude`, `longitude` | Decimal geographic coordinates; coordinate datum is not declared in the CSV |
| `harbor_size` | Harbor-size category; blank in 5 rows |
| `harbor_type` | Harbor-type category; blank in 6 rows |
| `harbor_use` | Harbor-use category |
| `max_vessel_length_m` | Maximum vessel length in metres |
| `max_vessel_beam_m` | Maximum vessel beam in metres |
| `max_vessel_draft_m` | Maximum vessel draft in metres |
| `liquid_bulk_facility` | `Yes` / `No` / `Unknown` facility flag |
| `oil_terminal_facility` | `Yes` / `No` / `Unknown` facility flag |
| `wharf_facility` | `Yes` / `No` / `Unknown` facility flag |
| `anchorage_facility` | `Yes` / `No` / `Unknown` facility flag |

**Key candidates and quality:**

- `world_port_index_number` is not unique: `49460.0` appears twice for Machilipatnam, with different alternate-name, coordinate, harbor-use, and anchorage values.
- `port_name` is not unique for the same Machilipatnam duplicate.
- `un_locode` is not unique: `INKRI` is used for both Krishnapatnam and Kattupalli Port, and six rows contain a blank/space value.
- Blank values are sometimes represented by a single space rather than an empty string; whitespace normalization is required.
- All supplied coordinates are within valid latitude/longitude ranges. Latitude ranges from approximately 8.166667 to 23.033333 and longitude from approximately 69.079722 to 92.733333.
- Zero vessel dimensions may mean unknown/not reported rather than a physical zero. The model should retain the source value and a data-quality interpretation flag.
- This table has no explicit snapshot date in its schema.

### 3.7 `shipping_lanes_v1.geojson`

**Features:** 3 `Feature` objects in a `FeatureCollection`.

| Feature | `id` / `OBJECTID` | `Type` | Geometry | Line parts | Coordinate points |
|---:|---:|---|---|---:|---:|
| 1 | 0 / 1 | Major | MultiLineString | 52 | 5,678 |
| 2 | 1 / 2 | Middle | MultiLineString | 123 | 6,862 |
| 3 | 2 / 3 | Minor | MultiLineString | 64 | 16,226 |

The file contains only the top-level `type` and `features` keys. Feature properties are `FID`, `OBJECTID`, and `Type`. The total geometry bounds are approximately longitude -180 to 180 and latitude -56.869411 to 71.687160.

**Key candidates and quality:**

- `OBJECTID` or feature `id` can identify the three supplied feature groups, but neither describes an individual route or corridor.
- Coordinates are two-element longitude/latitude pairs as required by GeoJSON convention; no explicit CRS or source date is declared.
- There are no route names, endpoints, port identifiers, countries, commodities, capacities, directionality, or validity dates.
- The geometry can support later spatial analysis, but it cannot yet be joined deterministically to ports, refineries, suppliers, or countries.

### 3.8 `supplier_crude_imports_2014_2017.csv`

**Rows:** 128; 3 financial years; 56 supplier countries.

| Column | Meaning and unit |
|---|---|
| `financial_year` | FY2014-2015, FY2015-2016, or FY2016-2017 |
| `pc_code` | Product/category source code; `S5` in all rows |
| `pc_description` | Product/category description; `Petroleum: Crude` in all rows |
| `country_code` | Source country code; coding standard is not declared |
| `country_source_name` | Original supplier-country label |
| `country_normalized` | Cleaned supplier-country label |
| `quantity_tonnes` | Imported crude quantity in tonnes |
| `quantity_unit` | Unit label; `Ton` in all rows |
| `trade_value_source_units` | Trade value in source units; currency and scale are not documented |

**Key candidates and quality:**

- `financial_year + country_normalized` and `financial_year + country_code` are both unique in the supplied file.
- `country_code` is unique across the 56 country rows but is not identified as ISO2, ISO3, UN M49, or another standard.
- Quantities by financial year are 187,913,565 tonnes, 202,314,313 tonnes, and 214,915,648 tonnes respectively.
- One row has zero quantity: Canada in FY2015-2016. This may be a valid zero observation, but it should remain traceable and not be treated as missing.
- `trade_value_source_units` has no declared currency, scale, or valuation basis and must remain a source-unit measure until documented.
- Exact country-name comparison with the global oil table finds 50 overlaps. Six normalized supplier labels do not exactly match a global country label: `Cote D' Ivoire`, `Kyrghyzstan`, `Netherlandantil`, `Pakistan Ir`, `Panama C Z`, and `Unspecified`.

### 3.9 `README.md`

The README describes the package as cleaned Phase 2 data, states that raw source files were preserved, and documents the broad units and periods. It explicitly warns that the sources are not necessarily current or mutually complete. It is metadata, not an observation table.

## 4. Cross-dataset relationships

### 4.1 Country relationships

`global_oil_country.country` and `supplier_crude_imports_2014_2017.country_normalized` are the only direct country-name relationship. There is no ISO3 column in the global or supplier tables. Fifty supplier names match global names exactly; six do not. ORBIT needs a canonical country dimension plus source-specific aliases and codes before country joins are trusted.

### 4.2 Financial-year relationships

The consumption series spans FY1998-99 through FY2024-25 and overlaps the historical supplier series in FY2014-15 through FY2016-17. The recent aggregate crude-import series covers FY2023-24 through FY2025-26 and overlaps the consumption series in FY2023-24 and FY2024-25. The supplier and recent aggregate import tables do not directly overlap in time.

All financial-year labels should be normalized to a common key, for example `financial_year_start = 2014` and `financial_year_label = 2014-15`, while preserving the original label.

### 4.3 Port activity to World Port Index

The daily activity table has 28 source `portid` values and the World Port Index has 56 rows. No shared port ID or UN/LOCODE is available. There are 13 exact port-name overlaps:

`Calcutta`, `Chennai (Madras)`, `Dahej`, `Hazira`, `Kamarajar Port`, `Karwar`, `Magdalla`, `Mundra`, `Navlakhi`, `New Mangalore`, `Paradip`, `Port Blair`, and `Sikka`.

The remaining activity names require alias or manual mapping, including examples such as:

- `Dhamra Port` vs `Dhamra`
- `Kattupalli` vs `Kattupalli Port`
- `Krishnapatnam Port` vs `Krishnapatnam`
- `Kakinada` vs `Kakinada Bay`
- `Deendayal (Kandla)` vs `Kandla`
- `Mumbai-Jawaharlal Nehru (Nhava Sheva)` vs `Jawaharlal Nehru Port (Nhava Shiva)`
- `V. O. Chidambaranar (Tuticorin)` vs `Tuticorin`
- `Visakhapatnam` vs `Vishakhapatnam`

The two `INKRI` values in the World Port Index also show that UN/LOCODE alone is not sufficient for a canonical port key in this extract.

### 4.4 Refinery relationships

Refinery capacity has company, refinery name, state, and capacity only. It has no port ID, World Port Index number, coordinates, terminal name, pipeline connection, or crude/product relationship. A refinery-to-port relationship therefore requires a future curated mapping or additional source data; it should not be inferred solely from state.

### 4.5 Shipping-lane relationships

The shipping-lane GeoJSON has global geometry but no port, country, endpoint, route, or commodity attributes. It can later be related to ports through spatial proximity or a curated route map, but no deterministic relational join exists in the supplied package.

### 4.6 Aggregate flow relationships

The national crude-import total, supplier-level crude imports, petroleum consumption, port trade estimates, and refinery capacity describe different measures, granularities, periods, and units. They should not be summed or reconciled as if they were the same flow:

- Supplier imports are historical, by country, and in tonnes.
- Recent crude totals are national, by financial year, and in thousand metric tonnes.
- Port import/export fields have undocumented units.
- Consumption is monthly by petroleum product and in metric tonnes.
- Refinery capacity is annual nameplate capacity and in thousand metric tonnes per year.

## 5. Data gaps and limitations

1. No universal country key is present across all country-related datasets.
2. No stable canonical port key connects daily activity to the World Port Index.
3. No refinery coordinates or port/refinery linkage are supplied.
4. Shipping-lane geometries have no named route, endpoints, or commodity semantics.
5. The global oil table has no observation/as-of date.
6. The World Port Index table has no snapshot date.
7. Port activity ends on 2024-10-27 despite the 2019-2024 filename and has undocumented import/export units.
8. Supplier data ends in FY2016-17, while recent national totals begin in FY2023-24; there is a multi-year supplier-level gap.
9. Recent national crude totals do not identify suppliers, receiving ports, refineries, or crude grades.
10. Petroleum consumption is national aggregate data and does not identify facilities or routes.
11. Trade value units in supplier data are undocumented.
12. Source and version metadata are not represented in the observation schemas.

## 6. Proposed normalized ORBIT Phase 2 data model

The recommended implementation should preserve source-shaped staging tables and then expose normalized dimensions and facts. This is a proposal only; it is not implemented by this audit.

### 6.1 Metadata and reference entities

#### `data_source`

Stores source file, publisher, source dataset name, source version, retrieval date, observation/as-of date, license/notes, and declared units. Every fact row should retain a `source_id`.

#### `country`

Canonical country entity with:

- `country_id` (ORBIT surrogate key)
- `iso3` (nullable until mapped)
- `iso2` / standard external codes where available
- canonical name
- territory/status fields where required

#### `country_alias`

Maps `source_id + source_country_code/source_name` to `country_id`, retaining the original label and normalization method. This is required for the supplier/global name mismatches and for values such as `Unspecified`.

#### `financial_period` and `calendar_date`

Use a shared time dimension with `date_id`, calendar date, calendar year, month number/name, financial-year start year, normalized financial-year label, and fiscal month number. Preserve the original financial-year string on staging rows.

#### `product`

Canonical petroleum product entity with source labels/codes, including the `S5` / `Petroleum: Crude` source classification and the 12 consumption product labels. Product normalization must not imply that petroleum-product consumption and crude-import quantities are interchangeable.

### 6.2 Port and infrastructure entities

#### `port`

Canonical port entity with:

- `port_id` (ORBIT surrogate key)
- canonical name and aliases
- country reference
- latitude/longitude
- UN/LOCODE when unique and validated
- World Port Index identifiers as source attributes
- harbor, vessel-dimension, water-body, and facility attributes
- source and effective/snapshot metadata

#### `port_source_identity`

Maps each source identity to `port_id`, including daily activity `portid`, World Port Index number, UN/LOCODE, source name, and match method/confidence. This prevents the current name-only join from becoming an implicit primary key.

#### `port_activity_daily`

Fact grain: one port, one UTC date.

Suggested attributes:

- `port_id`, `date_id`, `source_id`
- port-call counts by category and total
- import/export measures by category and total
- explicit `measure_unit_id` for every trade measure, nullable until source units are documented
- source `ObjectId`

#### `refinery`

Refinery asset entity with:

- `refinery_id`
- company and source refinery names
- canonical state/location
- capacity and capacity unit
- effective date / snapshot date
- source ID and data-quality flags

#### `infrastructure_link`

Curated links between refineries, ports, shipping lanes, and any future terminals or pipelines. Each link should include `link_type`, source, confidence, effective dates, and whether it is sourced or inferred. No such links should be generated from state or name alone without a mapping decision.

### 6.3 Flow and consumption facts

#### `crude_import_supplier_fy`

Fact grain: one supplier country, one financial year, one source product classification.

Suggested attributes: `country_id`, `financial_period_id`, `product_id`, `quantity_tonnes`, `quantity_unit_id`, `trade_value_source_units`, `trade_value_unit_id` (nullable), `source_id`, and original source identifiers.

#### `crude_import_total_fy`

Fact grain: one national India aggregate, one financial year. Store `quantity_thousand_metric_tonnes`, its unit definition, source, and original financial-year label. This fact must remain separate from supplier-level tonnes unless an explicit reconciliation model is later designed.

#### `petroleum_consumption_monthly`

Fact grain: one product, one calendar month/financial period, one national geography. Store `consumption_metric_tonnes`, `product_id`, `date_id` or period ID, and `source_id`.

#### `global_oil_country_snapshot`

Fact grain: one country, one source snapshot. Store reserves, production, consumption, exports, and imports with explicit units and nullable values, plus source/as-of metadata. The current file does not provide the snapshot date, so it must remain nullable until confirmed.

### 6.4 Shipping-lane entities

#### `shipping_lane`

Stores `lane_id`, source feature ID/OBJECTID, lane class (`Major`, `Middle`, `Minor`), source/version metadata, and nullable semantic attributes such as name, endpoints, commodity, direction, and validity dates.

#### `shipping_lane_geometry`

Stores the MultiLineString geometry linked to `lane_id`, with geometry version and spatial reference metadata. Geometry should remain separate from semantic route attributes so a later route map can add endpoints without rewriting the supplied geometry.

### 6.5 Unit and quality metadata

#### `unit_definition`

Canonical unit registry for barrels, barrels per day, tonnes, thousand metric tonnes, thousand metric tonnes per year, metres, counts, and source-undocumented measures. Every numeric fact should carry a unit reference or an explicit `unit_status = UNDOCUMENTED`.

#### `data_quality_observation`

Stores row-level or field-level quality flags such as missing rank, invalid/placeholder country label, duplicate World Port Index identifier, zero capacity, zero trade quantity, whitespace-only identifiers, and unresolved cross-source mapping.

## 7. Recommended relationship diagram

```text
data_source ───────────────┬──────── country_alias ─────── country
                           │                                  │
                           │                                  ├── global_oil_country_snapshot
                           │                                  └── crude_import_supplier_fy
                           │
financial_period ──────────┼── crude_import_total_fy
                           └── petroleum_consumption_monthly

port_source_identity ───── port ───── port_activity_daily
                                  └── infrastructure_link ─── refinery
                                                           └── shipping_lane

shipping_lane ───────────── shipping_lane_geometry

unit_definition ─────────── all numeric facts and measures
data_quality_observation ── all staged/normalized entities and facts
```

## 8. Recommended next data-engineering steps

1. Preserve the supplied files as immutable staging inputs.
2. Create canonical country, financial-period, product, and unit dimensions.
3. Build an explicit port identity mapping table before joining activity to World Port Index.
4. Confirm undocumented units for port import/export estimates and supplier trade values.
5. Confirm source/as-of dates for global oil and World Port Index snapshots.
6. Decide how to treat the refinery zero-capacity row and `CHENNAI` location label.
7. Keep shipping-lane geometry separate from any future semantic route model.
8. Add source-level and row-level quality flags before exposing data to later ORBIT phases.

## Final proposed entities and relationships

The proposed ORBIT Phase 2 core is:

- Reference entities: `data_source`, `country`, `country_alias`, `financial_period`, `calendar_date`, `product`, and `unit_definition`.
- Infrastructure entities: `port`, `port_source_identity`, `refinery`, `shipping_lane`, `shipping_lane_geometry`, and `infrastructure_link`.
- Facts: `port_activity_daily`, `crude_import_supplier_fy`, `crude_import_total_fy`, `petroleum_consumption_monthly`, and `global_oil_country_snapshot`.
- Governance: `data_quality_observation` attached to raw/staged and normalized records.

The main relationships are country-to-supplier imports, financial-period-to-aggregate/import/consumption facts, canonical-port-to-source-port identities, canonical-port-to-daily activity, and curated infrastructure links between ports, refineries, and shipping lanes. The supplied data does not currently support deterministic refinery-port links, lane endpoints, supplier-port allocation, or risk/disruption inference.
