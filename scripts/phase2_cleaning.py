from __future__ import annotations

import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "Data"
OUTPUT = ROOT / "data" / "processed"
MANUAL_REVIEW = OUTPUT / "manual_review"
REPORT_PATH = ROOT / "docs" / "phase2-cleaning-report.md"

SOURCE_FILES = [
    "global_oil_country.csv",
    "india_crude_import_totals_2023_2026.csv",
    "india_daily_port_activity_2019_2024.csv",
    "india_petroleum_consumption.csv",
    "india_refinery_capacity_april_2026.csv",
    "india_world_port_index.csv",
    "shipping_lanes_v1.geojson",
    "supplier_crude_imports_2014_2017.csv",
]

issues: list[dict[str, str]] = []
quality_records: list[dict[str, str]] = []
excluded_records: list[dict[str, str]] = []


def clean(value: Any) -> str:
    return "" if value is None else str(value).strip()


def stable_id(prefix: str, identity: str) -> str:
    digest = hashlib.sha256(identity.encode("utf-8")).hexdigest()[:20]
    return f"{prefix}-{digest}"


def decimal_text(value: Any) -> str:
    value = clean(value)
    if not value:
        return ""
    try:
        decimal = Decimal(value)
    except InvalidOperation:
        return ""
    if decimal == 0:
        return "0"
    return format(decimal, "f")


def parse_decimal(value: Any) -> Decimal | None:
    value = clean(value)
    if not value:
        return None
    try:
        return Decimal(value)
    except InvalidOperation:
        return None


def normalize_financial_year(label: Any) -> tuple[str, int] | None:
    source = clean(label)
    match = re.fullmatch(r"(\d{4})-(\d{2}|\d{4})", source)
    if not match:
        return None
    start = int(match.group(1))
    canonical = f"{start}-{(start + 1) % 100:02d}"
    return canonical, start


def normalize_name(value: Any) -> str:
    value = clean(value)
    value = re.sub(r"\s+", " ", value)
    return value


def title_case_source(value: str) -> str:
    words = normalize_name(value).split(" ")
    small_words = {"and", "of", "the"}
    result: list[str] = []
    for word in words:
        lower = word.lower()
        result.append(lower if lower in small_words else lower.capitalize())
    return " ".join(result)


def read_csv(name: str) -> list[dict[str, str]]:
    with (RAW / name).open("r", encoding="utf-8-sig", newline="", errors="replace") as handle:
        return [dict(row) for row in csv.DictReader(handle)]


def write_csv(name: str, rows: Iterable[dict[str, Any]], fieldnames: list[str]) -> Path:
    path = OUTPUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({field: "" if row.get(field) is None else row.get(field, "") for field in fieldnames})
    return path


def add_issue(
    source_dataset: str,
    source_row_number: int | str | None,
    source_record_key: str | None,
    issue_type: str,
    field_name: str | None,
    severity: str,
    description: str,
    status: str = "OPEN",
) -> None:
    issues.append(
        {
            "source_dataset": source_dataset,
            "source_row_number": "" if source_row_number is None else str(source_row_number),
            "source_record_key": source_record_key or "",
            "issue_type": issue_type,
            "field_name": field_name or "",
            "severity": severity,
            "issue_status": status,
            "description": description,
        }
    )


def duplicate_group_count(rows: list[dict[str, Any]], fields: list[str]) -> int:
    counts = Counter(tuple(clean(row.get(field)) for field in fields) for row in rows)
    return sum(1 for count in counts.values() if count > 1)


def register_quality(
    dataset: str,
    processed_file: str,
    source_dataset: str,
    input_count: int,
    output_count: int,
    excluded_count: int,
    important_fields: list[str],
    duplicate_count: int,
    invalid_count: int,
    unresolved_count: int,
    notes: str,
) -> None:
    rows: list[dict[str, str]] = []
    with (OUTPUT / processed_file).open("r", encoding="utf-8", newline="") as handle:
        rows = [dict(row) for row in csv.DictReader(handle)]
    null_counts = {
        field: sum(1 for row in rows if not clean(row.get(field)))
        for field in important_fields
    }
    quality_records.append(
        {
            "dataset": dataset,
            "processed_file": processed_file,
            "source_dataset": source_dataset,
            "input_row_count": str(input_count),
            "output_row_count": str(output_count),
            "excluded_row_count": str(excluded_count),
            "null_count_by_important_field": json.dumps(null_counts, sort_keys=True),
            "duplicate_count": str(duplicate_count),
            "invalid_value_count": str(invalid_count),
            "unresolved_mapping_count": str(unresolved_count),
            "notes": notes,
        }
    )


def source_hash(name: str) -> str:
    digest = hashlib.sha256()
    with (RAW / name).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    MANUAL_REVIEW.mkdir(parents=True, exist_ok=True)

    global_rows = read_csv("global_oil_country.csv")
    supplier_rows = read_csv("supplier_crude_imports_2014_2017.csv")
    crude_total_rows = read_csv("india_crude_import_totals_2023_2026.csv")
    consumption_rows = read_csv("india_petroleum_consumption.csv")
    activity_rows = read_csv("india_daily_port_activity_2019_2024.csv")
    refinery_rows = read_csv("india_refinery_capacity_april_2026.csv")
    wpi_rows = read_csv("india_world_port_index.csv")
    with (RAW / "shipping_lanes_v1.geojson").open("r", encoding="utf-8-sig", errors="replace") as handle:
        lanes_geojson = json.load(handle)

    # ------------------------------------------------------------------
    # Data source manifest
    # ------------------------------------------------------------------
    source_row_counts = {
        "global_oil_country.csv": len(global_rows),
        "india_crude_import_totals_2023_2026.csv": len(crude_total_rows),
        "india_daily_port_activity_2019_2024.csv": len(activity_rows),
        "india_petroleum_consumption.csv": len(consumption_rows),
        "india_refinery_capacity_april_2026.csv": len(refinery_rows),
        "india_world_port_index.csv": len(wpi_rows),
        "shipping_lanes_v1.geojson": len(lanes_geojson.get("features", [])),
        "supplier_crude_imports_2014_2017.csv": len(supplier_rows),
    }
    source_coverage = {
        "global_oil_country.csv": "Country reference snapshot; observation date not supplied",
        "india_crude_import_totals_2023_2026.csv": "FY2023-24 through FY2025-26",
        "india_daily_port_activity_2019_2024.csv": "2019-01-01 through 2024-10-27",
        "india_petroleum_consumption.csv": "FY1998-99 through FY2024-25",
        "india_refinery_capacity_april_2026.csv": "Snapshot dated 2026-04-01 per README",
        "india_world_port_index.csv": "India subset; snapshot date not supplied",
        "shipping_lanes_v1.geojson": "Three global lane-category features",
        "supplier_crude_imports_2014_2017.csv": "FY2014-15 through FY2016-17",
    }

    data_source_rows: list[dict[str, Any]] = []
    source_to_output: dict[str, list[str]] = defaultdict(list)
    for source in SOURCE_FILES:
        data_source_rows.append(
            {
                "data_source_id": stable_id("source", source),
                "source_dataset": source,
                "source_path": f"D:/ORBIT/Data/{source}",
                "source_format": "GeoJSON" if source.endswith(".geojson") else "CSV",
                "source_row_or_feature_count": source_row_counts[source],
                "coverage_or_snapshot": source_coverage[source],
                "source_sha256": source_hash(source),
                "raw_files_modified": "NO",
            }
        )

    # ------------------------------------------------------------------
    # Financial periods and products
    # ------------------------------------------------------------------
    period_labels_by_source: dict[str, set[str]] = defaultdict(set)
    for row in supplier_rows:
        period_labels_by_source["supplier_crude_imports_2014_2017.csv"].add(clean(row["financial_year"]))
    for row in crude_total_rows:
        period_labels_by_source["india_crude_import_totals_2023_2026.csv"].add(clean(row["financial_year"]))
    for row in consumption_rows:
        period_labels_by_source["india_petroleum_consumption.csv"].add(clean(row["financial_year"]))

    period_rows: list[dict[str, Any]] = []
    period_by_source_label: dict[tuple[str, str], tuple[str, int]] = {}
    all_periods: dict[str, dict[str, Any]] = {}
    for source, labels in period_labels_by_source.items():
        for source_label in sorted(labels):
            normalized = normalize_financial_year(source_label)
            if normalized is None:
                add_issue(source, "", source_label, "invalid_financial_year", "financial_year", "BLOCKING", "Financial-year label did not match YYYY-YY or YYYY-YYYY.")
                continue
            canonical_label, start_year = normalized
            period_by_source_label[(source, source_label)] = (canonical_label, start_year)
            all_periods.setdefault(canonical_label, {"start": start_year, "source_labels": set(), "sources": set()})
            all_periods[canonical_label]["source_labels"].add(source_label)
            all_periods[canonical_label]["sources"].add(source)
    for canonical_label, value in sorted(all_periods.items()):
        period_rows.append(
            {
                "financial_period_id": stable_id("period", canonical_label),
                "financial_year": canonical_label,
                "financial_year_start": value["start"],
                "source_financial_year_labels": ";".join(sorted(value["source_labels"])),
                "source_datasets": ";".join(sorted(value["sources"])),
            }
        )
    write_csv(
        "financial_period.csv",
        period_rows,
        ["financial_period_id", "financial_year", "financial_year_start", "source_financial_year_labels", "source_datasets"],
    )
    source_to_output["supplier_crude_imports_2014_2017.csv"].append("financial_period.csv")
    source_to_output["india_crude_import_totals_2023_2026.csv"].append("financial_period.csv")
    source_to_output["india_petroleum_consumption.csv"].append("financial_period.csv")

    product_rows: list[dict[str, Any]] = []
    product_mapping_rows: list[dict[str, Any]] = []
    product_id_by_consumption_name: dict[str, str] = {}
    for source_product in sorted({clean(row["product"]) for row in consumption_rows}):
        product_id = stable_id("product", f"consumption:{source_product}")
        product_id_by_consumption_name[source_product] = product_id
        product_rows.append(
            {
                "product_id": product_id,
                "canonical_name": source_product,
                "product_class": "PETROLEUM_PRODUCT",
                "source_name": source_product,
                "source_code": "",
                "source_dataset": "india_petroleum_consumption.csv",
                "mapping_status": "MAPPED",
                "mapping_method": "source_label_unambiguous",
            }
        )
        product_mapping_rows.append(
            {
                "product_id": product_id,
                "source_name": source_product,
                "source_code": "",
                "source_dataset": "india_petroleum_consumption.csv",
                "mapping_status": "MAPPED",
                "mapping_method": "source_label_unambiguous",
            }
        )
    crude_product_id = stable_id("product", "crude-oil")
    product_rows.append(
        {
            "product_id": crude_product_id,
            "canonical_name": "Crude Oil",
            "product_class": "CRUDE",
            "source_name": "Petroleum: Crude",
            "source_code": "S5",
            "source_dataset": "supplier_crude_imports_2014_2017.csv",
            "mapping_status": "MAPPED",
            "mapping_method": "source_code_and_description_unambiguous",
        }
    )
    product_mapping_rows.append(
        {
            "product_id": crude_product_id,
            "source_name": "Petroleum: Crude",
            "source_code": "S5",
            "source_dataset": "supplier_crude_imports_2014_2017.csv",
            "mapping_status": "MAPPED",
            "mapping_method": "source_code_and_description_unambiguous",
        }
    )
    write_csv(
        "product.csv",
        product_rows,
        ["product_id", "canonical_name", "product_class", "source_name", "source_code", "source_dataset", "mapping_status", "mapping_method"],
    )
    write_csv(
        "product_source_mapping.csv",
        product_mapping_rows,
        ["product_id", "source_name", "source_code", "source_dataset", "mapping_status", "mapping_method"],
    )
    source_to_output["india_petroleum_consumption.csv"].extend(["product.csv", "product_source_mapping.csv"])
    source_to_output["supplier_crude_imports_2014_2017.csv"].extend(["product.csv", "product_source_mapping.csv"])

    # ------------------------------------------------------------------
    # Country canonicalization
    # ------------------------------------------------------------------
    global_encoding_repairs = {
        "C\ufffdte d'Ivoire": "Côte d'Ivoire",
        "Cura\ufffdao": "Curaçao",
    }
    explicit_supplier_repairs = {
        "Cote D' Ivoire": "Côte d'Ivoire",
        "Kyrghyzstan": "Kyrgyzstan",
    }
    ambiguous_supplier_names = {"Netherlandantil", "Pakistan Ir", "Panama C Z", "Unspecified"}

    canonical_name_by_global_source: dict[str, str] = {}
    for row in global_rows:
        source_name = clean(row["country"])
        canonical_name_by_global_source[source_name] = global_encoding_repairs.get(source_name, source_name)

    canonical_names = set(canonical_name_by_global_source.values())
    country_id_by_canonical: dict[str, str] = {
        name: stable_id("country", name.casefold()) for name in sorted(canonical_names)
    }

    def map_supplier_country(row: dict[str, str]) -> tuple[str, str, str, str]:
        source_name = clean(row["country_source_name"])
        supplied_normalized = clean(row["country_normalized"])
        candidate = explicit_supplier_repairs.get(supplied_normalized, supplied_normalized)
        if candidate in canonical_names:
            method = "exact_canonical_or_explicit_spelling_repair"
            return country_id_by_canonical[candidate], candidate, "MAPPED", method
        if supplied_normalized in ambiguous_supplier_names or source_name in ambiguous_supplier_names:
            return "", "", "MANUAL_REVIEW", "ambiguous_source_name"
        return "", "", "MANUAL_REVIEW", "no_safe_canonical_match"

    country_mapping_rows: list[dict[str, Any]] = []
    country_seen: set[tuple[str, str, str, str]] = set()
    for row in global_rows:
        source_name = clean(row["country"])
        canonical_name = canonical_name_by_global_source[source_name]
        method = "source_name_exact"
        if source_name in global_encoding_repairs:
            method = "encoding_repair"
            add_issue("global_oil_country.csv", "", source_name, "source_encoding_anomaly", "country", "REVIEW", f"Source country label {source_name!r} contains a replacement character; canonical name set to {canonical_name!r} without changing the raw file.")
        key = ("global_oil_country.csv", source_name, "", "")
        if key not in country_seen:
            country_seen.add(key)
            country_mapping_rows.append(
                {
                    "country_id": country_id_by_canonical[canonical_name],
                    "canonical_name": canonical_name,
                    "source_name": source_name,
                    "source_normalized_name": canonical_name,
                    "source_dataset": "global_oil_country.csv",
                    "country_code": "",
                    "mapping_status": "MAPPED",
                    "mapping_method": method,
                    "review_reason": "",
                }
            )

    manual_country_counter: Counter[tuple[str, str, str, str]] = Counter()
    manual_country_examples: dict[tuple[str, str, str, str], str] = {}
    supplier_country_mapping: dict[tuple[str, str, str], tuple[str, str, str, str]] = {}
    for row in supplier_rows:
        source_name = clean(row["country_source_name"])
        supplied_normalized = clean(row["country_normalized"])
        country_code = clean(row["country_code"])
        key = (source_name, supplied_normalized, country_code)
        mapped = map_supplier_country(row)
        supplier_country_mapping[key] = mapped
        mapping_status = mapped[2]
        mapping_method = mapped[3]
        canonical_name = mapped[1]
        source_key = ("supplier_crude_imports_2014_2017.csv", source_name, supplied_normalized, country_code)
        if source_key not in country_seen:
            country_seen.add(source_key)
            country_mapping_rows.append(
                {
                    "country_id": mapped[0],
                    "canonical_name": canonical_name,
                    "source_name": source_name,
                    "source_normalized_name": supplied_normalized,
                    "source_dataset": "supplier_crude_imports_2014_2017.csv",
                    "country_code": country_code,
                    "mapping_status": mapping_status,
                    "mapping_method": mapping_method,
                    "review_reason": "Ambiguous or unmatched supplier country label" if mapping_status != "MAPPED" else "",
                }
            )
        if mapping_status != "MAPPED":
            manual_country_counter[(source_name, supplied_normalized, country_code, mapping_method)] += 1
            manual_country_examples[(source_name, supplied_normalized, country_code, mapping_method)] = "supplier_crude_imports_2014_2017.csv"

    country_rows = [
        {
            "country_id": country_id_by_canonical[name],
            "canonical_name": name,
            "source_dataset": "global_oil_country.csv",
            "mapping_status": "CANONICAL",
        }
        for name in sorted(canonical_names)
    ]
    write_csv("country.csv", country_rows, ["country_id", "canonical_name", "source_dataset", "mapping_status"])
    write_csv(
        "country_source_mapping.csv",
        country_mapping_rows,
        ["country_id", "canonical_name", "source_name", "source_normalized_name", "source_dataset", "country_code", "mapping_status", "mapping_method", "review_reason"],
    )
    manual_country_rows = [
        {
            "source_dataset": manual_country_examples[key],
            "source_name": key[0],
            "source_normalized_name": key[1],
            "country_code": key[2],
            "mapping_status": "MANUAL_REVIEW",
            "mapping_method": key[3],
            "occurrence_count": count,
            "review_reason": "No safe canonical country match; do not guess whether this represents a current country, historical territory, or source typo.",
        }
        for key, count in sorted(manual_country_counter.items())
    ]
    write_csv(
        "manual_review/country_manual_review.csv",
        manual_country_rows,
        ["source_dataset", "source_name", "source_normalized_name", "country_code", "mapping_status", "mapping_method", "occurrence_count", "review_reason"],
    )
    source_to_output["global_oil_country.csv"].extend(["country.csv", "country_source_mapping.csv"])
    source_to_output["supplier_crude_imports_2014_2017.csv"].extend(["country.csv", "country_source_mapping.csv", "manual_review/country_manual_review.csv"])

    # ------------------------------------------------------------------
    # Port canonicalization
    # ------------------------------------------------------------------
    wpi_name_rows: dict[str, list[int]] = defaultdict(list)
    wpi_number_counts = Counter()
    wpi_unlocode_counts = Counter()
    for index, row in enumerate(wpi_rows, start=2):
        name = normalize_name(row["port_name"])
        wpi_name_rows[name].append(index)
        wpi_number_counts[clean(row["world_port_index_number"])] += 1
        unlocode = clean(row["un_locode"])
        if unlocode:
            wpi_unlocode_counts[unlocode] += 1

    safe_port_aliases = {
        "Cochin (Kochi)": "Kochi (Cochin)",
        "Deendayal (Kandla)": "Kandla",
        "Dhamra Port": "Dhamra",
        "Haldia": "Haldia Port",
        "Karaikal": "Karaikal Port",
        "Kattupalli": "Kattupalli Port",
        "Krishnapatnam Port": "Krishnapatnam",
        "Mormugao": "Marmagao",
        "Mumbai-Jawaharlal Nehru (Nhava Sheva)": "Jawaharlal Nehru Port (Nhava Shiva)",
        "Pipavav": "Pipavav Bandar",
        "V. O. Chidambaranar (Tuticorin)": "Tuticorin",
        "Visakhapatnam": "Vishakhapatnam",
    }
    manual_port_aliases = {
        "Jaigad Port": "Jaigarh Bay",
        "Kakinada": "Kakinada Bay",
    }

    port_records: dict[str, dict[str, Any]] = {}
    port_name_variants: dict[str, set[str]] = defaultdict(set)
    port_source_datasets: dict[str, set[str]] = defaultdict(set)
    port_mapping_rows: list[dict[str, Any]] = []
    wpi_port_id_by_row: dict[int, str] = {}

    def add_port_record(
        port_id: str,
        canonical_name: str,
        source_name: str,
        unlocode: str,
        latitude: str,
        longitude: str,
        source_dataset: str,
        source_record_key: str,
        world_index_number: str,
        mapping_status: str,
        mapping_method: str,
        liquid_bulk_facility: str = "",
        oil_terminal_facility: str = "",
    ) -> None:
        if port_id not in port_records:
            port_records[port_id] = {
                "port_id": port_id,
                "canonical_port_name": canonical_name,
                "source_port_name": source_name,
                "un_locode": unlocode,
                "latitude": latitude,
                "longitude": longitude,
                "country": "India",
                "source_dataset": source_dataset,
                "mapping_status": mapping_status,
                "mapping_method": mapping_method,
                "source_record_key": source_record_key,
                "world_port_index_number": world_index_number,
                "source_unlocode_status": "DUPLICATE" if unlocode and wpi_unlocode_counts[unlocode] > 1 else ("MISSING" if not unlocode else "UNIQUE_IN_SOURCE"),
                "liquid_bulk_facility": liquid_bulk_facility,
                "oil_terminal_facility": oil_terminal_facility,
            }
        port_name_variants[port_id].add(source_name)
        port_source_datasets[port_id].add(source_dataset)

    for index, row in enumerate(wpi_rows, start=2):
        source_name = normalize_name(row["port_name"])
        source_key = f"wpi_row_{index:04d}"
        port_id = stable_id("port", f"world_port_index:{source_key}")
        wpi_port_id_by_row[index] = port_id
        duplicate_number = wpi_number_counts[clean(row["world_port_index_number"])] > 1
        mapping_status = "MANUAL_REVIEW" if duplicate_number else "MAPPED"
        mapping_method = "duplicate_source_identifier_preserved" if duplicate_number else "source_identity_preserved"
        add_port_record(
            port_id,
            source_name,
            source_name,
            clean(row["un_locode"]),
            decimal_text(row["latitude"]),
            decimal_text(row["longitude"]),
            "india_world_port_index.csv",
            source_key,
            clean(row["world_port_index_number"]),
            mapping_status,
            mapping_method,
            clean(row["liquid_bulk_facility"]),
            clean(row["oil_terminal_facility"]),
        )
        port_mapping_rows.append(
            {
                "port_id": port_id,
                "source_dataset": "india_world_port_index.csv",
                "source_record_key": source_key,
                "source_port_name": source_name,
                "source_world_port_index_number": clean(row["world_port_index_number"]),
                "source_un_locode": clean(row["un_locode"]),
                "canonical_port_name": source_name,
                "mapping_status": mapping_status,
                "mapping_method": mapping_method,
                "review_reason": "Duplicate World Port Index number; preserve as separate source identity pending review." if duplicate_number else "",
            }
        )
        if duplicate_number:
            add_issue("india_world_port_index.csv", index, source_key, "duplicate_source_identifier", "world_port_index_number", "REVIEW", "World Port Index number occurs on multiple source rows; source identities were not merged.")
        if clean(row["un_locode"]) and wpi_unlocode_counts[clean(row["un_locode"])] > 1:
            add_issue("india_world_port_index.csv", index, source_key, "duplicate_source_identifier", "un_locode", "REVIEW", "UN/LOCODE occurs on multiple distinct source ports in this extract.")
        if not clean(row["un_locode"]):
            add_issue("india_world_port_index.csv", index, source_key, "missing_identifier", "un_locode", "REVIEW", "UN/LOCODE is blank or whitespace-only in the source.")

    activity_port_id: dict[str, str] = {}
    activity_port_status: dict[str, tuple[str, str, str]] = {}
    unique_activity_ports: dict[str, dict[str, str]] = {}
    for row in activity_rows:
        source_id = clean(row["portid"])
        unique_activity_ports.setdefault(source_id, row)

    for source_id, row in sorted(unique_activity_ports.items()):
        source_name = normalize_name(row["portname"])
        target_name = source_name
        method = "exact_port_name"
        status = "MAPPED"
        review_reason = ""
        candidate_rows = wpi_name_rows.get(target_name, [])
        if len(candidate_rows) == 1:
            target_row_index = candidate_rows[0]
        elif source_name in safe_port_aliases and len(wpi_name_rows.get(safe_port_aliases[source_name], [])) == 1:
            target_name = safe_port_aliases[source_name]
            target_row_index = wpi_name_rows[target_name][0]
            method = "explicit_safe_alias"
        else:
            target_row_index = None
            status = "MANUAL_REVIEW"
            method = "unresolved_port_alias"
            review_reason = f"Activity name does not have a safe unique World Port Index mapping. Candidate observed in source: {manual_port_aliases.get(source_name, 'none')}."

        if target_row_index is not None:
            port_id = wpi_port_id_by_row[target_row_index]
            canonical_name = port_records[port_id]["canonical_port_name"]
            add_port_record(
                port_id,
                canonical_name,
                source_name,
                port_records[port_id]["un_locode"],
                port_records[port_id]["latitude"],
                port_records[port_id]["longitude"],
                "india_daily_port_activity_2019_2024.csv",
                source_id,
                port_records[port_id]["world_port_index_number"],
                port_records[port_id]["mapping_status"],
                method,
            )
        else:
            port_id = stable_id("port", f"daily_port_activity:{source_id}")
            canonical_name = source_name
            add_port_record(
                port_id,
                canonical_name,
                source_name,
                "",
                "",
                "",
                "india_daily_port_activity_2019_2024.csv",
                source_id,
                "",
                status,
                method,
            )
            add_issue("india_daily_port_activity_2019_2024.csv", "", source_id, "unresolved_port_mapping", "portname", "REVIEW", review_reason)
        activity_port_id[source_id] = port_id
        activity_port_status[source_id] = (status, method, review_reason)
        port_mapping_rows.append(
            {
                "port_id": port_id,
                "source_dataset": "india_daily_port_activity_2019_2024.csv",
                "source_record_key": source_id,
                "source_port_name": source_name,
                "source_world_port_index_number": "",
                "source_un_locode": "",
                "canonical_port_name": canonical_name,
                "mapping_status": status,
                "mapping_method": method,
                "review_reason": review_reason,
            }
        )

    manual_port_rows: list[dict[str, Any]] = []
    for index, row in enumerate(wpi_rows, start=2):
        source_number = clean(row["world_port_index_number"])
        source_name = normalize_name(row["port_name"])
        source_key = f"wpi_row_{index:04d}"
        if wpi_number_counts[source_number] > 1:
            manual_port_rows.append(
                {
                    "source_dataset": "india_world_port_index.csv",
                    "source_record_key": source_key,
                    "source_port_name": source_name,
                    "candidate_canonical_port_name": source_name,
                    "source_identifier": source_number,
                    "mapping_status": "MANUAL_REVIEW",
                    "reason": "Duplicate World Port Index identifier with conflicting source attributes; do not merge automatically.",
                }
            )
        if clean(row["un_locode"]) == "INKRI":
            manual_port_rows.append(
                {
                    "source_dataset": "india_world_port_index.csv",
                    "source_record_key": source_key,
                    "source_port_name": source_name,
                    "candidate_canonical_port_name": source_name,
                    "source_identifier": "INKRI",
                    "mapping_status": "MANUAL_REVIEW",
                    "reason": "UN/LOCODE is shared by multiple distinct source ports in this extract; preserve source identity.",
                }
            )
    for source_id, row in sorted(unique_activity_ports.items()):
        status, method, reason = activity_port_status[source_id]
        if status != "MAPPED":
            manual_port_rows.append(
                {
                    "source_dataset": "india_daily_port_activity_2019_2024.csv",
                    "source_record_key": source_id,
                    "source_port_name": normalize_name(row["portname"]),
                    "candidate_canonical_port_name": manual_port_aliases.get(normalize_name(row["portname"]), ""),
                    "source_identifier": source_id,
                    "mapping_status": "MANUAL_REVIEW",
                    "reason": reason,
                }
            )

    port_output_rows: list[dict[str, Any]] = []
    for port_id, record in sorted(port_records.items()):
        record = dict(record)
        record["source_dataset"] = ";".join(sorted(port_source_datasets[port_id]))
        record["source_name_variants"] = ";".join(sorted(port_name_variants[port_id]))
        port_output_rows.append(record)
    write_csv(
        "port.csv",
        port_output_rows,
        ["port_id", "canonical_port_name", "source_port_name", "source_name_variants", "un_locode", "latitude", "longitude", "country", "liquid_bulk_facility", "oil_terminal_facility", "source_dataset", "mapping_status", "mapping_method", "source_record_key", "world_port_index_number", "source_unlocode_status"],
    )
    write_csv(
        "port_source_mapping.csv",
        port_mapping_rows,
        ["port_id", "source_dataset", "source_record_key", "source_port_name", "source_world_port_index_number", "source_un_locode", "canonical_port_name", "mapping_status", "mapping_method", "review_reason"],
    )
    write_csv(
        "manual_review/port_manual_review.csv",
        manual_port_rows,
        ["source_dataset", "source_record_key", "source_port_name", "candidate_canonical_port_name", "source_identifier", "mapping_status", "reason"],
    )
    source_to_output["india_world_port_index.csv"].extend(["port.csv", "port_source_mapping.csv", "manual_review/port_manual_review.csv"])
    source_to_output["india_daily_port_activity_2019_2024.csv"].extend(["port.csv", "port_source_mapping.csv", "manual_review/port_manual_review.csv"])

    # ------------------------------------------------------------------
    # Refinery cleaning
    # ------------------------------------------------------------------
    refinery_output_rows: list[dict[str, Any]] = []
    refinery_state_manual = 0
    refinery_invalid = 0
    for row_number, row in enumerate(refinery_rows, start=2):
        source_company = normalize_name(row["company"])
        source_refinery = normalize_name(row["refinery"])
        source_state = normalize_name(row["state"])
        capacity = parse_decimal(row["capacity_thousand_metric_tonnes_per_year"])
        if capacity is None:
            refinery_invalid += 1
            add_issue("india_refinery_capacity_april_2026.csv", row_number, source_refinery, "invalid_numeric", "capacity_thousand_metric_tonnes_per_year", "BLOCKING", "Capacity could not be parsed as a number.")
        if source_state.upper() == "CHENNAI":
            refinery_state_manual += 1
            add_issue("india_refinery_capacity_april_2026.csv", row_number, source_refinery, "unresolved_region_mapping", "state", "REVIEW", "CHENNAI is retained as a normalized source location label; no state mapping was invented.")
        if capacity == 0:
            add_issue("india_refinery_capacity_april_2026.csv", row_number, source_refinery, "zero_reported_value", "capacity_thousand_metric_tonnes_per_year", "REVIEW", "Zero capacity is preserved as an explicit source value.")
        refinery_output_rows.append(
            {
                "refinery_id": stable_id("refinery", f"{source_company}|{source_refinery}"),
                "refinery_name": source_refinery,
                "company": title_case_source(source_company),
                "state": title_case_source(source_state),
                "capacity": decimal_text(row["capacity_thousand_metric_tonnes_per_year"]),
                "capacity_unit": "thousand_metric_tonnes_per_year",
                "latitude": "",
                "longitude": "",
                "source_company_name": source_company,
                "source_refinery_name": source_refinery,
                "source_state_name": source_state,
                "source_dataset": "india_refinery_capacity_april_2026.csv",
                "source_row_number": row_number,
                "state_mapping_status": "MANUAL_REVIEW" if source_state.upper() == "CHENNAI" else "STANDARDIZED_CASE_ONLY",
                "capacity_status": "ZERO_REPORTED" if capacity == 0 else "REPORTED",
            }
        )
    write_csv(
        "refinery.csv",
        refinery_output_rows,
        ["refinery_id", "refinery_name", "company", "state", "capacity", "capacity_unit", "latitude", "longitude", "source_company_name", "source_refinery_name", "source_state_name", "source_dataset", "source_row_number", "state_mapping_status", "capacity_status"],
    )
    source_to_output["india_refinery_capacity_april_2026.csv"].append("refinery.csv")

    # ------------------------------------------------------------------
    # Supplier imports
    # ------------------------------------------------------------------
    supplier_output_rows: list[dict[str, Any]] = []
    supplier_excluded = 0
    supplier_invalid = 0
    supplier_unresolved = 0
    for row_number, row in enumerate(supplier_rows, start=2):
        if clean(row["pc_description"]) != "Petroleum: Crude":
            supplier_excluded += 1
            excluded_records.append({"source_dataset": "supplier_crude_imports_2014_2017.csv", "source_row_number": str(row_number), "reason": "pc_description was not Petroleum: Crude"})
            continue
        normalized_period = period_by_source_label.get(("supplier_crude_imports_2014_2017.csv", clean(row["financial_year"])))
        if normalized_period is None:
            supplier_invalid += 1
            continue
        country_key = (clean(row["country_source_name"]), clean(row["country_normalized"]), clean(row["country_code"]))
        country_mapping = supplier_country_mapping[country_key]
        quantity = parse_decimal(row["quantity_tonnes"])
        if quantity is None:
            supplier_invalid += 1
            add_issue("supplier_crude_imports_2014_2017.csv", row_number, clean(row["country_code"]), "invalid_numeric", "quantity_tonnes", "BLOCKING", "Quantity could not be parsed as a number.")
        if country_mapping[2] != "MAPPED":
            supplier_unresolved += 1
        supplier_output_rows.append(
            {
                "financial_year": normalized_period[0],
                "financial_year_start": normalized_period[1],
                "country_id": country_mapping[0],
                "quantity_tonnes": decimal_text(row["quantity_tonnes"]),
                "quantity_unit": "tonnes" if clean(row["quantity_unit"]).casefold() in {"ton", "tonne", "tonnes"} else clean(row["quantity_unit"]),
                "source_country_name": clean(row["country_source_name"]),
                "source_country_normalized_name": clean(row["country_normalized"]),
                "country_code": clean(row["country_code"]),
                "source_product_code": clean(row["pc_code"]),
                "source_product_description": clean(row["pc_description"]),
                "product_id": crude_product_id,
                "source_quantity_unit": clean(row["quantity_unit"]),
                "source_trade_value_source_units": clean(row["trade_value_source_units"]),
                "source_dataset": "supplier_crude_imports_2014_2017.csv",
                "source_row_number": row_number,
                "country_mapping_status": country_mapping[2],
                "validation_status": "REVIEW" if country_mapping[2] != "MAPPED" else "VALID",
            }
        )
    write_csv(
        "supplier_imports.csv",
        supplier_output_rows,
        ["financial_year", "financial_year_start", "country_id", "quantity_tonnes", "quantity_unit", "source_country_name", "source_country_normalized_name", "country_code", "source_product_code", "source_product_description", "product_id", "source_quantity_unit", "source_trade_value_source_units", "source_dataset", "source_row_number", "country_mapping_status", "validation_status"],
    )
    source_to_output["supplier_crude_imports_2014_2017.csv"].append("supplier_imports.csv")

    # ------------------------------------------------------------------
    # National crude import totals
    # ------------------------------------------------------------------
    crude_total_output_rows: list[dict[str, Any]] = []
    crude_total_invalid = 0
    for row_number, row in enumerate(crude_total_rows, start=2):
        normalized_period = period_by_source_label.get(("india_crude_import_totals_2023_2026.csv", clean(row["financial_year"])))
        quantity = parse_decimal(row["crude_import_thousand_metric_tonnes"])
        valid = normalized_period is not None and quantity is not None
        if not valid:
            crude_total_invalid += 1
            add_issue("india_crude_import_totals_2023_2026.csv", row_number, clean(row["financial_year"]), "invalid_value", "financial_year or crude_import_thousand_metric_tonnes", "BLOCKING", "Financial year or quantity failed validation.")
        if normalized_period is None:
            continue
        crude_total_output_rows.append(
            {
                "financial_year": normalized_period[0],
                "financial_year_start": normalized_period[1],
                "quantity_thousand_metric_tonnes": decimal_text(row["crude_import_thousand_metric_tonnes"]),
                "quantity_unit": "thousand_metric_tonnes",
                "source_financial_year": clean(row["financial_year"]),
                "source_dataset": "india_crude_import_totals_2023_2026.csv",
                "source_row_number": row_number,
                "validation_status": "VALID" if valid else "REVIEW",
                "time_series_scope": "RECENT_NATIONAL_TOTALS_2023_2026",
            }
        )
    write_csv(
        "crude_import_totals.csv",
        crude_total_output_rows,
        ["financial_year", "financial_year_start", "quantity_thousand_metric_tonnes", "quantity_unit", "source_financial_year", "source_dataset", "source_row_number", "validation_status", "time_series_scope"],
    )
    source_to_output["india_crude_import_totals_2023_2026.csv"].append("crude_import_totals.csv")

    # ------------------------------------------------------------------
    # Petroleum consumption
    # ------------------------------------------------------------------
    month_name_by_number = {1: "JAN", 2: "FEB", 3: "MAR", 4: "APR", 5: "MAY", 6: "JUN", 7: "JUL", 8: "AUG", 9: "SEP", 10: "OCT", 11: "NOV", 12: "DEC"}
    consumption_output_rows: list[dict[str, Any]] = []
    consumption_invalid = 0
    for row_number, row in enumerate(consumption_rows, start=2):
        product_name = clean(row["product"])
        normalized_period = period_by_source_label.get(("india_petroleum_consumption.csv", clean(row["financial_year"])))
        month_number = parse_decimal(row["month_number"])
        consumption = parse_decimal(row["consumption_metric_tonnes"])
        valid = (
            product_name in product_id_by_consumption_name
            and normalized_period is not None
            and month_number is not None
            and month_number == int(month_number)
            and 1 <= int(month_number) <= 12
            and clean(row["month_name"]).upper() == month_name_by_number[int(month_number)]
            and parse_decimal(row["calendar_year"]) is not None
            and consumption is not None
        )
        if not valid:
            consumption_invalid += 1
            add_issue("india_petroleum_consumption.csv", row_number, f"{product_name}|{clean(row['financial_year'])}|{clean(row['month_number'])}", "invalid_value", "product/financial_year/month/consumption", "BLOCKING", "Consumption row failed product, period, month, or numeric validation.")
        if normalized_period is None or product_name not in product_id_by_consumption_name:
            continue
        consumption_output_rows.append(
            {
                "product_id": product_id_by_consumption_name[product_name],
                "product": product_name,
                "source_product_name": product_name,
                "financial_year": normalized_period[0],
                "financial_year_start": normalized_period[1],
                "calendar_year": clean(row["calendar_year"]),
                "month_number": clean(row["month_number"]),
                "month_name": clean(row["month_name"]).upper(),
                "consumption_metric_tonnes": decimal_text(row["consumption_metric_tonnes"]),
                "consumption_unit": "metric_tonnes",
                "source_dataset": "india_petroleum_consumption.csv",
                "source_row_number": row_number,
                "validation_status": "VALID" if valid else "REVIEW",
            }
        )
    write_csv(
        "petroleum_consumption.csv",
        consumption_output_rows,
        ["product_id", "product", "source_product_name", "financial_year", "financial_year_start", "calendar_year", "month_number", "month_name", "consumption_metric_tonnes", "consumption_unit", "source_dataset", "source_row_number", "validation_status"],
    )
    source_to_output["india_petroleum_consumption.csv"].append("petroleum_consumption.csv")

    # ------------------------------------------------------------------
    # Global oil snapshot
    # ------------------------------------------------------------------
    global_output_rows: list[dict[str, Any]] = []
    global_invalid = 0
    global_unresolved = 0
    global_metric_fields = [
        "proven_reserves_barrels",
        "production_barrels_per_day",
        "consumption_barrels_per_day",
        "exports_barrels_per_day",
        "imports_barrels_per_day",
    ]
    global_mapping_by_source = {
        row["source_name"]: row for row in country_mapping_rows if row["source_dataset"] == "global_oil_country.csv"
    }
    for row_number, row in enumerate(global_rows, start=2):
        source_name = clean(row["country"])
        country_mapping = global_mapping_by_source[source_name]
        source_rank = clean(row["Rank"])
        rank = source_rank if re.fullmatch(r"\d+", source_rank) else ""
        if not rank:
            global_invalid += 1
            add_issue("global_oil_country.csv", row_number, source_name, "invalid_rank", "Rank", "REVIEW", "Rank is an em dash or non-numeric; normalized rank is NULL and source text is preserved.")
        missing_metric_count = 0
        normalized_metrics: dict[str, str] = {}
        for field in global_metric_fields:
            raw_value = clean(row[field])
            if raw_value and parse_decimal(raw_value) is None:
                global_invalid += 1
                add_issue("global_oil_country.csv", row_number, source_name, "invalid_numeric", field, "REVIEW", "Metric could not be converted to a numeric value; normalized field is NULL.")
            if not raw_value:
                missing_metric_count += 1
                add_issue("global_oil_country.csv", row_number, source_name, "missing_metric", field, "REVIEW", "Source metric is missing; normalized field remains NULL.")
            normalized_metrics[field] = decimal_text(raw_value)
        global_output_rows.append(
            {
                "global_oil_snapshot_id": stable_id("global-oil", f"global_oil_country.csv:{row_number}"),
                "country_id": country_mapping["country_id"],
                "canonical_country_name": country_mapping["canonical_name"],
                "source_country_name": source_name,
                "source_rank": source_rank,
                "rank": rank,
                "source_proven_reserves_barrels": clean(row["proven_reserves_barrels"]),
                "proven_reserves_barrels": normalized_metrics["proven_reserves_barrels"],
                "source_production_barrels_per_day": clean(row["production_barrels_per_day"]),
                "production_barrels_per_day": normalized_metrics["production_barrels_per_day"],
                "source_consumption_barrels_per_day": clean(row["consumption_barrels_per_day"]),
                "consumption_barrels_per_day": normalized_metrics["consumption_barrels_per_day"],
                "source_exports_barrels_per_day": clean(row["exports_barrels_per_day"]),
                "exports_barrels_per_day": normalized_metrics["exports_barrels_per_day"],
                "source_imports_barrels_per_day": clean(row["imports_barrels_per_day"]),
                "imports_barrels_per_day": normalized_metrics["imports_barrels_per_day"],
                "as_of_date": "",
                "source_dataset": "global_oil_country.csv",
                "source_row_number": row_number,
                "missing_metric_count": missing_metric_count,
                "validation_status": "REVIEW" if missing_metric_count or not rank else "VALID",
            }
        )
    global_unresolved = sum(1 for row in global_output_rows if not clean(row["country_id"]))
    write_csv(
        "global_oil_snapshot.csv",
        global_output_rows,
        ["global_oil_snapshot_id", "country_id", "canonical_country_name", "source_country_name", "source_rank", "rank", "source_proven_reserves_barrels", "proven_reserves_barrels", "source_production_barrels_per_day", "production_barrels_per_day", "source_consumption_barrels_per_day", "consumption_barrels_per_day", "source_exports_barrels_per_day", "exports_barrels_per_day", "source_imports_barrels_per_day", "imports_barrels_per_day", "as_of_date", "source_dataset", "source_row_number", "missing_metric_count", "validation_status"],
    )
    source_to_output["global_oil_country.csv"].append("global_oil_snapshot.csv")

    # ------------------------------------------------------------------
    # Daily port activity
    # ------------------------------------------------------------------
    activity_output_rows: list[dict[str, Any]] = []
    activity_invalid = 0
    activity_unresolved = 0
    activity_numeric_fields = [
        "portcalls_container", "portcalls_dry_bulk", "portcalls_general_cargo", "portcalls_roro", "portcalls_tanker", "portcalls_cargo", "portcalls",
        "import_container", "import_dry_bulk", "import_general_cargo", "import_roro", "import_tanker", "import_cargo", "import",
        "export_container", "export_dry_bulk", "export_general_cargo", "export_roro", "export_tanker", "export_cargo", "export",
    ]
    for row_number, row in enumerate(activity_rows, start=2):
        source_port_id = clean(row["portid"])
        port_id = activity_port_id.get(source_port_id, "")
        source_port_name = normalize_name(row["portname"])
        port_status = activity_port_status.get(source_port_id, ("MANUAL_REVIEW", "missing_port_identity", "No activity port mapping was found."))
        if port_status[0] != "MAPPED":
            activity_unresolved += 1
        try:
            parsed_date = datetime.fromisoformat(clean(row["date"]).replace("/", "-").replace("+00", "+00:00"))
            date_valid = True
        except ValueError:
            parsed_date = None
            date_valid = False
        numeric_valid = True
        for field in activity_numeric_fields:
            parsed = parse_decimal(row[field])
            if parsed is None or parsed < 0:
                numeric_valid = False
                add_issue("india_daily_port_activity_2019_2024.csv", row_number, source_port_id, "invalid_numeric", field, "BLOCKING", "Port activity value was missing, non-numeric, or negative.")
        components_valid = date_valid and parsed_date.year == int(row["year"]) and parsed_date.month == int(row["month"]) and parsed_date.day == int(row["day"])
        if not date_valid or not components_valid:
            activity_invalid += 1
            add_issue("india_daily_port_activity_2019_2024.csv", row_number, source_port_id, "invalid_date", "date/year/month/day", "BLOCKING", "Source date could not be parsed or did not agree with its repeated components.")
        if not numeric_valid:
            activity_invalid += 1
        canonical_port_name = port_records[port_id]["canonical_port_name"] if port_id in port_records else ""
        output: dict[str, Any] = {
            "daily_activity_id": stable_id("daily-activity", f"india_daily_port_activity_2019_2024.csv:{row_number}"),
            "port_id": port_id,
            "source_port_id": source_port_id,
            "source_port_name": source_port_name,
            "canonical_port_name": canonical_port_name,
            "port_mapping_status": port_status[0],
            "port_mapping_method": port_status[1],
            "activity_date": parsed_date.date().isoformat() if parsed_date else "",
            "source_timestamp": clean(row["date"]),
            "source_year": clean(row["year"]),
            "source_month": clean(row["month"]),
            "source_day": clean(row["day"]),
            "source_country": clean(row["country"]),
            "source_iso3": clean(row["ISO3"]),
            "source_object_id": clean(row["ObjectId"]),
            "import_export_unit_status": "UNDOCUMENTED",
            "source_dataset": "india_daily_port_activity_2019_2024.csv",
            "source_row_number": row_number,
            "validation_status": "REVIEW" if port_status[0] != "MAPPED" or not date_valid or not numeric_valid or not components_valid else "VALID",
        }
        output.update({field: clean(row[field]) for field in activity_numeric_fields})
        activity_output_rows.append(output)
    activity_fields = [
        "daily_activity_id", "port_id", "source_port_id", "source_port_name", "canonical_port_name", "port_mapping_status", "port_mapping_method", "activity_date", "source_timestamp", "source_year", "source_month", "source_day", "source_country", "source_iso3", *activity_numeric_fields, "source_object_id", "import_export_unit_status", "source_dataset", "source_row_number", "validation_status"
    ]
    write_csv("daily_port_activity.csv", activity_output_rows, activity_fields)
    source_to_output["india_daily_port_activity_2019_2024.csv"].append("daily_port_activity.csv")

    # ------------------------------------------------------------------
    # Shipping lane metadata; original GeoJSON remains untouched.
    # ------------------------------------------------------------------
    lane_metadata_rows: list[dict[str, Any]] = []
    lane_invalid = 0
    for feature_index, feature in enumerate(lanes_geojson.get("features", []), start=1):
        geometry = feature.get("geometry") or {}
        coordinates = geometry.get("coordinates") or []
        geometry_valid = geometry.get("type") == "MultiLineString"
        coordinate_epsilon = 1e-9
        point_count = 0
        bounds: list[float] | None = None
        if geometry_valid:
            for line in coordinates:
                if not isinstance(line, list) or not line:
                    geometry_valid = False
                    continue
                for point in line:
                    if not isinstance(point, list) or len(point) != 2 or not all(isinstance(value, (int, float)) for value in point):
                        geometry_valid = False
                        continue
                    longitude, latitude = point
                    if not (-180 - coordinate_epsilon <= longitude <= 180 + coordinate_epsilon and -90 - coordinate_epsilon <= latitude <= 90 + coordinate_epsilon):
                        geometry_valid = False
                    point_count += 1
                    if bounds is None:
                        bounds = [longitude, latitude, longitude, latitude]
                    else:
                        bounds = [min(bounds[0], longitude), min(bounds[1], latitude), max(bounds[2], longitude), max(bounds[3], latitude)]
        if not geometry_valid:
            lane_invalid += 1
            add_issue("shipping_lanes_v1.geojson", feature_index, str(feature.get("id", feature_index - 1)), "invalid_geometry", "geometry", "BLOCKING", "Feature geometry is not a valid MultiLineString with bounded coordinate pairs.")
        properties = feature.get("properties") or {}
        lane_metadata_rows.append(
            {
                "shipping_lane_id": stable_id("shipping-lane", f"shipping_lanes_v1.geojson:{feature_index}:{feature.get('id', '')}"),
                "source_feature_id": str(feature.get("id", "")),
                "source_object_id": clean(properties.get("OBJECTID")),
                "feature_name": clean(properties.get("name")),
                "lane_category": clean(properties.get("Type")),
                "geometry_type": clean(geometry.get("type")),
                "line_part_count": len(coordinates) if isinstance(coordinates, list) else 0,
                "coordinate_point_count": point_count,
                "geometry_valid": "TRUE" if geometry_valid else "FALSE",
                "geometry_bounds_lon_lat": json.dumps(bounds) if bounds else "",
                "source_geometry_crs_status": "UNDECLARED",
                "source_dataset": "shipping_lanes_v1.geojson",
                "source_feature_number": feature_index,
                "validation_status": "VALID" if geometry_valid else "REVIEW",
            }
        )
        if not clean(properties.get("name")):
            add_issue("shipping_lanes_v1.geojson", feature_index, str(feature.get("id", feature_index - 1)), "missing_metadata", "feature_name", "REVIEW", "GeoJSON feature has no feature name; lane category is preserved from Type.")
    write_csv(
        "shipping_lanes_metadata.csv",
        lane_metadata_rows,
        ["shipping_lane_id", "source_feature_id", "source_object_id", "feature_name", "lane_category", "geometry_type", "line_part_count", "coordinate_point_count", "geometry_valid", "geometry_bounds_lon_lat", "source_geometry_crs_status", "source_dataset", "source_feature_number", "validation_status"],
    )
    source_to_output["shipping_lanes_v1.geojson"].append("shipping_lanes_metadata.csv")
    # Keep a byte-preserved processed copy so downstream imports can use the
    # reviewed source geometry without rewriting or manually reconstructing it.
    processed_geojson_path = OUTPUT / "shipping_lanes_v1.geojson"
    processed_geojson_path.write_bytes((RAW / "shipping_lanes_v1.geojson").read_bytes())
    source_to_output["shipping_lanes_v1.geojson"].append("shipping_lanes_v1.geojson")

    # ------------------------------------------------------------------
    # Quality summaries, issues, manifest, and report
    # ------------------------------------------------------------------
    quality_specs = [
        ("financial_period", "financial_period.csv", "MULTIPLE", len(period_rows), len(period_rows), 0, ["financial_period_id", "financial_year"], 0, 0, 0, "Financial-year labels normalized; original labels retained."),
        ("product", "product.csv", "MULTIPLE", len(product_rows), len(product_rows), 0, ["product_id", "canonical_name"], 0, 0, 0, "Only unambiguous source product labels were mapped."),
        ("country", "country.csv", "MULTIPLE", len(country_rows), len(country_rows), 0, ["country_id", "canonical_name"], 0, 0, len(manual_country_rows), "Canonical countries derive from the global country source; unresolved supplier aliases remain in review."),
        ("country_source_mapping", "country_source_mapping.csv", "MULTIPLE", len(country_mapping_rows), len(country_mapping_rows), 0, ["country_id", "source_name", "source_dataset"], 0, 0, len(manual_country_rows), "Every distinct source country identity retained."),
        ("port", "port.csv", "MULTIPLE", len(port_output_rows), len(port_output_rows), 0, ["port_id", "canonical_port_name", "country", "liquid_bulk_facility", "oil_terminal_facility"], 0, 0, sum(1 for row in port_output_rows if row["mapping_status"] != "MAPPED"), "World Port Index duplicates remain separate; facility values are preserved exactly where supplied and remain empty for non-WPI provisional identities."),
        ("port_source_mapping", "port_source_mapping.csv", "MULTIPLE", len(port_mapping_rows), len(port_mapping_rows), 0, ["port_id", "source_record_key", "source_port_name"], 0, 0, sum(1 for row in port_mapping_rows if row["mapping_status"] != "MAPPED"), "Source identities are preserved even when aliases are unresolved."),
        ("refinery", "refinery.csv", "india_refinery_capacity_april_2026.csv", len(refinery_rows), len(refinery_output_rows), 0, ["refinery_id", "refinery_name", "capacity", "capacity_unit", "latitude", "longitude"], duplicate_group_count(refinery_output_rows, ["refinery_name", "company"]), refinery_invalid, refinery_state_manual, "Coordinates remain NULL; CHENNAI state label remains manual review."),
        ("supplier_imports", "supplier_imports.csv", "supplier_crude_imports_2014_2017.csv", len(supplier_rows), len(supplier_output_rows), supplier_excluded, ["financial_year", "country_id", "quantity_tonnes", "quantity_unit"], duplicate_group_count(supplier_output_rows, ["financial_year", "country_code", "source_product_code"]), supplier_invalid, supplier_unresolved, "All source rows are Petroleum: Crude in this package; trade value units remain undocumented."),
        ("crude_import_totals", "crude_import_totals.csv", "india_crude_import_totals_2023_2026.csv", len(crude_total_rows), len(crude_total_output_rows), len(crude_total_rows) - len(crude_total_output_rows), ["financial_year", "quantity_thousand_metric_tonnes", "quantity_unit"], duplicate_group_count(crude_total_output_rows, ["financial_year"]), crude_total_invalid, 0, "Recent national totals remain separate from historical supplier imports."),
        ("petroleum_consumption", "petroleum_consumption.csv", "india_petroleum_consumption.csv", len(consumption_rows), len(consumption_output_rows), len(consumption_rows) - len(consumption_output_rows), ["product_id", "financial_year", "month_number", "consumption_metric_tonnes", "consumption_unit"], duplicate_group_count(consumption_output_rows, ["product_id", "financial_year", "month_number"]), consumption_invalid, 0, "Products remain separate; no crude-oil merge."),
        ("global_oil_snapshot", "global_oil_snapshot.csv", "global_oil_country.csv", len(global_rows), len(global_output_rows), 0, ["country_id", "rank", "proven_reserves_barrels", "production_barrels_per_day", "consumption_barrels_per_day", "exports_barrels_per_day", "imports_barrels_per_day"], duplicate_group_count(global_output_rows, ["source_country_name"]), global_invalid, global_unresolved, "Missing metrics and em-dash ranks are normalized to NULL while raw fields are preserved."),
        ("daily_port_activity", "daily_port_activity.csv", "india_daily_port_activity_2019_2024.csv", len(activity_rows), len(activity_output_rows), 0, ["daily_activity_id", "port_id", "activity_date", "portcalls", "import", "export"], duplicate_group_count(activity_output_rows, ["port_id", "activity_date"]), activity_invalid, activity_unresolved, "Port import/export measures remain numeric but undocumented in unit; source values preserved."),
        ("shipping_lanes_metadata", "shipping_lanes_metadata.csv", "shipping_lanes_v1.geojson", len(lanes_geojson.get("features", [])), len(lane_metadata_rows), 0, ["shipping_lane_id", "lane_category", "geometry_type", "geometry_valid"], duplicate_group_count(lane_metadata_rows, ["source_feature_id"]), lane_invalid + sum(1 for row in lane_metadata_rows if not row["feature_name"]), 0, "A byte-preserved processed GeoJSON copy accompanies the metadata; geometry is validated and no route relationships are inferred."),
    ]
    for spec in quality_specs:
        register_quality(*spec)

    write_csv(
        "data_quality_summary.csv",
        quality_records,
        ["dataset", "processed_file", "source_dataset", "input_row_count", "output_row_count", "excluded_row_count", "null_count_by_important_field", "duplicate_count", "invalid_value_count", "unresolved_mapping_count", "notes"],
    )
    write_csv(
        "data_quality_issues.csv",
        issues,
        ["source_dataset", "source_row_number", "source_record_key", "issue_type", "field_name", "severity", "issue_status", "description"],
    )
    write_csv(
        "data_source.csv",
        [dict(row, processed_outputs=";".join(sorted(set(source_to_output.get(row["source_dataset"], []))))) for row in data_source_rows],
        ["data_source_id", "source_dataset", "source_path", "source_format", "source_row_or_feature_count", "coverage_or_snapshot", "source_sha256", "raw_files_modified", "processed_outputs"],
    )

    issue_counts = Counter(issue["issue_type"] for issue in issues)
    unresolved_country_count = sum(int(row["occurrence_count"]) for row in manual_country_rows)
    unresolved_port_identity_count = sum(1 for row in port_mapping_rows if row["mapping_status"] != "MAPPED")
    report_lines = [
        "# ORBIT Phase 2 Cleaning Report",
        "",
        "This report documents Phase 2 Step 3C cleaning and canonical mapping. The source files under `D:\\ORBIT\\Data` were treated as immutable and were read only. All generated datasets are under `D:\\ORBIT\\data\\processed\\`.",
        "",
        f"Generated at: `{datetime.now().isoformat(timespec='seconds')}`",
        "",
        "## 1. Processing policy",
        "",
        "- No raw source file was modified, overwritten, renamed, moved, or deleted.",
        "- Every processed record retains `source_dataset` and a source row, feature, or source-identity key.",
        "- Canonical IDs are deterministic hashes of reviewed source/canonical identities; no random IDs were created.",
        "- Missing values remain NULL/empty in normalized fields; explicit source zeroes remain zero.",
        "- No coordinates, capacities, routes, refinery-port links, chokepoints, or strategic-reserve values were invented.",
        "- No commodity-wise port mapping source was found in the project beyond the audited World Port Index and daily port-activity files. No additional commodity-port relationship was created.",
        "",
        "## 2. Files created",
        "",
        "| File | Purpose |",
        "|---|---|",
        "| `data_source.csv` | Source manifest, coverage, SHA-256 fingerprints, and derived-output traceability |",
        "| `financial_period.csv` | Shared normalized financial-year dimension |",
        "| `product.csv` | Canonical product dimension, including crude oil and 12 consumption products |",
        "| `product_source_mapping.csv` | Product source-label/code mappings |",
        "| `country.csv` | Canonical country entity table |",
        "| `country_source_mapping.csv` | Source country-to-canonical mappings |",
        "| `manual_review/country_manual_review.csv` | Ambiguous/unmatched country mappings |",
         "| `port.csv` | Canonical/provisional port identities and source facility flags |",
        "| `port_source_mapping.csv` | World Port Index and daily-activity identity mappings |",
        "| `manual_review/port_manual_review.csv` | Duplicate identifiers and unresolved port aliases |",
        "| `refinery.csv` | Standardized refinery/company/state/capacity records with NULL coordinates |",
        "| `supplier_imports.csv` | Historical crude imports by supplier country and financial year |",
        "| `crude_import_totals.csv` | Recent national crude-import totals kept as a separate series |",
        "| `petroleum_consumption.csv` | Monthly product consumption |",
        "| `global_oil_snapshot.csv` | Global oil data with nullable invalid/missing metrics |",
        "| `daily_port_activity.csv` | Daily port activity with canonical/provisional port IDs |",
         "| `shipping_lanes_metadata.csv` | Three lane-category feature metadata and geometry validation |",
         "| `shipping_lanes_v1.geojson` | Byte-preserved processed copy of the source shipping-lane geometry |",
        "| `data_quality_summary.csv` | Row, null, duplicate, invalid, and unresolved-mapping metrics |",
        "| `data_quality_issues.csv` | Traceable row/field-level quality issues |",
        "",
        "## 3. Source and output counts",
        "",
        "| Dataset | Input rows/features | Output rows | Excluded |",
        "|---|---:|---:|---:|",
    ]
    for record in quality_records:
        report_lines.append(f"| `{record['dataset']}` | {record['input_row_count']} | {record['output_row_count']} | {record['excluded_row_count']} |")
    report_lines.extend(
        [
            "",
            "### Excluded rows",
            "",
            f"- Total excluded rows: **{sum(int(record['excluded_row_count']) for record in quality_records)}**.",
            "- The supplier cleaner was instructed to retain only `Petroleum: Crude`; all 128 supplied rows already matched, so none were excluded.",
            "- No rows were excluded from global oil, port activity, refinery, consumption, crude-total, or shipping-lane outputs. Invalid/missing fields were preserved with review flags or NULL normalized values.",
            "",
            "## 4. Country canonicalization",
            "",
            f"- Canonical country entities created: **{len(country_rows)}**.",
            f"- Distinct source mapping rows created: **{len(country_mapping_rows)}**.",
            f"- Unresolved/manual-review country identities: **{len(manual_country_rows)}** distinct identities, covering **{unresolved_country_count}** supplier rows.",
            "- Safe explicit repairs: replacement-character variants of global `Côte d'Ivoire`/`Curaçao` map to their accented canonical names when encountered; supplier `Cote D' Ivoire` maps to `Côte d'Ivoire`; supplier `Kyrghyzstan` maps to `Kyrgyzstan`.",
            "- Manual review: `Netherlandantil`, `Pakistan Ir`, `Panama C Z`, and `Unspecified`. These were not guessed or mapped.",
            "- Supplier `country_code` values were preserved as source codes; no ISO standard was assumed.",
            "",
            "## 5. Port canonicalization",
            "",
            f"- Port source identities processed: **{len(port_mapping_rows)}** ({len(wpi_rows)} World Port Index rows plus {len(unique_activity_ports)} daily activity port identities).",
            f"- Canonical/provisional port records created: **{len(port_output_rows)}**.",
            f"- Port source identities with non-MAPPED status: **{unresolved_port_identity_count}**; activity rows carrying unresolved port mappings: **{sum(1 for row in activity_output_rows if row['port_mapping_status'] != 'MAPPED')}**; manual-review records including duplicate identifiers: **{len(manual_port_rows)}**.",
            "- Safe aliases applied only where the target name was unique and the alias was explicit: Cochin/Kochi, Dhamra Port/Dhamra, Haldia/Haldia Port, Karaikal/Karaikal Port, Kattupalli/Kattupalli Port, Krishnapatnam Port/Krishnapatnam, Mormugao/Marmagao, Mumbai-JNPT/Nhava Sheva, Pipavav/Pipavav Bandar, V. O. Chidambaranar/Tuticorin, Visakhapatnam/Vishakhapatnam, and Deendayal/Kandla.",
            "- `Vizhinjam`, `Jaigad Port`, and `Kakinada` remain manual review; candidates are none, `Jaigarh Bay`, and `Kakinada Bay`, respectively.",
            "- World Port Index `49460.0` Machilipatnam rows were retained as separate source identities; the duplicate `INKRI` code was not used as a merge key.",
             "- World Port Index `liquid_bulk_facility` and `oil_terminal_facility` values are preserved as source strings; blank values on provisional activity-only identities remain unresolved.",
             "- No refinery-to-port or commodity-to-port relationships were created.",
            "",
            "## 6. Refinery cleaning",
            "",
            f"- Refinery rows processed: **{len(refinery_output_rows)}**.",
            "- Company and state names were standardized for whitespace/casing while source names were retained.",
            "- Capacity was retained in `thousand_metric_tonnes_per_year`.",
            "- Latitude and longitude are NULL for all refinery rows because the source provides no reliable coordinates.",
            f"- State mapping review rows: **{refinery_state_manual}**; the source label `CHENNAI` was not converted to a different state.",
            "- The reported zero capacity for `CPCL, Cauvery Basin*` remains zero and is flagged `ZERO_REPORTED`.",
            "",
            "## 7. Supplier imports, crude totals, and consumption",
            "",
            "- Supplier imports were retained only for `Petroleum: Crude`; quantity was normalized to tonnes and the original country/product/unit fields were preserved.",
            "- `supplier_imports.csv` remains FY2014-15 through FY2016-17.",
            "- `crude_import_totals.csv` remains a separate national series for FY2023-24 through FY2025-26; it was not combined with supplier imports.",
            "- Petroleum consumption remains 12 separate petroleum products and was not merged into crude oil.",
            "- Supplier trade-value values remain source values with undocumented currency/scale; no conversion or aggregation was performed.",
            "",
            "## 8. Global oil and daily activity handling",
            "",
            "- Global oil em-dash ranks were preserved in `source_rank` and normalized `rank` was left NULL.",
            "- Global missing metrics were left NULL; explicit zero values were preserved as zero.",
            "- Daily activity dates were parsed and normalized to ISO dates after validating the repeated year/month/day fields.",
            "- Daily port-call values were validated as non-negative counts.",
            "- Daily import/export values were preserved numerically, but their unit remains `UNDOCUMENTED`; no tonnes or other unit was invented.",
            "",
            "## 9. Shipping-lane handling",
            "",
             "- The original `shipping_lanes_v1.geojson` was not modified; a byte-preserved copy is written to `data/processed/shipping_lanes_v1.geojson` for the read-only importer.",
            f"- Metadata was created for **{len(lane_metadata_rows)}** features: Major, Middle, and Minor.",
            "- Geometry structure and coordinate bounds were validated with a 1e-9 floating-point boundary tolerance; no route names, endpoints, commodities, chokepoints, or port relationships were added.",
            "- Feature names are absent from the source and remain NULL in metadata.",
            "",
            "## 10. Data quality summary",
            "",
            "The machine-readable summary is `data_quality_summary.csv`. Important-field null counts are stored as JSON in that file.",
            "",
            "| Issue type | Count |",
            "|---|---:|",
        ]
    )
    for issue_type, count in sorted(issue_counts.items()):
        report_lines.append(f"| `{issue_type}` | {count} |")
    report_lines.extend(
        [
            "",
            "The detailed issue file is `data_quality_issues.csv`; each issue retains the source dataset and source row/record key where available.",
            "",
            "## 11. Remaining limitations",
            "",
            "1. Country mappings still require review for four ambiguous supplier labels covering six supplier rows.",
            "2. Three daily port aliases remain unresolved, and World Port Index duplicate identifiers/UN/LOCODE collisions remain separate source identities.",
            "3. No reliable refinery coordinates or refinery-port relationships are available.",
            "4. Daily port import/export units and supplier trade-value units remain undocumented.",
            "5. Global oil and World Port Index observation dates are not supplied.",
             "6. Shipping lanes have real geometry but no semantic route endpoints or chokepoint mappings.",
            "7. Time ranges remain non-overlapping across supplier imports and recent national crude totals.",
            "8. No database implementation, API exposure, Digital Twin, agents, or UI changes were performed.",
            "",
            "## 12. Traceability",
            "",
            "- `data_source.csv` records source paths, input counts, SHA-256 fingerprints, and derived outputs.",
            "- Processed fact records retain `source_dataset` and `source_row_number`.",
            "- Port mappings retain source dataset, source record key, original source name, and mapping method/status.",
            "- Country mappings retain source name, source normalized name, source dataset, and source code where available.",
            "- The raw source files remain outside the processed directory and were not modified.",
        ]
    )
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    print(json.dumps({
        "output_directory": str(OUTPUT),
        "report": str(REPORT_PATH),
        "source_row_counts": source_row_counts,
         "processed_files": sorted(path.name for path in OUTPUT.glob("*") if path.is_file()),
        "manual_review_files": sorted(path.name for path in MANUAL_REVIEW.glob("*.csv")),
        "country_canonical_count": len(country_rows),
        "country_manual_review_count": len(manual_country_rows),
        "port_source_identity_count": len(port_mapping_rows),
        "port_record_count": len(port_output_rows),
        "port_manual_review_count": len(manual_port_rows),
        "excluded_total": sum(int(record["excluded_row_count"]) for record in quality_records),
        "issue_count": len(issues),
        "issue_type_counts": dict(sorted(issue_counts.items())),
    }, indent=2))


if __name__ == "__main__":
    main()
