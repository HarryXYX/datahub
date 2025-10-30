"""
Utility module for PySpark and PyDeequ availability detection.

This module provides centralized detection of PySpark and PyDeequ dependencies,
allowing data lake sources (S3, ABS, Unity Catalog) to gracefully handle cases
where these optional dependencies are not installed.
"""

from typing import TYPE_CHECKING, Any, Optional

if TYPE_CHECKING:
    # Type aliases for mypy - these are only used during type checking
    import pandas
    import pydeequ.analyzers
    import pyspark.sql.dataframe
    import pyspark.sql.functions
    import pyspark.sql.session
    import pyspark.sql.types

    # Type aliases to make mypy happy when these are used as type annotations
    # Note: We don't create a pyspark type alias since it's a module variable at runtime
    SparkSessionType = pyspark.sql.session.SparkSession
    DataFrameType = pyspark.sql.dataframe.DataFrame
    AnalysisRunBuilderType = pydeequ.analyzers.AnalysisRunBuilder
    PandasDataFrameType = pandas.DataFrame

__all__ = [
    # Availability check functions
    "is_pyspark_available",
    "is_pydeequ_available",
    "is_profiling_enabled",
    "require_pyspark",
    # PySpark module
    "pyspark",
    # PySpark classes
    "SparkConf",
    "SparkSession",
    "DataFrame",
    "AnalysisException",
    # PySpark SQL types
    "SparkDataType",
    "DateType",
    "DecimalType",
    "DoubleType",
    "FloatType",
    "IntegerType",
    "LongType",
    "NullType",
    "ShortType",
    "StringType",
    "TimestampType",
    # PySpark SQL functions
    "col",
    "count",
    "isnan",
    "when",
    # PyDeequ classes
    "AnalysisRunBuilder",
    "AnalysisRunner",
    "AnalyzerContext",
    "ApproxCountDistinct",
    "ApproxQuantile",
    "ApproxQuantiles",
    "Histogram",
    "Maximum",
    "Mean",
    "Minimum",
    "StandardDeviation",
    # Pandas
    "PandasDataFrame",
]

# Runtime detection for PySpark availability
_PYSPARK_AVAILABLE = False
_PYDEEQU_AVAILABLE = False

# PySpark module - will be set to actual module if available, None otherwise
pyspark: Optional[Any] = None  # type: ignore[no-redef]

# PySpark classes - will be set to actual classes if available, None otherwise
# Note: SparkSession, DataFrame, AnalysisRunBuilder, PandasDataFrame are defined in TYPE_CHECKING block
# with proper types for mypy. At runtime, they start as None and get reassigned if imports succeed.
SparkSession: Optional[Any] = None
DataFrame: Optional[Any] = None
SparkConf: Optional[Any] = None
AnalysisException: Optional[Any] = None

# PySpark SQL types
SparkDataType: Optional[Any] = None
DateType: Optional[Any] = None
DecimalType: Optional[Any] = None
DoubleType: Optional[Any] = None
FloatType: Optional[Any] = None
IntegerType: Optional[Any] = None
LongType: Optional[Any] = None
NullType: Optional[Any] = None
ShortType: Optional[Any] = None
StringType: Optional[Any] = None
TimestampType: Optional[Any] = None

# PySpark SQL functions
col: Optional[Any] = None
count: Optional[Any] = None
isnan: Optional[Any] = None
when: Optional[Any] = None

# PyDeequ classes
AnalysisRunBuilder: Optional[Any] = None
AnalysisRunner: Optional[Any] = None
AnalyzerContext: Optional[Any] = None
ApproxCountDistinct: Optional[Any] = None
ApproxQuantile: Optional[Any] = None
ApproxQuantiles: Optional[Any] = None
Histogram: Optional[Any] = None
Maximum: Optional[Any] = None
Mean: Optional[Any] = None
Minimum: Optional[Any] = None
StandardDeviation: Optional[Any] = None

# Pandas
PandasDataFrame: Optional[Any] = None

try:
    import pyspark  # type: ignore[no-redef]
    from pandas import DataFrame as PandasDataFrame  # type: ignore[no-redef]
    from pyspark.conf import SparkConf  # type: ignore[no-redef]
    from pyspark.sql import SparkSession  # type: ignore[no-redef]
    from pyspark.sql.dataframe import DataFrame  # type: ignore[no-redef]
    from pyspark.sql.functions import col, count, isnan, when  # type: ignore[no-redef]
    from pyspark.sql.types import (  # type: ignore[no-redef]
        DataType as SparkDataType,
        DateType,
        DecimalType,
        DoubleType,
        FloatType,
        IntegerType,
        LongType,
        NullType,
        ShortType,
        StringType,
        TimestampType,
    )
    from pyspark.sql.utils import AnalysisException  # type: ignore[no-redef]

    _PYSPARK_AVAILABLE = True
except (ImportError, ValueError, Exception):
    # Use object as a fallback for NullType since it's used as a default value
    # ValueError can occur due to numpy/pandas compatibility issues
    NullType = object  # type: ignore[misc,assignment]

try:
    from pydeequ.analyzers import (  # type: ignore[no-redef]
        AnalysisRunBuilder,
        AnalysisRunner,
        AnalyzerContext,
        ApproxCountDistinct,
        ApproxQuantile,
        ApproxQuantiles,
        Histogram,
        Maximum,
        Mean,
        Minimum,
        StandardDeviation,
    )

    _PYDEEQU_AVAILABLE = True
except (ImportError, Exception):
    pass


def is_pyspark_available() -> bool:
    """
    Check if PySpark is available.

    Returns:
        True if PySpark is installed and can be imported, False otherwise.
    """
    return _PYSPARK_AVAILABLE


def is_pydeequ_available() -> bool:
    """
    Check if PyDeequ is available.

    Returns:
        True if PyDeequ is installed and can be imported, False otherwise.
    """
    return _PYDEEQU_AVAILABLE


def is_profiling_enabled() -> bool:
    """
    Check if data lake profiling dependencies (PySpark and PyDeequ) are available.

    This is a convenience function that checks both PySpark and PyDeequ availability,
    as both are required for data lake profiling to work.

    Returns:
        True if both PySpark and PyDeequ are installed, False otherwise.
    """
    return _PYSPARK_AVAILABLE and _PYDEEQU_AVAILABLE


def require_pyspark(operation: str = "this operation") -> None:
    """
    Raise an error if PySpark is not available.

    Args:
        operation: Description of the operation requiring PySpark, used in error message.

    Raises:
        RuntimeError: If PySpark is not installed.
    """
    if not _PYSPARK_AVAILABLE:
        raise RuntimeError(
            f"PySpark is not installed, but is required for {operation}. "
            "DataHub requires PySpark for data lake profiling. "
            "Please install with: pip install 'acryl-datahub[data-lake-profiling]' "
            "See docs/PYSPARK.md for more information."
        )
