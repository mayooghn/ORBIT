ORBIT v2 - Phase 2 cleaned data package

Created from the raw files uploaded in this conversation.

Files:
1. supplier_crude_imports_2014_2017.csv
   - India imports of "Petroleum: Crude"
   - Supplier country + quantity in tonnes
   - Source dataset covers FY2014-15 through FY2016-17.

2. india_crude_import_totals_2023_2026.csv
   - PPAC total Indian crude imports
   - Unit: thousand metric tonnes
   - FY2023-24 through FY2025-26.

3. india_refinery_capacity_april_2026.csv
   - Refinery/company/state/capacity
   - Capacity unit: thousand metric tonnes per year
   - Source date: 1 Apr 2026.

4. india_petroleum_consumption.csv
   - Monthly petroleum-product consumption
   - Unit: metric tonnes.

5. global_oil_country.csv
   - Country-level oil reserves, production, consumption, exports and imports.

6. india_world_port_index.csv
   - India subset of the World Port Index
   - Coordinates and port characteristics.

7. india_daily_port_activity_2019_2024.csv
   - India subset of global daily port activity/trade estimates.

8. shipping_lanes_v1.geojson
   - Original shipping-lane geometry.

Cleaning performed:
- Standardized column names.
- Filtered the supplier dataset to Petroleum: Crude imports.
- Added financial-year labels.
- Normalized common country-name abbreviations while retaining source names.
- Removed non-refinery total/source-note rows from the refinery table.
- Selected India-only rows for the World Port Index and daily port activity.
- Preserved original units in explicit column names.
- Kept raw source files untouched.

Important:
This is a data-engineering preparation step, not a claim that all sources are current or mutually complete.
The supplier quantity dataset is historical (2014-17); the PPAC total-import dataset is more recent (2023-26).
