# ORBIT Phase 2 Final-Validation Fixes

Date: 2026-08-21

Scope: only the three failed Phase 2 acceptance items from `phase2-final-validation.md` were fixed. Raw files under `D:\ORBIT\Data` were not modified. No Phase 3, Digital Twin, agent, mock, synthetic, or UI work was added.

## 1. Original failures

1. `/api/phase2/ports` did not expose the World Port Index `liquid_bulk_facility` and `oil_terminal_facility` fields.
2. `global_oil_snapshots` was loaded into SQLite but had no repository method or API endpoint.
3. Shipping-lane metadata was loaded, but `shipping_lane_geometries.geometry_json` was NULL and the lanes API did not return GeoJSON geometry.

## 2. Implemented fixes

### Port facility flags

- Added `liquid_bulk_facility` and `oil_terminal_facility` to processed `port.csv` using the actual World Port Index source values.
- Added both fields to the SQLite `ports` table and importer.
- Added additive startup migration for existing local databases.
- `/api/phase2/ports` now returns the fields. Values remain source strings such as `Yes` and `Unknown`; no facility availability is inferred for provisional activity-only ports.

### Global oil API

- Added `Phase2Repository.getGlobalOil()` over the existing `global_oil_snapshots` table.
- Added `GET /api/phase2/global-oil`.
- Added `country` filtering and `country_id`/`countryId` filtering.
- Existing nullable metrics and source text are returned without filling missing values.

### Shipping-lane geometry

- Created a byte-preserved processed copy at `data/processed/shipping_lanes_v1.geojson` from the real raw source.
- The importer matches each metadata feature by deterministic feature number and source feature ID, then stores the source geometry JSON in `shipping_lane_geometries.geometry_json` with status `AVAILABLE`.
- `/api/phase2/lanes` returns each geometry as a parsed GeoJSON `geometry` object.
- No geometry was created, altered, or inferred.

## 3. Tests performed

Command:

```text
npm.cmd test
```

Result: **8 passed, 0 failed**.

Focused acceptance coverage includes:

- real Mundra facility flags (`Yes`/`Yes`) through the repository/API data path;
- real Venezuela global-oil record through repository and API country filtering;
- all three processed shipping-lane geometries present, valid, and deeply equal to the processed source GeoJSON geometry;
- structured responses for all Phase 2 endpoints.

Additional checks completed:

- `npm.cmd run phase2:import`: completed successfully.
- Loaded row counts remained: ports 59, global-oil snapshots 210, shipping lanes 3, daily activity 59,556, supplier imports 128, consumption 3,888.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.
- Raw and processed shipping GeoJSON SHA-256 values matched: `4CF32597001BF8543790F4D39BCADB90B3A1069C98A6C437DC8287E3E8334D6E`.

## 4. Real-data and scope confirmation

- All returned port flags come from `india_world_port_index.csv` and are traceable through processed `port.csv`.
- All global-oil records come from the existing imported `global_oil_snapshots` table.
- All lane geometries come from `shipping_lanes_v1.geojson`; no synthetic fallback exists.
- No raw file under `D:\ORBIT\Data` was modified.
- No mock or synthetic data was introduced.
- No Phase 3 implementation was started.

## 5. Remaining Phase 2 limitations

- Unresolved port aliases and duplicate source identifiers remain in manual review.
- Refinery coordinates and refinery-to-port relationships remain unresolved.
- Shipping-lane semantic port, chokepoint, and supplier-route relationships remain unresolved.
- Daily port import/export units and supplier trade-value units remain undocumented.
- Chokepoint and strategic-reserve source data remains unavailable.
