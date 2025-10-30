# Source Connector 开发指南

本文档详细介绍如何开发自定义 DataHub Source Connector，包括架构设计、配置管理、WorkUnit 生成和测试。

## 目录

- [开发流程概览](#开发流程概览)
- [Source 基类详解](#source-基类详解)
- [配置类设计](#配置类设计)
- [WorkUnit 概念](#workunit-概念)
- [报告和错误处理](#报告和错误处理)
- [测试框架](#测试框架)
- [完整示例](#完整示例)
- [最佳实践](#最佳实践)

## 开发流程概览

开发一个 Source Connector 的完整步骤：

```
1. 设计配置类 (Pydantic)
   ↓
2. 创建报告类 (SourceReport)
   ↓
3. 实现 Source 类
   ├── create() 方法: 实例化
   ├── get_workunits_internal(): 生成 WorkUnit
   └── get_report(): 返回报告
   ↓
4. 注册插件 (setup.py)
   ↓
5. 编写测试
   ↓
6. 编写文档
```

## Source 基类详解

### 核心接口

所有 Source Connector 必须继承 `datahub.ingestion.api.source.Source` 基类：

```python
from dataclasses import dataclass
from typing import Iterable
from datahub.ingestion.api.common import PipelineContext
from datahub.ingestion.api.source import Source, SourceReport
from datahub.ingestion.api.workunit import MetadataWorkUnit

@dataclass
class MySource(Source):
    """自定义数据源"""

    ctx: PipelineContext  # 管道上下文 (必需)
    config: MySourceConfig  # 配置对象
    report: MySourceReport  # 报告对象

    @classmethod
    def create(cls, config_dict: dict, ctx: PipelineContext) -> "MySource":
        """
        工厂方法: 从配置字典创建 Source 实例

        注意: 使用 @config_class 装饰器时，此方法会自动生成
        """
        config = MySourceConfig.parse_obj(config_dict)
        return cls(ctx, config)

    def get_workunits_internal(self) -> Iterable[MetadataWorkUnit]:
        """
        核心方法: 生成 WorkUnit 流

        此方法是一个 Generator，应该 yield MetadataWorkUnit 对象
        """
        # 连接数据源
        # 提取元数据
        # 生成 WorkUnit
        for entity in self._extract_entities():
            yield self._create_workunit(entity)

    def get_report(self) -> SourceReport:
        """返回采集报告"""
        return self.report

    def close(self) -> None:
        """清理资源 (可选)"""
        # 关闭数据库连接
        # 释放文件句柄
        super().close()
```

### 装饰器

使用装饰器简化开发并自动生成文档：

```python
from datahub.ingestion.api.decorators import (
    platform_name,
    config_class,
    support_status,
    capability,
    SupportStatus,
    SourceCapability,
)

@platform_name("MySQL")  # 平台名称
@config_class(MySQLConfig)  # 自动注入配置类
@support_status(SupportStatus.CERTIFIED)  # 支持级别
@capability(SourceCapability.SCHEMA_METADATA, "Enabled by default")
@capability(SourceCapability.LINEAGE_COARSE, "Enabled by default")
@capability(SourceCapability.DATA_PROFILING, "Optionally enabled via profiling.enabled")
class MySQLSource(Source):
    """
    MySQL 数据源 Connector

    此 Connector 从 MySQL 数据库提取以下元数据:
    - 数据库和表结构
    - 列级别 Schema
    - 外键关系 (血缘)
    - 数据统计信息 (Profiling)

    ## 配置示例

    ```yaml
    source:
      type: mysql
      config:
        host_port: "localhost:3306"
        database: "my_db"
        username: "user"
        password: "pass"
    ```
    """
    pass
```

**装饰器说明**:

| 装饰器 | 作用 |
|--------|------|
| `@platform_name` | 声明平台名称，用于生成 URN 和文档 |
| `@config_class` | 关联配置类，自动生成 `create()` 方法 |
| `@support_status` | 声明支持级别 (CERTIFIED, INCUBATING, TESTING) |
| `@capability` | 声明支持的能力 (Schema、血缘、Profiling 等) |

## 配置类设计

### 基础配置

配置类必须继承 `ConfigModel` 并使用 Pydantic 进行验证：

```python
from pydantic import Field, validator
from datahub.configuration.common import ConfigModel, AllowDenyPattern

class MySourceConfig(ConfigModel):
    """数据源配置"""

    # 基础连接配置
    host: str = Field(description="数据库主机地址")
    port: int = Field(default=5432, description="数据库端口")
    database: str = Field(description="数据库名称")

    # 认证配置
    username: str = Field(description="用户名")
    password: str = Field(description="密码", exclude=True)  # 不在日志中显示

    # 过滤配置
    schema_pattern: AllowDenyPattern = Field(
        default=AllowDenyPattern.allow_all(),
        description="Schema 过滤规则。支持正则表达式。"
    )
    table_pattern: AllowDenyPattern = Field(
        default=AllowDenyPattern.allow_all(),
        description="表过滤规则。支持正则表达式。"
    )

    # 功能开关
    include_tables: bool = Field(
        default=True,
        description="是否采集表元数据"
    )
    include_views: bool = Field(
        default=True,
        description="是否采集视图元数据"
    )

    # 高级配置
    options: dict = Field(
        default_factory=dict,
        description="额外的连接参数"
    )

    @validator("port")
    def validate_port(cls, v):
        """自定义验证: 端口号必须在有效范围内"""
        if not (1 <= v <= 65535):
            raise ValueError("Port must be between 1 and 65535")
        return v

    @validator("database")
    def validate_database(cls, v):
        """自定义验证: 数据库名称不能为空"""
        if not v or not v.strip():
            raise ValueError("Database name cannot be empty")
        return v.strip()
```

### 混入配置

使用 Mixin 复用通用配置：

```python
from datahub.configuration.source_common import (
    EnvConfigMixin,
    PlatformInstanceConfigMixin,
)

class MySourceConfig(
    EnvConfigMixin,  # 提供 env 配置
    PlatformInstanceConfigMixin,  # 提供 platform_instance 配置
    ConfigModel,
):
    # env: 环境标识 (PROD, DEV, etc.)
    # platform_instance: 平台实例名称 (用于多实例场景)

    # 你的自定义配置
    host: str
    port: int
```

### 过滤配置

使用 `AllowDenyPattern` 实现灵活的过滤：

```python
from datahub.configuration.common import AllowDenyPattern

# 在配置类中
class MySourceConfig(ConfigModel):
    schema_pattern: AllowDenyPattern = Field(
        default=AllowDenyPattern.allow_all(),
        description="Schema 过滤规则"
    )

# 在 Source 代码中使用
def should_process_schema(self, schema_name: str) -> bool:
    """检查是否应该处理该 Schema"""
    return self.config.schema_pattern.allowed(schema_name)

# Recipe 配置示例
# source:
#   config:
#     schema_pattern:
#       allow:
#         - "public"
#         - "analytics_.*"
#       deny:
#         - ".*_test$"
#         - "temp_.*"
```

### 敏感信息处理

使用 Pydantic 的 `SecretStr` 处理密码等敏感信息：

```python
from pydantic import Field, SecretStr

class MySourceConfig(ConfigModel):
    username: str = Field(description="用户名")
    password: SecretStr = Field(description="密码")

    # 或使用 exclude=True 避免在日志中输出
    api_key: str = Field(description="API 密钥", exclude=True)
```

## WorkUnit 概念

### WorkUnit 结构

`MetadataWorkUnit` 是数据传输的基本单元：

```python
from datahub.ingestion.api.workunit import MetadataWorkUnit
from datahub.emitter.mcp import MetadataChangeProposalWrapper
from datahub.metadata.schema_classes import DatasetPropertiesClass

# 创建 WorkUnit
workunit = MetadataWorkUnit(
    id="dataset-1",  # 唯一标识符
    mcp=MetadataChangeProposalWrapper(
        entityUrn="urn:li:dataset:(urn:li:dataPlatform:mysql,db.table,PROD)",
        aspect=DatasetPropertiesClass(
            description="User profile table",
            customProperties={"source": "mysql"},
        ),
    ),
)
```

### 生成 WorkUnit

典型的 WorkUnit 生成流程：

```python
def get_workunits_internal(self) -> Iterable[MetadataWorkUnit]:
    """生成 WorkUnit 流"""

    # 1. 连接数据源
    connection = self._get_connection()

    # 2. 获取实体列表
    for schema in self._get_schemas(connection):
        if not self.should_process_schema(schema.name):
            self.report.schemas_filtered += 1
            continue

        # 3. 生成 Schema 容器的 WorkUnit
        yield from self._create_schema_workunits(schema)

        # 4. 获取表元数据
        for table in self._get_tables(connection, schema.name):
            if not self.should_process_table(table.name):
                self.report.tables_filtered += 1
                continue

            try:
                # 5. 生成表的 WorkUnit
                yield from self._create_table_workunits(table)
                self.report.tables_scanned += 1

            except Exception as e:
                self.report.report_failure(
                    title="Failed to process table",
                    message=str(e),
                    context=f"{schema.name}.{table.name}",
                    exc=e,
                )

def _create_table_workunits(self, table) -> Iterable[MetadataWorkUnit]:
    """为单个表生成多个 WorkUnit"""

    dataset_urn = self._make_dataset_urn(table)

    # WorkUnit 1: Dataset Properties
    yield MetadataWorkUnit(
        id=f"{dataset_urn}-properties",
        mcp=MetadataChangeProposalWrapper(
            entityUrn=dataset_urn,
            aspect=self._create_dataset_properties(table),
        ),
    )

    # WorkUnit 2: Schema Metadata
    yield MetadataWorkUnit(
        id=f"{dataset_urn}-schema",
        mcp=MetadataChangeProposalWrapper(
            entityUrn=dataset_urn,
            aspect=self._create_schema_metadata(table),
        ),
    )

    # WorkUnit 3: Ownership (如果有)
    if table.owner:
        yield MetadataWorkUnit(
            id=f"{dataset_urn}-ownership",
            mcp=MetadataChangeProposalWrapper(
                entityUrn=dataset_urn,
                aspect=self._create_ownership(table.owner),
            ),
        )
```

### Aspect 构建

使用 `mcp_builder` 简化 Aspect 创建：

```python
from datahub.emitter import mce_builder
from datahub.metadata.schema_classes import (
    DatasetPropertiesClass,
    SchemaMetadataClass,
    SchemaFieldClass,
    SchemaFieldDataTypeClass,
)

def _create_dataset_properties(self, table) -> DatasetPropertiesClass:
    """创建 Dataset Properties Aspect"""
    return DatasetPropertiesClass(
        name=table.name,
        description=table.comment,
        customProperties={
            "row_count": str(table.row_count),
            "size_bytes": str(table.size_bytes),
            "created_at": table.created_at.isoformat(),
        },
        created=mce_builder.make_ts_millis(table.created_at),
        lastModified=mce_builder.make_ts_millis(table.modified_at),
    )

def _create_schema_metadata(self, table) -> SchemaMetadataClass:
    """创建 Schema Metadata Aspect"""
    fields = []
    for column in table.columns:
        fields.append(
            SchemaFieldClass(
                fieldPath=column.name,
                type=self._get_column_type(column.data_type),
                nativeDataType=column.data_type,
                description=column.comment,
                nullable=column.is_nullable,
            )
        )

    return SchemaMetadataClass(
        schemaName=table.name,
        platform=f"urn:li:dataPlatform:{self.platform}",
        version=0,
        hash="",
        platformSchema=mce_builder.make_schema_field_class_native_schema(),
        fields=fields,
    )
```

### URN 构建

使用 `mce_builder` 构建标准 URN：

```python
from datahub.emitter import mce_builder

class MySource(Source):
    platform = "mysql"  # 平台标识符

    def _make_dataset_urn(self, database: str, schema: str, table: str) -> str:
        """构建 Dataset URN"""
        dataset_name = f"{database}.{schema}.{table}"

        if self.config.convert_urns_to_lowercase:
            dataset_name = dataset_name.lower()

        return mce_builder.make_dataset_urn_with_platform_instance(
            platform=self.platform,
            name=dataset_name,
            env=self.config.env,
            platform_instance=self.config.platform_instance,
        )

    def _make_user_urn(self, username: str) -> str:
        """构建 User URN"""
        if self.config.email_domain:
            email = f"{username}@{self.config.email_domain}"
            return mce_builder.make_user_urn(email)
        return mce_builder.make_user_urn(username)

    def _make_container_urn(self, database: str, schema: str) -> str:
        """构建 Container URN (用于 Schema 容器)"""
        container_key = f"{database}.{schema}"
        return mce_builder.make_container_urn(
            guid=mce_builder.datahub_guid({
                "platform": self.platform,
                "instance": self.config.platform_instance,
                "container": container_key,
            })
        )
```

## 报告和错误处理

### 创建报告类

```python
from dataclasses import dataclass, field
from datahub.ingestion.api.source import SourceReport

@dataclass
class MySourceReport(SourceReport):
    """自定义采集报告"""

    # 统计计数器
    schemas_scanned: int = 0
    schemas_filtered: int = 0
    tables_scanned: int = 0
    tables_filtered: int = 0
    views_scanned: int = 0

    # 性能指标
    query_count: int = 0
    total_query_time_seconds: float = 0.0

    # 详细统计
    table_sizes: dict = field(default_factory=dict)

    def compute_stats(self) -> None:
        """计算统计信息"""
        super().compute_stats()
        # 自定义统计逻辑
```

### 结构化日志

使用报告对象记录警告和错误：

```python
def get_workunits_internal(self) -> Iterable[MetadataWorkUnit]:
    for table in self._get_tables():
        try:
            yield from self._process_table(table)
            self.report.tables_scanned += 1

        except PermissionError as e:
            # 记录警告 (不中断采集)
            self.report.report_warning(
                title="Permission Denied",
                message=f"Cannot access table {table.name}",
                context=f"schema={table.schema}, table={table.name}",
                exc=e,
            )

        except Exception as e:
            # 记录失败 (不中断采集)
            self.report.report_failure(
                title="Failed to process table",
                message=str(e),
                context=f"{table.schema}.{table.name}",
                exc=e,
            )
```

### 性能追踪

```python
from datahub.utilities.perf_timer import PerfTimer

def get_workunits_internal(self) -> Iterable[MetadataWorkUnit]:
    with PerfTimer() as timer:
        # 执行采集逻辑
        for table in self._get_tables():
            yield from self._process_table(table)

    self.report.total_query_time_seconds = timer.elapsed_seconds()
    logger.info(f"Ingestion took {timer.elapsed_seconds():.2f} seconds")
```

## 测试框架

### 单元测试

```python
# tests/unit/test_my_source.py
import pytest
from datahub.ingestion.api.common import PipelineContext
from datahub.ingestion.source.my_source import MySource, MySourceConfig

def test_source_config_validation():
    """测试配置验证"""
    # 有效配置
    config = MySourceConfig(
        host="localhost",
        port=5432,
        database="test_db",
        username="user",
        password="pass",
    )
    assert config.port == 5432

    # 无效端口
    with pytest.raises(ValueError):
        MySourceConfig(
            host="localhost",
            port=99999,  # 超出范围
            database="test_db",
            username="user",
            password="pass",
        )

def test_source_creation():
    """测试 Source 创建"""
    config_dict = {
        "host": "localhost",
        "port": 5432,
        "database": "test_db",
        "username": "user",
        "password": "pass",
    }
    ctx = PipelineContext(run_id="test-run")
    source = MySource.create(config_dict, ctx)

    assert source.config.host == "localhost"
    assert isinstance(source.report, MySourceReport)

def test_workunit_generation(mock_connection):
    """测试 WorkUnit 生成"""
    config_dict = {
        "host": "localhost",
        "port": 5432,
        "database": "test_db",
        "username": "user",
        "password": "pass",
    }
    ctx = PipelineContext(run_id="test-run")
    source = MySource.create(config_dict, ctx)

    # Mock 数据库连接
    source._get_connection = lambda: mock_connection

    workunits = list(source.get_workunits())
    assert len(workunits) > 0
    assert all(isinstance(wu, MetadataWorkUnit) for wu in workunits)
```

### 集成测试

```python
# tests/integration/test_my_source_integration.py
import pytest
from datahub.ingestion.run.pipeline import Pipeline

@pytest.mark.integration
def test_source_end_to_end():
    """端到端集成测试"""
    pipeline = Pipeline.create({
        "source": {
            "type": "my-source",
            "config": {
                "host": "test-db.example.com",
                "port": 5432,
                "database": "test_db",
                "username": "${TEST_DB_USER}",
                "password": "${TEST_DB_PASS}",
            },
        },
        "sink": {
            "type": "file",
            "config": {
                "filename": "/tmp/test_output.json",
            },
        },
    })

    pipeline.run()
    pipeline.raise_from_status()

    # 验证输出
    with open("/tmp/test_output.json") as f:
        data = json.load(f)
        assert len(data) > 0
```

### Golden File 测试

```python
# tests/unit/test_my_source_golden.py
from datahub.testing.compare_metadata_json import check_golden_file

def test_source_golden_file(pytestconfig, tmp_path):
    """Golden File 测试 - 验证生成的元数据是否正确"""

    # 运行 Source 生成 WorkUnit
    output_file = tmp_path / "output.json"
    pipeline = Pipeline.create({
        "source": {"type": "my-source", "config": {...}},
        "sink": {"type": "file", "config": {"filename": str(output_file)}},
    })
    pipeline.run()

    # 与 Golden File 比较
    check_golden_file(
        pytestconfig=pytestconfig,
        output_path=output_file,
        golden_path="tests/unit/my_source_golden.json",
        ignore_paths=[
            # 忽略时间戳等动态字段
            r"root\[\d+\]\['systemMetadata'\]\['lastObserved'\]",
        ],
    )
```

## 完整示例

以下是一个简化的 MySQL Source Connector 实现：

```python
# src/datahub/ingestion/source/my_mysql_source.py

from dataclasses import dataclass, field
from typing import Iterable, List, Optional
import pymysql
from pydantic import Field

from datahub.configuration.common import AllowDenyPattern, ConfigModel
from datahub.configuration.source_common import EnvConfigMixin
from datahub.emitter import mce_builder
from datahub.emitter.mcp import MetadataChangeProposalWrapper
from datahub.ingestion.api.common import PipelineContext
from datahub.ingestion.api.decorators import (
    config_class,
    platform_name,
    support_status,
    SupportStatus,
    SourceCapability,
    capability,
)
from datahub.ingestion.api.source import Source, SourceReport
from datahub.ingestion.api.workunit import MetadataWorkUnit
from datahub.metadata.schema_classes import (
    DatasetPropertiesClass,
    SchemaMetadataClass,
    SchemaFieldClass,
    SchemaFieldDataTypeClass,
    StringTypeClass,
)

# ==================== 配置类 ====================

class MyMySQLConfig(EnvConfigMixin, ConfigModel):
    """MySQL Source 配置"""

    host: str = Field(description="MySQL 服务器地址")
    port: int = Field(default=3306, description="MySQL 端口")
    database: str = Field(description="数据库名称")
    username: str = Field(description="用户名")
    password: str = Field(description="密码", exclude=True)

    table_pattern: AllowDenyPattern = Field(
        default=AllowDenyPattern.allow_all(),
        description="表名过滤规则"
    )

    include_tables: bool = Field(default=True, description="是否采集表")
    include_views: bool = Field(default=True, description="是否采集视图")

# ==================== 报告类 ====================

@dataclass
class MyMySQLReport(SourceReport):
    """MySQL 采集报告"""
    tables_scanned: int = 0
    tables_filtered: int = 0
    views_scanned: int = 0

# ==================== Source 类 ====================

@platform_name("MySQL")
@config_class(MyMySQLConfig)
@support_status(SupportStatus.CERTIFIED)
@capability(SourceCapability.SCHEMA_METADATA, "Enabled by default")
class MyMySQLSource(Source):
    """
    MySQL 数据源 Connector

    从 MySQL 数据库提取表和视图的元数据。
    """

    def __init__(self, ctx: PipelineContext, config: MyMySQLConfig):
        super().__init__(ctx)
        self.ctx = ctx
        self.config = config
        self.report = MyMySQLReport()
        self.connection: Optional[pymysql.Connection] = None

    def get_workunits_internal(self) -> Iterable[MetadataWorkUnit]:
        """生成 WorkUnit 流"""

        # 连接数据库
        self.connection = pymysql.connect(
            host=self.config.host,
            port=self.config.port,
            user=self.config.username,
            password=self.config.password,
            database=self.config.database,
        )

        try:
            # 获取表列表
            tables = self._get_tables()

            for table in tables:
                # 过滤
                if not self.config.table_pattern.allowed(table["name"]):
                    self.report.tables_filtered += 1
                    continue

                try:
                    # 生成 WorkUnit
                    yield from self._create_table_workunits(table)
                    self.report.tables_scanned += 1

                except Exception as e:
                    self.report.report_failure(
                        title="Failed to process table",
                        message=str(e),
                        context=f"table={table['name']}",
                        exc=e,
                    )
        finally:
            if self.connection:
                self.connection.close()

    def _get_tables(self) -> List[dict]:
        """获取表列表"""
        cursor = self.connection.cursor(pymysql.cursors.DictCursor)
        cursor.execute("SHOW TABLES")

        tables = []
        for row in cursor.fetchall():
            table_name = list(row.values())[0]
            tables.append({"name": table_name})

        return tables

    def _create_table_workunits(self, table: dict) -> Iterable[MetadataWorkUnit]:
        """为表生成 WorkUnit"""

        dataset_urn = mce_builder.make_dataset_urn_with_platform_instance(
            platform="mysql",
            name=f"{self.config.database}.{table['name']}",
            env=self.config.env,
        )

        # WorkUnit 1: Dataset Properties
        yield MetadataWorkUnit(
            id=f"{dataset_urn}-properties",
            mcp=MetadataChangeProposalWrapper(
                entityUrn=dataset_urn,
                aspect=DatasetPropertiesClass(
                    name=table["name"],
                    customProperties={
                        "database": self.config.database,
                    },
                ),
            ),
        )

        # WorkUnit 2: Schema Metadata
        columns = self._get_columns(table["name"])
        fields = []
        for col in columns:
            fields.append(
                SchemaFieldClass(
                    fieldPath=col["name"],
                    type=SchemaFieldDataTypeClass(type=StringTypeClass()),
                    nativeDataType=col["type"],
                    description=col.get("comment"),
                )
            )

        yield MetadataWorkUnit(
            id=f"{dataset_urn}-schema",
            mcp=MetadataChangeProposalWrapper(
                entityUrn=dataset_urn,
                aspect=SchemaMetadataClass(
                    schemaName=table["name"],
                    platform="urn:li:dataPlatform:mysql",
                    version=0,
                    hash="",
                    fields=fields,
                ),
            ),
        )

    def _get_columns(self, table_name: str) -> List[dict]:
        """获取表的列信息"""
        cursor = self.connection.cursor(pymysql.cursors.DictCursor)
        cursor.execute(f"DESCRIBE {table_name}")

        columns = []
        for row in cursor.fetchall():
            columns.append({
                "name": row["Field"],
                "type": row["Type"],
                "nullable": row["Null"] == "YES",
                "comment": None,
            })

        return columns

    def get_report(self) -> SourceReport:
        """返回报告"""
        return self.report

    @staticmethod
    def test_connection(config_dict: dict) -> TestConnectionReport:
        """测试连接"""
        test_report = TestConnectionReport()
        try:
            config = MyMySQLConfig.parse_obj(config_dict)
            conn = pymysql.connect(
                host=config.host,
                port=config.port,
                user=config.username,
                password=config.password,
                database=config.database,
                connect_timeout=5,
            )
            conn.close()
            test_report.basic_connectivity = CapabilityReport(capable=True)
        except Exception as e:
            test_report.basic_connectivity = CapabilityReport(
                capable=False,
                failure_reason=str(e),
            )
        return test_report
```

## 最佳实践

### 1. 使用 Generator 模式

```python
# ✅ 好: 使用 yield (流式处理)
def get_workunits_internal(self) -> Iterable[MetadataWorkUnit]:
    for table in self._get_tables():
        yield self._create_workunit(table)

# ❌ 差: 一次性返回全部 (内存占用高)
def get_workunits_internal(self) -> List[MetadataWorkUnit]:
    workunits = []
    for table in self._get_tables():
        workunits.append(self._create_workunit(table))
    return workunits
```

### 2. 错误处理

```python
# ✅ 好: 记录错误但继续采集
def get_workunits_internal(self) -> Iterable[MetadataWorkUnit]:
    for table in self._get_tables():
        try:
            yield from self._process_table(table)
        except Exception as e:
            self.report.report_failure(
                title="Failed to process table",
                message=str(e),
                context=f"table={table.name}",
                exc=e,
            )
            # 继续处理下一个表

# ❌ 差: 直接抛出异常 (中断整个采集)
def get_workunits_internal(self) -> Iterable[MetadataWorkUnit]:
    for table in self._get_tables():
        yield from self._process_table(table)  # 可能抛出异常
```

### 3. 资源清理

```python
# ✅ 好: 使用 context manager 或 close()
class MySource(Source):
    def __init__(self, ctx, config):
        super().__init__(ctx)
        self.connection = self._create_connection()

    def close(self) -> None:
        """清理资源"""
        if self.connection:
            self.connection.close()
        super().close()

# 或使用 with 语句
def get_workunits_internal(self) -> Iterable[MetadataWorkUnit]:
    with self._create_connection() as conn:
        # 使用连接
        pass
```

### 4. 配置文档

```python
# ✅ 好: 详细的字段描述
class MySourceConfig(ConfigModel):
    host: str = Field(
        description="数据库主机地址。支持 IP 或域名。示例: 'localhost' 或 '192.168.1.100'"
    )

# ❌ 差: 缺少描述
class MySourceConfig(ConfigModel):
    host: str
```

### 5. 过滤逻辑

```python
# ✅ 好: 早期过滤，避免不必要的处理
def get_workunits_internal(self) -> Iterable[MetadataWorkUnit]:
    for table in self._get_tables():
        # 尽早过滤
        if not self.config.table_pattern.allowed(table.name):
            self.report.tables_filtered += 1
            continue  # 跳过后续处理

        yield from self._process_table(table)

# ❌ 差: 延迟过滤
def get_workunits_internal(self) -> Iterable[MetadataWorkUnit]:
    for table in self._get_tables():
        workunits = self._process_table(table)  # 已经处理完了
        if self.config.table_pattern.allowed(table.name):
            yield from workunits
```

### 6. 增量采集支持

```python
from datahub.ingestion.source.state.stateful_ingestion_base import (
    StatefulIngestionSourceBase,
)

class MySource(StatefulIngestionSourceBase):
    """支持增量采集的 Source"""

    def get_workunits_internal(self) -> Iterable[MetadataWorkUnit]:
        # 获取上次采集的 checkpoint
        last_checkpoint = self.get_last_checkpoint()

        # 仅处理自上次采集以来变更的数据
        for table in self._get_changed_tables(since=last_checkpoint):
            yield from self._process_table(table)

        # 保存新的 checkpoint
        self.save_checkpoint(datetime.now())
```

### 7. 性能优化

```python
# ✅ 好: 批量查询
def _get_table_metadata(self, table_names: List[str]) -> dict:
    """批量获取元数据 (减少网络往返)"""
    query = f"SELECT * FROM information_schema.tables WHERE table_name IN ({placeholders})"
    return self._execute_query(query, table_names)

# ❌ 差: 逐个查询
def _get_table_metadata(self, table_names: List[str]) -> dict:
    """逐个查询 (性能差)"""
    results = []
    for table_name in table_names:
        result = self._execute_query(f"SELECT * FROM information_schema.tables WHERE table_name = ?", [table_name])
        results.append(result)
    return results
```

## 注册插件

在 `setup.py` 中注册你的 Connector：

```python
# setup.py

entry_points = {
    "datahub.ingestion.source.plugins": [
        "my-source = datahub.ingestion.source.my_mysql_source:MyMySQLSource",
    ],
}
```

注册后，用户可以通过以下方式使用：

```yaml
source:
  type: my-source  # 使用短名称
  config:
    host: "localhost"
    # ...
```

## 下一步

- [Snowflake Connector 源码](./sources/snowflake.md) - 学习最复杂的 Connector 实现
- [Transformer 开发](./transformers.md) - 了解如何转换元数据
- [完整开发指南](./development.md) - 环境搭建和测试
