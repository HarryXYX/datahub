"""Unit tests for Unity Catalog PySpark fallback behavior."""

from unittest.mock import Mock

import pytest

from datahub.ingestion.source.data_lake_common.pyspark_utils import is_pyspark_available
from datahub.ingestion.source.unity.usage import UnityCatalogUsageExtractor


class TestUnityCatalogPySparkFallback:
    """Tests for Unity Catalog behavior without PySpark."""

    def test_spark_sql_parser_returns_none_without_pyspark(self):
        """Test that spark_sql_parser returns None when PySpark is not available."""
        if is_pyspark_available():
            pytest.skip("PySpark is available, skipping test")

        # Create a mock usage extractor
        mock_config = Mock()
        mock_report = Mock()
        mock_proxy = Mock()

        extractor = UnityCatalogUsageExtractor(
            config=mock_config,
            report=mock_report,
            proxy=mock_proxy,
            table_urn_builder=lambda x: f"urn:li:dataset:{x}",
            user_urn_builder=lambda x: f"urn:li:corpuser:{x}",
        )

        # spark_sql_parser should return None without PySpark
        parser = extractor.spark_sql_parser

        assert parser is None, "spark_sql_parser should return None without PySpark"

    def test_spark_sql_parser_with_pyspark(self):
        """Test that spark_sql_parser returns parser when PySpark is available."""
        if not is_pyspark_available():
            pytest.skip("PySpark not available, skipping test")

        # Create a mock usage extractor
        mock_config = Mock()
        mock_report = Mock()
        mock_proxy = Mock()

        extractor = UnityCatalogUsageExtractor(
            config=mock_config,
            report=mock_report,
            proxy=mock_proxy,
            table_urn_builder=lambda x: f"urn:li:dataset:{x}",
            user_urn_builder=lambda x: f"urn:li:corpuser:{x}",
        )

        # spark_sql_parser should return a parser object with PySpark
        parser = extractor.spark_sql_parser

        assert parser is not None, "spark_sql_parser should return parser with PySpark"

    def test_spark_sql_parser_is_cached(self):
        """Test that spark_sql_parser is lazily initialized and cached."""
        if not is_pyspark_available():
            pytest.skip("PySpark not available, skipping test")

        # Create a mock usage extractor
        mock_config = Mock()
        mock_report = Mock()
        mock_proxy = Mock()

        extractor = UnityCatalogUsageExtractor(
            config=mock_config,
            report=mock_report,
            proxy=mock_proxy,
            table_urn_builder=lambda x: f"urn:li:dataset:{x}",
            user_urn_builder=lambda x: f"urn:li:corpuser:{x}",
        )

        # Access parser twice
        parser1 = extractor.spark_sql_parser
        parser2 = extractor.spark_sql_parser

        # Should return same instance (cached)
        assert parser1 is parser2, "spark_sql_parser should be cached"

    def test_usage_extractor_initialization(self):
        """Test that UnityCatalogUsageExtractor can be initialized regardless of PySpark."""
        mock_config = Mock()
        mock_report = Mock()
        mock_proxy = Mock()

        # Should not raise even without PySpark
        extractor = UnityCatalogUsageExtractor(
            config=mock_config,
            report=mock_report,
            proxy=mock_proxy,
            table_urn_builder=lambda x: f"urn:li:dataset:{x}",
            user_urn_builder=lambda x: f"urn:li:corpuser:{x}",
        )

        assert extractor is not None
        assert extractor.config == mock_config
        assert extractor.report == mock_report
        assert extractor.proxy == mock_proxy


class TestUnityCatalogSQLParsing:
    """Tests for Unity Catalog SQL parsing behavior."""

    def test_sql_parsing_falls_back_to_sqlglot_without_pyspark(self):
        """Test that SQL parsing falls back to sqlglot when PySpark unavailable.

        Note: This test verifies that the extractor can be created without PySpark.
        The actual SQL parsing fallback to sqlglot is tested in integration tests.
        """
        if is_pyspark_available():
            pytest.skip("PySpark is available, skipping test")

        mock_config = Mock()
        mock_report = Mock()
        mock_proxy = Mock()

        # Should not raise even without PySpark
        extractor = UnityCatalogUsageExtractor(
            config=mock_config,
            report=mock_report,
            proxy=mock_proxy,
            table_urn_builder=lambda x: f"urn:li:dataset:{x}",
            user_urn_builder=lambda x: f"urn:li:corpuser:{x}",
        )

        # Verify that spark_sql_parser is None (will use sqlglot fallback)
        assert extractor.spark_sql_parser is None


class TestUnityCatalogBuilderFunctions:
    """Tests for Unity Catalog builder functions."""

    def test_table_urn_builder(self):
        """Test that table URN builder function works correctly."""
        mock_config = Mock()
        mock_report = Mock()
        mock_proxy = Mock()

        def table_urn_builder(qualified_name: str) -> str:
            return (
                f"urn:li:dataset:(urn:li:dataPlatform:databricks,{qualified_name},PROD)"
            )

        extractor = UnityCatalogUsageExtractor(
            config=mock_config,
            report=mock_report,
            proxy=mock_proxy,
            table_urn_builder=table_urn_builder,  # type: ignore[misc,arg-type]
            user_urn_builder=lambda x: f"urn:li:corpuser:{x}",
        )

        assert extractor.table_urn_builder is not None
        urn = extractor.table_urn_builder("catalog.schema.table")  # type: ignore[misc,arg-type]
        assert "databricks" in urn
        assert "catalog.schema.table" in urn

    def test_user_urn_builder(self):
        """Test that user URN builder function works correctly."""
        mock_config = Mock()
        mock_report = Mock()
        mock_proxy = Mock()

        def user_urn_builder(username: str) -> str:
            return f"urn:li:corpuser:{username}"

        extractor = UnityCatalogUsageExtractor(
            config=mock_config,
            report=mock_report,
            proxy=mock_proxy,
            table_urn_builder=lambda x: f"urn:li:dataset:{x}",
            user_urn_builder=user_urn_builder,
        )

        assert extractor.user_urn_builder is not None
        urn = extractor.user_urn_builder("testuser")
        assert urn == "urn:li:corpuser:testuser"
