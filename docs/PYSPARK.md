# Optional PySpark Support for Data Lake Sources

DataHub's S3, GCS, ABS, and Unity Catalog sources now support optional PySpark installation. This allows users to install only the dependencies they need, reducing installation size and complexity when data lake profiling is not required.

## Overview

Previously, PySpark was a required dependency for S3, GCS, ABS, and Unity Catalog sources, even when profiling was disabled. This created unnecessary installation overhead (~500MB) and potential dependency conflicts for users who only needed metadata extraction without profiling.

**Now you can choose:**

- **Lightweight installation**: Metadata extraction without PySpark (~500MB smaller)
- **Full installation**: Metadata extraction + profiling with PySpark and PyDeequ

## PySpark Version

> **Current Version:** PySpark 3.5.x (3.5.6)
>
> PySpark 4.0 support is planned for a future release. Until then, all DataHub components use PySpark 3.5.x for compatibility and stability.

## Installation Options

### Option 1: Modular Installation (Recommended)

Install base source support, then add profiling if needed:

```bash
# S3 without profiling
pip install 'acryl-datahub[s3]'

# S3 with profiling
pip install 'acryl-datahub[s3,data-lake-profiling]'

# Multiple sources with profiling
pip install 'acryl-datahub[s3,gcs,abs,data-lake-profiling]'
```

### Option 2: Convenience Variants

All-in-one extras that include profiling:

```bash
# S3 with profiling (convenience)
pip install 'acryl-datahub[s3-profiling]'

# GCS with profiling
pip install 'acryl-datahub[gcs-profiling]'

# ABS with profiling
pip install 'acryl-datahub[abs-profiling]'
```

### What's Included

**Base extras (`s3`, `gcs`, `abs`):**

- ✅ Metadata extraction (schemas, tables, file listing)
- ✅ Data format detection (Parquet, Avro, CSV, JSON, etc.)
- ✅ Schema inference from files
- ✅ Table and column-level metadata
- ✅ Tags and properties extraction
- ❌ Data profiling (min/max, nulls, distinct counts)
- ❌ Data quality checks (PyDeequ-based)

**With `data-lake-profiling` extra:**

- ✅ All base functionality
- ✅ Data profiling with PyDeequ
- ✅ Statistical analysis (min, max, mean, stddev)
- ✅ Null count and distinct count analysis
- ✅ Histogram generation
- Includes: `pyspark~=3.5.6`, `pydeequ>=1.1.0`

**Unity Catalog behavior:**

- Without PySpark: Uses sqlglot for SQL parsing (graceful fallback)
- With PySpark: Uses PySpark's SQL parser for better accuracy

## Feature Comparison

| Feature                 | Without PySpark    | With PySpark                 |
| ----------------------- | ------------------ | ---------------------------- |
| **S3/GCS/ABS metadata** | ✅ Full support    | ✅ Full support              |
| **Schema inference**    | ✅ Basic inference | ✅ Enhanced inference        |
| **Data profiling**      | ❌ Not available   | ✅ Full profiling            |
| **Unity Catalog**       | ✅ sqlglot parser  | ✅ PySpark parser            |
| **Installation size**   | ~200MB             | ~700MB                       |
| **Install time**        | Fast               | Slower (PySpark compilation) |

## Configuration

### Enabling Profiling

When profiling is enabled in your recipe, DataHub validates that PySpark is installed:

```yaml
source:
  type: s3
  config:
    path_specs:
      - include: s3://my-bucket/data/**/*.parquet
    profiling:
      enabled: true # Requires data-lake-profiling extra
      profile_table_level_only: false
```

**If PySpark is not installed**, you'll see a clear error message:

```
ValueError: Data lake profiling is enabled but required dependencies are not installed.
PySpark and PyDeequ are required for S3 profiling.
Please install with: pip install 'acryl-datahub[s3,data-lake-profiling]'
See docs/PYSPARK.md for more information.
```

### Disabling Profiling

To use S3/GCS/ABS without PySpark, simply disable profiling:

```yaml
source:
  type: s3
  config:
    path_specs:
      - include: s3://my-bucket/data/**/*.parquet
    profiling:
      enabled: false # No PySpark required
```

### Adding PySpark Support to New Sources

If you're developing a new data lake source, follow this pattern:

```python
from datahub.ingestion.source.data_lake_common import pyspark_utils

# At module level - detect availability
_PYSPARK_AVAILABLE = pyspark_utils.is_pyspark_available()

# In your source class
if _PYSPARK_AVAILABLE and self.config.profiling.enabled:
    # Import PySpark modules conditionally
    from pyspark.sql import SparkSession
    # ... use PySpark for profiling
else:
    logger.info("Profiling disabled or PySpark not available")
```

## Troubleshooting

### Error: "PySpark is not installed"

**Problem:** You're trying to use profiling but PySpark is not installed.

**Solution:**

```bash
pip install 'acryl-datahub[data-lake-profiling]'
```

Or use the convenience variant:

```bash
pip install 'acryl-datahub[s3-profiling]'
```

### Warning: "Data lake profiling disabled: PySpark/PyDeequ not available"

**Problem:** Profiling is enabled in config but PySpark is not installed.

**Solutions:**

1. Install profiling dependencies: `pip install 'acryl-datahub[data-lake-profiling]'`
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

- With `data-lake-profiling`: Shows `pyspark 3.5.x`
- Without `data-lake-profiling`: Import fails or package not found

## Migration Guide

### Upgrading from Previous Versions

If you were using S3/GCS/ABS with profiling before this change:

**Option 1: Keep existing behavior (with profiling)**

```bash
# Replace your old install command
pip install 'acryl-datahub[s3]'

# With new profiling-inclusive variant
pip install 'acryl-datahub[s3-profiling]'
```

**Option 2: Reduce footprint (without profiling)**

```bash
# Use base variant if profiling not needed
pip install 'acryl-datahub[s3]'

# Update config to disable profiling
# profiling:
#   enabled: false
```

### No Breaking Changes

This change is backward compatible:

- Existing installations with PySpark continue to work
- Profiling behavior is unchanged when PySpark is installed
- Only affects new installations where users can now choose to exclude PySpark

## DataHub Actions

[DataHub Actions](https://github.com/datahub-project/datahub/tree/master/datahub-actions) depends on `acryl-datahub` and benefits significantly from optional PySpark support:

### Reduced Installation Size

DataHub Actions typically doesn't need data lake profiling capabilities since it focuses on reacting to metadata events, not extracting metadata from data lakes. With optional PySpark:

```bash
# Before: Actions pulled in PySpark unnecessarily
pip install acryl-datahub-actions
# Result: ~700MB installation

# After: Actions installs without PySpark by default
pip install acryl-datahub-actions
# Result: ~200MB installation (500MB saved)
```

### Faster Deployment

Actions services can now deploy faster in containerized environments:

- **Faster pip install**: No PySpark compilation required
- **Smaller Docker images**: Reduced base image size
- **Quicker cold starts**: Less code to load and initialize

### Fewer Dependency Conflicts

Actions workflows often integrate with other tools (Slack, Teams, email services). Removing PySpark reduces:

- Python version constraint conflicts
- Java/Spark runtime conflicts in restricted environments
- Transitive dependency version mismatches

### When Actions Needs Profiling

If your Actions workflow needs to trigger data lake profiling jobs, you can still install the full stack:

```bash
# Actions with data lake profiling capability
pip install 'acryl-datahub-actions'
pip install 'acryl-datahub[s3,data-lake-profiling]'
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
