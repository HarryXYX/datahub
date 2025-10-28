# Optional PySpark Support for Data Lake Sources

DataHub's S3, GCS, ABS, and Unity Catalog sources now support optional PySpark installation through `-slim` variants. This allows users to choose lightweight installations when data lake profiling is not needed.

## Overview

S3, GCS, and ABS sources include PySpark by default for backward compatibility. For users who only need metadata extraction without profiling, `-slim` variants provide a ~500MB smaller installation.

## PySpark Version

> **Current Version:** PySpark 3.5.x (3.5.6)
>
> PySpark 4.0 support is planned for a future release. Until then, all DataHub components use PySpark 3.5.x for compatibility and stability.

## Installation Options

### Standard Installation (includes PySpark) - Default

```bash
pip install 'acryl-datahub[s3]'         # S3 with PySpark/profiling
pip install 'acryl-datahub[gcs]'        # GCS with PySpark/profiling
pip install 'acryl-datahub[abs]'        # ABS with PySpark/profiling
pip install 'acryl-datahub[s3,gcs,abs]' # All three with PySpark/profiling
```

### Lightweight Installation (without PySpark) - New!

For installations where you don't need profiling capabilities and want to save ~500MB:

```bash
pip install 'acryl-datahub[s3-slim]'         # S3 without PySpark
pip install 'acryl-datahub[gcs-slim]'        # GCS without PySpark
pip install 'acryl-datahub[abs-slim]'        # ABS without PySpark
pip install 'acryl-datahub[s3-slim,gcs-slim,abs-slim]' # All three without PySpark
```

The `data-lake-profiling` dependencies (included in standard `s3/gcs/abs` by default):

- `pyspark~=3.5.6`
- `pydeequ>=1.1.0`
- Profiling dependencies (cachetools)

> **Note:** In a future major release (e.g., DataHub 2.0), the `-slim` variants will become the default, and PySpark will be optional. This current approach provides backward compatibility while giving users time to adapt.

### What's Included

**Standard extras (`s3`, `gcs`, `abs`):**

- ✅ Metadata extraction (schemas, tables, file listing)
- ✅ Data format detection (Parquet, Avro, CSV, JSON, etc.)
- ✅ Schema inference from files
- ✅ Table and column-level metadata
- ✅ Tags and properties extraction
- ✅ Data profiling (min/max, nulls, distinct counts)
- ✅ Data quality checks (PyDeequ-based)
- Includes: PySpark 3.5.6 + PyDeequ

**Slim variants (`s3-slim`, `gcs-slim`, `abs-slim`):**

- ✅ Metadata extraction (schemas, tables, file listing)
- ✅ Data format detection (Parquet, Avro, CSV, JSON, etc.)
- ✅ Schema inference from files
- ✅ Table and column-level metadata
- ✅ Tags and properties extraction
- ❌ Data profiling (min/max, nulls, distinct counts)
- ❌ Data quality checks (PyDeequ-based)
- No PySpark dependencies (~500MB smaller)

**Unity Catalog behavior:**

- Without PySpark: Uses sqlglot for SQL parsing (graceful fallback)
- With PySpark: Uses PySpark's SQL parser for better accuracy

## Feature Comparison

| Feature                 | Slim variants (`-slim`) | Standard (`s3`, `gcs`, `abs`) |
| ----------------------- | ----------------------- | ----------------------------- |
| **S3/GCS/ABS metadata** | ✅ Full support         | ✅ Full support               |
| **Schema inference**    | ✅ Basic inference      | ✅ Enhanced inference         |
| **Data profiling**      | ❌ Not available        | ✅ Full profiling             |
| **Unity Catalog**       | ✅ sqlglot parser       | ✅ PySpark parser             |
| **Installation size**   | ~200MB                  | ~700MB                        |
| **Install time**        | Fast                    | Slower (PySpark compilation)  |

## Configuration

### With Standard Installation (PySpark included)

When you install `acryl-datahub[s3]`, profiling works out of the box:

```yaml
source:
  type: s3
  config:
    path_specs:
      - include: s3://my-bucket/data/**/*.parquet
    profiling:
      enabled: true # Works seamlessly with standard installation
      profile_table_level_only: false
```

### With Slim Installation (no PySpark)

When you install `acryl-datahub[s3-slim]`, disable profiling in your config:

```yaml
source:
  type: s3
  config:
    path_specs:
      - include: s3://my-bucket/data/**/*.parquet
    profiling:
      enabled: false # Required for -slim variants
```

**If you enable profiling with -slim installation**, you'll see a runtime warning and profiling will be skipped.

## Developer Guide

If you're developing a new data lake source that uses PySpark or other optional heavy dependencies, see the [Adding a Metadata Ingestion Source](../metadata-ingestion/adding-source.md#31-using-optional-dependencies-eg-pyspark) guide for the recommended implementation pattern.

## Troubleshooting

### Warning: "Data lake profiling disabled: PySpark/PyDeequ not available"

**Problem:** You installed a `-slim` variant but have profiling enabled in your config.

**Solutions:**

1. Use standard installation (includes PySpark): `pip install 'acryl-datahub[s3]'`
2. Disable profiling in your recipe: `profiling.enabled: false`

### Verifying Installation

Check if PySpark is installed:

```bash
# Check installed packages
pip list | grep pyspark

# Test import in Python
python -c "import pyspark; print(pyspark.__version__)"
```

Expected output:

- Standard installation (`s3`, `gcs`, `abs`): Shows `pyspark 3.5.x`
- Slim installation (`s3-slim`, `gcs-slim`, `abs-slim`): Import fails or package not found

## Migration Guide

### Upgrading from Previous Versions

**No action required!** This change is fully backward compatible:

```bash
# Existing installations continue to work exactly as before
pip install 'acryl-datahub[s3]'  # Still includes PySpark by default
pip install 'acryl-datahub[gcs]'  # Still includes PySpark by default
pip install 'acryl-datahub[abs]'  # Still includes PySpark by default
```

**Optional: Reduce footprint for non-profiling use cases**

If you don't need profiling, you can now opt into lighter installations:

```bash
# Switch to slim variants to save ~500MB
pip install 'acryl-datahub[s3-slim]'
pip install 'acryl-datahub[gcs-slim]'
pip install 'acryl-datahub[abs-slim]'
```

### No Breaking Changes

This implementation maintains full backward compatibility:

- Standard `s3`, `gcs`, `abs` extras include PySpark (unchanged behavior)
- All existing recipes and configs continue to work
- New `-slim` variants available for users who want smaller installations
- Future DataHub 2.0 may flip defaults, but provides migration path

## Benefits for DataHub Actions

[DataHub Actions](https://github.com/datahub-project/datahub/tree/master/datahub-actions) depends on `acryl-datahub` and can benefit from `-slim` variants when profiling is not needed:

### Reduced Installation Size

DataHub Actions typically doesn't need data lake profiling capabilities since it focuses on reacting to metadata events, not extracting metadata from data lakes. Use `-slim` variants to reduce footprint:

```bash
# If Actions needs S3 metadata access but not profiling
pip install acryl-datahub-actions
pip install 'acryl-datahub[s3-slim]'
# Result: ~500MB smaller than standard s3 extra

# If Actions needs full S3 with profiling
pip install acryl-datahub-actions
pip install 'acryl-datahub[s3]'
# Result: Includes PySpark for profiling capabilities
```

### Faster Deployment

Actions services using `-slim` variants deploy faster in containerized environments:

- **Faster pip install**: No PySpark compilation required
- **Smaller Docker images**: Reduced base image size
- **Quicker cold starts**: Less code to load and initialize

### Fewer Dependency Conflicts

Actions workflows often integrate with other tools (Slack, Teams, email services). Using `-slim` variants reduces:

- Python version constraint conflicts
- Java/Spark runtime conflicts in restricted environments
- Transitive dependency version mismatches

### When Actions Needs Profiling

If your Actions workflow needs to trigger data lake profiling jobs, use the standard extras:

```bash
# Actions with data lake profiling capability (standard extras include PySpark)
pip install 'acryl-datahub-actions'
pip install 'acryl-datahub[s3]'  # Includes PySpark by default
```

**Common Actions use cases that DON'T need PySpark:**

- Slack notifications on schema changes
- Propagating tags and terms to downstream systems
- Triggering dbt runs on metadata updates
- Sending emails on data quality failures
- Creating Jira tickets for governance issues
- Updating external catalogs (e.g., Alation, Collibra)

**Rare Actions use cases that MIGHT need PySpark:**

- Custom actions that programmatically trigger S3/GCS/ABS profiling
- Actions that directly process data lake files (not typical)

## Benefits Summary

✅ **Backward compatible**: Standard extras unchanged, existing users unaffected
✅ **Smaller installations**: Save ~500MB with `-slim` variants
✅ **Faster setup**: No PySpark compilation with `-slim` variants
✅ **Flexible deployment**: Choose based on profiling needs
✅ **Clear migration path**: Future-proof for DataHub 2.0 transition
✅ **Actions-friendly**: DataHub Actions benefits from reduced footprint with `-slim` variants
