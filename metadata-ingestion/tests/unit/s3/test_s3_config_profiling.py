"""Unit tests for S3 config profiling validation."""

import pytest

from datahub.ingestion.source.data_lake_common.pyspark_utils import is_profiling_enabled
from datahub.ingestion.source.s3.config import DataLakeSourceConfig


class TestS3ConfigProfilingValidation:
    """Tests for S3 config profiling dependency validation."""

    def test_config_without_profiling(self):
        """Test that S3 config can be created without profiling enabled."""
        config_dict: dict = {
            "path_specs": [
                {
                    "include": "s3://test-bucket/data/*.parquet",
                }
            ],
            "profiling": {"enabled": False},
        }

        config = DataLakeSourceConfig.parse_obj(config_dict)

        assert config is not None
        assert config.platform == "s3"
        assert config.profiling.enabled is False

    def test_config_profiling_disabled_by_default(self):
        """Test that profiling is disabled by default."""
        config_dict: dict = {
            "path_specs": [
                {
                    "include": "s3://test-bucket/data/*.parquet",
                }
            ],
        }

        config = DataLakeSourceConfig.parse_obj(config_dict)

        assert config is not None
        assert config.profiling.enabled is False

    def test_config_with_profiling_when_pyspark_available(self):
        """Test that config accepts profiling when PySpark is available."""
        if not is_profiling_enabled():
            pytest.skip("PySpark not available, skipping test")

        config_dict: dict = {
            "path_specs": [
                {
                    "include": "s3://test-bucket/data/*.parquet",
                }
            ],
            "profiling": {"enabled": True},
        }

        config = DataLakeSourceConfig.parse_obj(config_dict)

        assert config is not None
        assert config.profiling.enabled is True

    def test_config_with_profiling_when_pyspark_unavailable(self):
        """Test that config validation fails when profiling enabled without PySpark."""
        if is_profiling_enabled():
            pytest.skip("PySpark is available, skipping test")

        config_dict: dict = {
            "path_specs": [
                {
                    "include": "s3://test-bucket/data/*.parquet",
                }
            ],
            "profiling": {"enabled": True},
        }

        with pytest.raises(ValueError) as exc_info:
            DataLakeSourceConfig.parse_obj(config_dict)

        error_msg = str(exc_info.value)

        # Verify error message contains all required information
        assert "Data lake profiling is enabled" in error_msg
        assert "PySpark" in error_msg
        assert "PyDeequ" in error_msg
        assert "data-lake-profiling" in error_msg
        assert "s3,data-lake-profiling" in error_msg
        assert "docs/PYSPARK.md" in error_msg

    def test_config_platform_inference(self):
        """Test that platform is correctly inferred from path_specs."""
        config_dict: dict = {
            "path_specs": [
                {
                    "include": "s3://test-bucket/data/*.parquet",
                }
            ],
        }

        config = DataLakeSourceConfig.parse_obj(config_dict)

        assert config.platform == "s3"

    def test_config_with_aws_config(self):
        """Test that S3 config accepts AWS configuration."""
        config_dict: dict = {
            "path_specs": [
                {
                    "include": "s3://test-bucket/data/*.parquet",
                }
            ],
            "aws_config": {
                "aws_region": "us-west-2",
            },
            "profiling": {"enabled": False},
        }

        config = DataLakeSourceConfig.parse_obj(config_dict)

        assert config is not None
        assert config.aws_config is not None
        assert config.aws_config.aws_region == "us-west-2"

    def test_config_with_multiple_path_specs(self):
        """Test that config accepts multiple path specs."""
        config_dict: dict = {
            "path_specs": [
                {"include": "s3://bucket1/data/*.parquet"},
                {"include": "s3://bucket1/other/*.csv"},
            ],
            "profiling": {"enabled": False},
        }

        config = DataLakeSourceConfig.parse_obj(config_dict)

        assert config is not None
        assert len(config.path_specs) == 2

    def test_config_profile_patterns(self):
        """Test that profile patterns are passed to profiling config."""
        config_dict: dict = {
            "path_specs": [
                {
                    "include": "s3://test-bucket/data/*.parquet",
                }
            ],
            "profile_patterns": {
                "allow": ["column1", "column2"],
                "deny": ["sensitive_*"],
            },
            "profiling": {"enabled": False},
        }

        config = DataLakeSourceConfig.parse_obj(config_dict)

        assert config is not None
        assert config.profile_patterns is not None

    def test_is_profiling_enabled_method(self):
        """Test the is_profiling_enabled method on config."""
        config_dict: dict = {
            "path_specs": [
                {
                    "include": "s3://test-bucket/data/*.parquet",
                }
            ],
            "profiling": {"enabled": False},
        }

        config = DataLakeSourceConfig.parse_obj(config_dict)

        assert config.is_profiling_enabled() is False

    def test_config_spark_settings(self):
        """Test that Spark configuration settings are accepted."""
        config_dict: dict = {
            "path_specs": [
                {
                    "include": "s3://test-bucket/data/*.parquet",
                }
            ],
            "spark_driver_memory": "8g",
            "spark_config": {
                "spark.executor.memory": "4g",
                "spark.sql.shuffle.partitions": "200",
            },
            "profiling": {"enabled": False},
        }

        config = DataLakeSourceConfig.parse_obj(config_dict)

        assert config is not None
        assert config.spark_driver_memory == "8g"
        assert config.spark_config["spark.executor.memory"] == "4g"


class TestS3ConfigEdgeCases:
    """Tests for edge cases in S3 config validation."""

    def test_empty_path_specs_fails(self):
        """Test that empty path_specs raises validation error."""
        config_dict: dict = {
            "path_specs": [],
        }

        with pytest.raises(ValueError) as exc_info:
            DataLakeSourceConfig.parse_obj(config_dict)

        assert "path_specs must not be empty" in str(exc_info.value)

    def test_mixed_platform_path_specs_fails(self):
        """Test that mixing S3 and file paths raises validation error."""
        config_dict: dict = {
            "path_specs": [
                {"include": "s3://bucket/data/*.parquet"},
                {"include": "file:///local/path/*.csv"},
            ],
        }

        with pytest.raises(ValueError) as exc_info:
            DataLakeSourceConfig.parse_obj(config_dict)

        assert "Cannot have multiple platforms" in str(exc_info.value)

    def test_s3_tags_with_non_s3_platform_fails(self):
        """Test that S3 tag options fail with non-S3 platform."""
        config_dict: dict = {
            "path_specs": [
                {"include": "file:///local/path/*.csv"},
            ],
            "use_s3_bucket_tags": True,
        }

        with pytest.raises(ValueError) as exc_info:
            DataLakeSourceConfig.parse_obj(config_dict)

        error_msg = str(exc_info.value).lower()
        assert "s3 bucket tags" in error_msg and "platform is not s3" in error_msg
