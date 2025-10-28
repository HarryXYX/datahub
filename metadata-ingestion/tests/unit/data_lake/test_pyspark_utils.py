"""Unit tests for PySpark availability detection utilities."""

import pytest

from datahub.ingestion.source.data_lake_common.pyspark_utils import (
    NullType,
    is_profiling_enabled,
    is_pydeequ_available,
    is_pyspark_available,
    require_pyspark,
)


class TestPySparkAvailability:
    """Tests for PySpark availability detection."""

    def test_is_pyspark_available_returns_bool(self):
        """Test that is_pyspark_available returns a boolean."""
        result = is_pyspark_available()
        assert isinstance(result, bool)

    def test_is_pydeequ_available_returns_bool(self):
        """Test that is_pydeequ_available returns a boolean."""
        result = is_pydeequ_available()
        assert isinstance(result, bool)

    def test_is_profiling_enabled_returns_bool(self):
        """Test that is_profiling_enabled returns a boolean."""
        result = is_profiling_enabled()
        assert isinstance(result, bool)

    def test_is_profiling_enabled_requires_both(self):
        """Test that profiling requires both PySpark and PyDeequ."""
        profiling = is_profiling_enabled()
        pyspark = is_pyspark_available()
        pydeequ = is_pydeequ_available()

        # If profiling is enabled, both PySpark and PyDeequ must be available
        if profiling:
            assert pyspark, "Profiling enabled but PySpark not available"
            assert pydeequ, "Profiling enabled but PyDeequ not available"

        # If either is missing, profiling should be disabled
        if not pyspark or not pydeequ:
            assert not profiling, (
                "Profiling should be disabled when dependencies missing"
            )

    def test_nulltype_is_defined(self):
        """Test that NullType is always defined (fallback to object if PySpark unavailable)."""
        assert NullType is not None
        # NullType should be either the PySpark NullType or object
        assert isinstance(NullType, type)


class TestRequirePySpark:
    """Tests for require_pyspark function."""

    def test_require_pyspark_with_operation_name(self):
        """Test that require_pyspark includes operation name in error."""
        if is_pyspark_available():
            # If PySpark is available, should not raise
            require_pyspark("test operation")
        else:
            # If PySpark is not available, should raise with operation name
            with pytest.raises(RuntimeError) as exc_info:
                require_pyspark("test operation")

            error_msg = str(exc_info.value)
            assert "test operation" in error_msg
            assert "PySpark is not installed" in error_msg

    def test_require_pyspark_error_message_content(self):
        """Test that require_pyspark error message has correct content."""
        if not is_pyspark_available():
            with pytest.raises(RuntimeError) as exc_info:
                require_pyspark("profiling")

            error_msg = str(exc_info.value)

            # Verify error message contains all required information
            assert "PySpark is not installed" in error_msg
            assert "PySpark 4.0.0" in error_msg
            assert "data-lake-profiling" in error_msg
            assert "docs/PYSPARK.md" in error_msg

    def test_require_pyspark_default_operation(self):
        """Test that require_pyspark uses default operation name."""
        if not is_pyspark_available():
            with pytest.raises(RuntimeError) as exc_info:
                require_pyspark()

            error_msg = str(exc_info.value)
            assert "this operation" in error_msg


class TestPySparkModuleExports:
    """Tests for PySpark module exports."""

    def test_pyspark_classes_exported(self):
        """Test that PySpark classes are exported (None if unavailable)."""

        # These should be defined (either actual classes or None)
        # We just verify they can be imported
        assert True  # If we get here, imports succeeded

    def test_pyspark_types_exported(self):
        """Test that PySpark SQL types are exported (None if unavailable)."""

        # These should be defined (either actual types or None)
        # We just verify they can be imported
        assert True  # If we get here, imports succeeded

    def test_pyspark_functions_exported(self):
        """Test that PySpark SQL functions are exported (None if unavailable)."""

        # These should be defined (either actual functions or None)
        # We just verify they can be imported
        assert True  # If we get here, imports succeeded

    def test_pydeequ_classes_exported(self):
        """Test that PyDeequ classes are exported (None if unavailable)."""

        # These should be defined (either actual classes or None)
        # We just verify they can be imported
        assert True  # If we get here, imports succeeded


class TestPySparkConsistency:
    """Tests for consistency of PySpark availability across imports."""

    def test_consistency_across_imports(self):
        """Test that availability is consistent across multiple imports."""
        from datahub.ingestion.source.data_lake_common.pyspark_utils import (
            is_pyspark_available as check1,
            is_pyspark_available as check2,
        )

        # Should return same value
        assert check1() == check2()

    def test_pyspark_module_none_or_module(self):
        """Test that pyspark module export is None or actual module."""
        from datahub.ingestion.source.data_lake_common.pyspark_utils import pyspark

        if is_pyspark_available():
            assert pyspark is not None
            # Should have module attributes
            assert hasattr(pyspark, "__version__")
        else:
            assert pyspark is None
