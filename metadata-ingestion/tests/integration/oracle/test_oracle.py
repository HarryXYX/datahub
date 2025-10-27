import os
import subprocess
import time
from typing import Any
from unittest import mock
from unittest.mock import MagicMock, patch

import pytest
from freezegun import freeze_time
from sqlalchemy import exc

from datahub.ingestion.api.source import StructuredLogLevel
from datahub.ingestion.source.sql.oracle import OracleInspectorObjectWrapper
from datahub.testing import mce_helpers
from tests.integration.oracle.common import (  # type: ignore[import-untyped]
    OracleSourceMockDataBase,
    OracleTestCaseBase,
)
from tests.test_helpers.click_helpers import run_datahub_cmd
from tests.test_helpers.docker_helpers import wait_for_port

FROZEN_TIME = "2022-02-03 07:00:00"


def is_oracle_up(container_name: str, port: int) -> bool:
    """Check if Oracle is responsive on a container"""
    cmd = f"docker exec {container_name} /opt/oracle/checkDBStatus.sh"
    ret = subprocess.run(
        cmd,
        shell=True,
        capture_output=True,
        text=True,
    )
    return ret.returncode == 0


@pytest.fixture(scope="module")
def oracle_runner(docker_compose_runner, pytestconfig):
    test_resources_dir = pytestconfig.rootpath / "tests/integration/oracle"
    with docker_compose_runner(
        test_resources_dir / "docker-compose.yml", "oracle"
    ) as docker_services:
        wait_for_port(
            docker_services,
            "testoracle",
            1521,
            timeout=300,  # Oracle takes longer to start than SQL Server
            checker=lambda: is_oracle_up("testoracle", 1521),
        )

        # Oracle XE automatically runs setup scripts from /opt/oracle/scripts/setup/
        # Wait a bit more to ensure setup is complete
        time.sleep(10)

        yield docker_services


SOURCE_FILES_PATH = "./tests/integration/oracle/source_files"
config_files = [f for f in os.listdir(SOURCE_FILES_PATH) if f.endswith(".yml")]


@pytest.mark.parametrize("config_file", config_files)
@freeze_time(FROZEN_TIME, ignore=["oracledb", "oracledb.thin_impl"])
@pytest.mark.integration
def test_oracle_ingest(oracle_runner, pytestconfig, tmp_path, mock_time, config_file):
    test_resources_dir = pytestconfig.rootpath / "tests/integration/oracle"
    # Run the metadata ingestion pipeline.
    config_file_path = (test_resources_dir / f"source_files/{config_file}").resolve()
    run_datahub_cmd(
        ["ingest", "-c", f"{config_file_path}"], tmp_path=tmp_path, check_result=True
    )

    # Verify the output.
    mce_helpers.check_golden_file(
        pytestconfig,
        output_path=tmp_path / "oracle_mces.json",
        golden_path=test_resources_dir
        / f"golden_files/golden_mces_{config_file.replace('.yml', '.json')}",
    )


@pytest.mark.integration
def test_oracle_test_connection(oracle_runner):
    """Test Oracle connection using the test_connection method."""
    from datahub.ingestion.source.sql.oracle import OracleSource

    config_dict = {
        "username": "system",
        "password": "example",
        "host_port": "localhost:51521",
        "service_name": "XEPDB1",
    }

    report = OracleSource.test_connection(config_dict)
    assert report.basic_connectivity is not None
    assert report.basic_connectivity.capable
    assert report.basic_connectivity.failure_reason is None


class OracleErrorHandlingMockData(OracleSourceMockDataBase):
    def get_data(self, *args: Any, **kwargs: Any) -> Any:
        if isinstance(args[0], str) and "sys_context" in args[0]:
            raise exc.DatabaseError("statement", [], "Mock DB Error")
        return super().get_data(*args, **kwargs)


class OracleIntegrationTestCase(OracleTestCaseBase):
    def apply_mock_data(self, mock_create_engine, mock_inspect, mock_event):
        mock_event.listen.return_value = None

        connection_magic_mock = MagicMock()
        connection_magic_mock.execute.side_effect = self.get_mock_data

        inspector_magic_mock = MagicMock()
        inspector_magic_mock.bind = connection_magic_mock
        inspector_magic_mock.engine.url.database = self.get_database_name()
        inspector_magic_mock.dialect.normalize_name.side_effect = lambda x: x
        inspector_magic_mock.dialect.denormalize_name.side_effect = lambda x: x
        inspector_magic_mock.dialect.server_version_info = (
            self.get_server_version_info()
        )
        inspector_magic_mock.dialect.type_compiler.process = lambda x: "NUMBER"

        mock_inspect.return_value = inspector_magic_mock
        mock_create_engine.connect.return_value = connection_magic_mock

    @mock.patch("datahub.ingestion.source.sql.sql_common.create_engine")
    @mock.patch("datahub.ingestion.source.sql.sql_common.inspect")
    @mock.patch("datahub.ingestion.source.sql.oracle.event")
    def apply(self, mock_create_engine, mock_inspect, mock_event):
        self.apply_mock_data(mock_create_engine, mock_inspect, mock_event)
        super().apply()


class TestOracleSourceErrorHandling(OracleIntegrationTestCase):
    def __init__(self, pytestconfig, tmp_path):
        super().__init__(
            pytestconfig=pytestconfig,
            tmp_path=tmp_path,
            golden_file_name="golden_files/golden_test_error_handling.json",
            output_file_name="oracle_mce_output_error_handling.json",
            add_database_name_to_urn=False,
        )
        self.default_mock_data = OracleErrorHandlingMockData()

    def test_get_db_name_error_handling(self):
        inspector = MagicMock()
        inspector.bind.execute.side_effect = exc.DatabaseError(
            "statement", [], "Mock DB Error"
        )
        inspector_wrapper = OracleInspectorObjectWrapper(inspector)

        db_name = inspector_wrapper.get_db_name()

        assert db_name == ""
        assert len(inspector_wrapper.report.failures) == 1
        error = inspector_wrapper.report.failures[0]
        assert error.impact.name == StructuredLogLevel.ERROR.name
        assert error.message == "database_fetch_error"

    def test_get_pk_constraint_error_handling(self):
        inspector = MagicMock()
        inspector.dialect.normalize_name.side_effect = lambda x: x
        inspector.dialect.denormalize_name.side_effect = lambda x: x
        inspector_wrapper = OracleInspectorObjectWrapper(inspector)

        with patch.object(
            inspector_wrapper, "_get_constraint_data"
        ) as mock_get_constraint:
            mock_get_constraint.side_effect = Exception("Mock constraint error")

            result = inspector_wrapper.get_pk_constraint("test_table", "test_schema")

            assert result == {"constrained_columns": [], "name": None}
            assert len(inspector_wrapper.report.failures) == 1
            error = inspector_wrapper.report.failures[0]
            assert error.impact.name == StructuredLogLevel.ERROR.name
            assert "Error processing primary key constraints" in error.message

    def test_get_foreign_keys_missing_table_warning(self):
        inspector = MagicMock()
        inspector.dialect.normalize_name.side_effect = lambda x: x
        inspector.dialect.denormalize_name.side_effect = lambda x: x
        inspector_wrapper = OracleInspectorObjectWrapper(inspector)

        mock_data = [
            (
                "FK1",
                "R",
                "local_col",
                None,
                "remote_col",
                "remote_owner",
                1,
                1,
                None,
                "NO ACTION",
            )
        ]

        with patch.object(
            inspector_wrapper, "_get_constraint_data"
        ) as mock_get_constraint:
            mock_get_constraint.return_value = mock_data

            inspector_wrapper.get_foreign_keys("test_table", "test_schema")

            assert len(inspector_wrapper.report.warnings) == 1
            warning = inspector_wrapper.report.warnings[0]
            assert warning.message == "Unable to query table_name from dba_cons_columns"

    def test_get_table_comment_with_cast(self):
        inspector = MagicMock()
        inspector.dialect.normalize_name.side_effect = lambda x: x
        inspector.dialect.denormalize_name.side_effect = lambda x: x
        inspector_wrapper = OracleInspectorObjectWrapper(inspector)

        mock_comment = "Test table comment"
        inspector.bind.execute.return_value.scalar.return_value = mock_comment

        result = inspector_wrapper.get_table_comment("test_table", "test_schema")

        assert result == {"text": mock_comment}
        execute_args = inspector.bind.execute.call_args[0]
        sql_text = str(execute_args[0])
        assert "CAST(:table_name AS VARCHAR(128))" in sql_text
        assert "CAST(:schema_name AS VARCHAR(128))" in sql_text


@freeze_time(FROZEN_TIME)
@pytest.mark.integration
def test_oracle_source_integration_with_out_database(pytestconfig, tmp_path):
    oracle_source_integration_test = OracleIntegrationTestCase(
        pytestconfig=pytestconfig,
        tmp_path=tmp_path,
        golden_file_name="golden_files/golden_test_ingest_with_out_database.json",
        output_file_name="oracle_mce_output_with_out_database.json",
        add_database_name_to_urn=False,
    )
    oracle_source_integration_test.apply()


@freeze_time(FROZEN_TIME)
@pytest.mark.integration
def test_oracle_source_integration_with_database(pytestconfig, tmp_path):
    oracle_source_integration_test = OracleIntegrationTestCase(
        pytestconfig=pytestconfig,
        tmp_path=tmp_path,
        golden_file_name="golden_files/golden_test_ingest_with_database.json",
        output_file_name="oracle_mce_output_with_database.json",
        add_database_name_to_urn=True,
    )
    oracle_source_integration_test.apply()


@freeze_time(FROZEN_TIME)
@pytest.mark.integration
def test_oracle_source_error_handling(pytestconfig, tmp_path):
    test_case = TestOracleSourceErrorHandling(
        pytestconfig=pytestconfig,
        tmp_path=tmp_path,
    )
    test_case.apply()
