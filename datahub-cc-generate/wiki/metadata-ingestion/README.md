# DataHub Metadata Ingestion 模块总览

## 概述

DataHub Metadata Ingestion 是一个强大的 Python 框架，用于从各种数据源提取元数据并将其摄取到 DataHub 平台中。该框架采用**可扩展的插件架构**，支持 40+ 种数据源，并提供灵活的转换和过滤能力。

## 核心架构

### 架构概览

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌──────────┐
│   Source    │─────→│ Transformer  │─────→│   Sink      │─────→│ DataHub  │
│  Connector  │      │   (可选)      │      │  (Emitter)  │      │   GMS    │
└─────────────┘      └──────────────┘      └─────────────┘      └──────────┘
      │                                            │
      │ WorkUnit 流                                │ MCE/MCP
      ▼                                            ▼
┌──────────────────────────────────────────────────────────┐
│              Pipeline Orchestrator                       │
│  • WorkUnit 处理                                         │
│  • 错误处理与重试                                        │
│  • 状态管理 (Stateful Ingestion)                        │
│  • 报告生成                                              │
└──────────────────────────────────────────────────────────┘
```

### 核心组件

#### 1. Source (数据源)

Source 是元数据提取的起点，负责连接到数据系统并提取元数据。

**核心接口**: `datahub.ingestion.api.source.Source`

```python
@dataclass
class Source(Closeable, metaclass=ABCMeta):
    ctx: PipelineContext

    @classmethod
    @abstractmethod
    def create(cls, config_dict: dict, ctx: PipelineContext) -> Self:
        """从配置创建 Source 实例"""
        pass

    def get_workunits_internal(self) -> MetadataWorkUnitIterable:
        """生成 WorkUnit 流 - 核心方法"""
        raise NotImplementedError

    @abstractmethod
    def get_report(self) -> SourceReport:
        """返回采集报告"""
        pass
```

**主要特性**:
- **流式处理**: 使用 Generator 模式，支持大规模数据源
- **增量采集**: 支持 Stateful Ingestion，仅提取变更数据
- **能力声明**: 通过 `@capability` 装饰器声明支持的功能
- **错误处理**: 结构化日志记录和详细的错误报告

#### 2. WorkUnit (工作单元)

WorkUnit 是框架中的数据传输单元，封装了元数据变更事件。

**核心类**: `datahub.ingestion.api.workunit.MetadataWorkUnit`

```python
@dataclass
class MetadataWorkUnit(WorkUnit):
    metadata: Union[
        MetadataChangeEvent,        # 旧格式 (MCE)
        MetadataChangeProposal,     # 新格式 (MCP)
        MetadataChangeProposalWrapper
    ]
    treat_errors_as_warnings: bool = False
    is_primary_source: bool = True
```

**WorkUnit 类型**:
- **MetadataChangeEvent (MCE)**: 快照式更新，包含实体的完整状态
- **MetadataChangeProposal (MCP)**: 增量更新，只包含变更的 Aspect
- **MetadataChangeProposalWrapper**: MCP 的强类型封装

#### 3. Transformer (转换器)

Transformer 用于在数据发送到 Sink 之前转换元数据。

**核心接口**: `datahub.ingestion.api.transform.Transformer`

```python
class Transformer:
    @abstractmethod
    def transform(
        self, record_envelopes: Iterable[RecordEnvelope]
    ) -> Iterable[RecordEnvelope]:
        """转换记录流"""
        pass

    @classmethod
    @abstractmethod
    def create(cls, config_dict: dict, ctx: PipelineContext) -> "Transformer":
        pass
```

**常用 Transformer**:
- `AddDatasetOwnership`: 添加数据集所有者
- `AddDatasetTags`: 添加标签
- `AddDatasetDomain`: 设置数据域
- `PatternAddDatasetSchemaTerms`: 基于模式匹配添加术语

#### 4. Sink (数据接收器)

Sink 负责将转换后的元数据发送到目标系统。

**核心接口**: `datahub.ingestion.api.sink.Sink`

主要实现:
- **DatahubRestSink**: 通过 REST API 发送 (推荐)
- **DatahubKafkaSink**: 通过 Kafka 发送
- **FileSink**: 输出到本地文件 (调试用)
- **ConsoleSink**: 输出到控制台 (调试用)

#### 5. Emitter (发送器)

Emitter 是 Sink 的底层实现，处理实际的网络通信。

**核心类**:
- `DataHubRestEmitter`: REST API 客户端
- `DatahubKafkaEmitter`: Kafka 生产者
- `FileEmitter`: 文件写入器

## 支持的数据源

### 数据库系统

| 数据源 | 插件名称 | 支持级别 | 主要特性 |
|--------|---------|----------|----------|
| **Snowflake** | `snowflake` | ✅ CERTIFIED | 表/视图、血缘、使用统计、Profiling、标签 |
| **BigQuery** | `bigquery` | ✅ CERTIFIED | 完整血缘、使用统计、列级血缘、数据质量 |
| **MySQL** | `mysql` | ✅ CERTIFIED | Schema、视图、Profiling、基础血缘 |
| **PostgreSQL** | `postgres` | ✅ CERTIFIED | Schema、视图、Profiling、外键血缘 |
| **Oracle** | `oracle` | ✅ CERTIFIED | Schema、视图、Profiling |
| **MSSQL** | `mssql` | ✅ CERTIFIED | Schema、视图、Profiling |
| **Redshift** | `redshift` | ✅ CERTIFIED | Schema、使用统计、血缘 |
| **Databricks** | `databricks` | ✅ CERTIFIED | Unity Catalog、Notebooks、血缘 |
| **Hive** | `hive` | ✅ CERTIFIED | Schema、分区、使用统计 |

### 数据仓库与湖仓

| 数据源 | 插件名称 | 支持级别 | 主要特性 |
|--------|---------|----------|----------|
| **AWS S3** | `s3` | ✅ CERTIFIED | 文件发现、Schema 推断、分区 |
| **Azure Data Lake** | `adls` | ✅ CERTIFIED | Blob/Data Lake、Schema 推断 |
| **Google Cloud Storage** | `gcs` | ✅ INCUBATING | 文件发现、Schema 推断 |
| **Delta Lake** | `delta-lake` | ✅ CERTIFIED | 表元数据、版本历史 |
| **Iceberg** | `iceberg` | ✅ INCUBATING | 表元数据、快照 |

### BI 与数据可视化

| 数据源 | 插件名称 | 支持级别 | 主要特性 |
|--------|---------|----------|----------|
| **Looker** | `looker` | ✅ CERTIFIED | Dashboard、图表、血缘、使用统计 |
| **Tableau** | `tableau` | ✅ CERTIFIED | Workbook、数据源、血缘 |
| **Power BI** | `powerbi` | ✅ CERTIFIED | Dashboard、报告、数据集 |
| **Superset** | `superset` | ✅ INCUBATING | Dashboard、图表、数据集 |

### 编排与 ETL

| 数据源 | 插件名称 | 支持级别 | 主要特性 |
|--------|---------|----------|----------|
| **Airflow** | `airflow` | ✅ CERTIFIED | DAG 血缘、任务执行历史 |
| **dbt** | `dbt` | ✅ CERTIFIED | 模型血缘、测试、文档 |
| **Kafka** | `kafka` | ✅ CERTIFIED | Topic Schema、消费者组 |

### NoSQL 与搜索引擎

| 数据源 | 插件名称 | 支持级别 | 主要特性 |
|--------|---------|----------|----------|
| **MongoDB** | `mongodb` | ✅ CERTIFIED | 集合 Schema、文档采样 |
| **Elasticsearch** | `elasticsearch` | ✅ INCUBATING | 索引元数据、Mapping |
| **Cassandra** | `cassandra` | ✅ INCUBATING | Keyspace、表元数据 |

## CLI 命令说明

### 核心命令

#### 1. 执行采集

```bash
# 基本用法
datahub ingest -c recipe.yml

# 预览模式 (不实际发送)
datahub ingest -c recipe.yml --preview

# 预览并限制数量
datahub ingest -c recipe.yml --preview --preview-workunits 20

# 调试模式
datahub ingest -c recipe.yml --debug

# 持久化报告
datahub ingest -c recipe.yml --report-to report.json
```

#### 2. 检查连接

```bash
# 测试数据源连接
datahub check plugins
datahub check source-connection -c recipe.yml
```

#### 3. 初始化配置

```bash
# 生成示例配置
datahub init

# 列出可用数据源
datahub check plugins

# 生成特定数据源的配置模板
datahub init --source snowflake
```

#### 4. 状态管理

```bash
# 查看状态信息
datahub ingest show-state -c recipe.yml

# 清除状态 (重新开始)
datahub ingest clear-state -c recipe.yml
```

### Recipe 配置文件

Recipe 是采集管道的配置文件，使用 YAML 格式：

```yaml
# recipe.yml
source:
  type: snowflake
  config:
    # 连接配置
    account_id: "abc12345.us-east-1"
    username: "${SNOWFLAKE_USER}"
    password: "${SNOWFLAKE_PASSWORD}"
    warehouse: "COMPUTE_WH"

    # 过滤配置
    database_pattern:
      allow: ["PROD_DB", "ANALYTICS_DB"]
      deny: [".*_TEST$"]

    schema_pattern:
      allow: ["PUBLIC", "SALES"]

    # 功能开关
    include_tables: true
    include_views: true
    include_table_lineage: true
    include_usage_stats: true

    # Profiling 配置
    profiling:
      enabled: true
      profile_table_level_only: false
      max_workers: 4

# 可选: Transformer 配置
transformers:
  - type: "simple_add_dataset_ownership"
    config:
      owner_urns:
        - "urn:li:corpuser:data_team"

  - type: "pattern_add_dataset_tags"
    config:
      tag_pattern:
        rules:
          ".*_PII$": ["PII", "Sensitive"]
          ".*_CUSTOMER.*": ["Customer Data"]

# Sink 配置
sink:
  type: datahub-rest
  config:
    server: "http://localhost:8080"
    token: "${DATAHUB_TOKEN}"

    # 性能配置
    mode: ASYNC_BATCH  # SYNC, ASYNC, ASYNC_BATCH
    max_threads: 4
    max_per_batch: 100
```

### 环境变量

框架支持以下环境变量：

```bash
# DataHub 服务器配置
export DATAHUB_GMS_URL="http://localhost:8080"
export DATAHUB_TOKEN="your_access_token"

# 数据源凭证 (避免硬编码)
export SNOWFLAKE_USER="your_username"
export SNOWFLAKE_PASSWORD="your_password"

# 性能调优
export DATAHUB_REST_SINK_MAX_THREADS=8
export DATAHUB_REST_SINK_MODE=ASYNC_BATCH

# Python 虚拟环境 (用于构建)
export DATAHUB_VENV_USE_COPIES=true  # 适用于 Nix 等环境
```

## 采集模式

### Pull-Based (拉取式)

大多数 Source Connector 使用拉取式采集：

**特点**:
- 定期轮询数据源
- 批量提取元数据
- 支持增量采集 (Stateful Ingestion)

**典型用例**:
- 数据库 Schema 采集
- BI 工具元数据同步
- 云存储文件发现

**调度方式**:
```bash
# 使用 cron 定时执行
0 2 * * * cd /path/to/datahub && datahub ingest -c snowflake.yml

# 使用 Airflow 调度
# 参见 examples/airflow/ 目录
```

### Push-Based (推送式)

实时采集场景使用推送式：

**特点**:
- 事件驱动
- 低延迟 (秒级)
- 与数据生成紧密集成

**典型用例**:
- Airflow DAG 执行血缘
- Spark 作业实时血缘
- Great Expectations 数据质量检查

**集成方式**:
```python
# Python Emitter (作为库使用)
from datahub.emitter.mce_builder import make_dataset_urn
from datahub.emitter.rest_emitter import DatahubRestEmitter

emitter = DatahubRestEmitter("http://localhost:8080")

# 发送元数据
dataset_urn = make_dataset_urn("snowflake", "db.schema.table")
# ... 构造 MetadataChangeProposal
emitter.emit_mcp(mcp)
```

## Stateful Ingestion (状态式采集)

Stateful Ingestion 支持增量采集，显著提高性能并减少成本。

### 工作原理

```
第一次运行: 采集所有数据
┌─────────────────┐
│ 保存 Checkpoint │ → 记录采集状态 (时间戳、实体列表等)
└─────────────────┘

后续运行: 增量采集
┌─────────────────┐
│ 读取 Checkpoint │ → 仅采集变更的数据
└─────────────────┘
```

### 配置示例

```yaml
source:
  type: snowflake
  config:
    # ... 其他配置

    # 启用 Stateful Ingestion
    stateful_ingestion:
      enabled: true

      # 状态存储后端
      state_provider:
        type: datahub  # 存储在 DataHub 服务器
        config:
          datahub_api:
            server: "http://localhost:8080"
            token: "${DATAHUB_TOKEN}"

      # 过期实体删除
      remove_stale_metadata: true

      # 增量配置
      ignore_old_state: false
      ignore_new_state: false
```

### 支持的功能

| 功能 | 描述 |
|------|------|
| **Incremental Metadata** | 仅采集变更的表/视图 |
| **Incremental Lineage** | 仅采集新的血缘关系 |
| **Incremental Usage** | 仅采集增量使用统计 |
| **Stale Entity Removal** | 自动删除已不存在的实体 |
| **Checkpoint Management** | 状态持久化和恢复 |

## 性能优化

### 1. 并行处理

```yaml
sink:
  type: datahub-rest
  config:
    mode: ASYNC_BATCH     # 使用批量异步模式
    max_threads: 8        # 增加并发线程数
    max_per_batch: 100    # 每批次最多 100 个 MCP
```

### 2. 过滤不需要的数据

```yaml
source:
  type: snowflake
  config:
    # 排除系统数据库
    database_pattern:
      deny: [".*_TEST$", "TEMP.*"]

    # 仅采集必要的功能
    include_tables: true
    include_views: false  # 跳过视图

    profiling:
      enabled: false  # 跳过 Profiling (耗时)
```

### 3. 增量采集

启用 Stateful Ingestion (如上所述)。

### 4. Profiling 优化

```yaml
source:
  type: snowflake
  config:
    profiling:
      enabled: true
      profile_table_level_only: true  # 仅表级统计
      max_workers: 8                  # 并行 Profiling

      # 采样配置
      profile_table_row_limit: 10000
      profile_table_size_limit: 5000000000  # 5GB

      # 跳过大表
      profile_if_updated_since_days: 7
```

## 目录结构

```
metadata-ingestion/
├── src/datahub/ingestion/
│   ├── api/                    # 核心 API 接口
│   │   ├── source.py           # Source 基类
│   │   ├── sink.py             # Sink 基类
│   │   ├── transform.py        # Transformer 基类
│   │   └── workunit.py         # WorkUnit 定义
│   │
│   ├── source/                 # Source Connector 实现
│   │   ├── snowflake/          # Snowflake Connector
│   │   ├── bigquery_v2/        # BigQuery Connector
│   │   ├── mysql/              # MySQL Connector
│   │   ├── kafka/              # Kafka Connector
│   │   └── ...
│   │
│   ├── sink/                   # Sink 实现
│   │   ├── datahub_rest.py     # REST Sink
│   │   ├── datahub_kafka.py    # Kafka Sink
│   │   └── file.py             # File Sink
│   │
│   ├── transformer/            # Transformer 实现
│   │   ├── add_dataset_ownership.py
│   │   ├── add_dataset_tags.py
│   │   └── ...
│   │
│   ├── run/                    # 管道运行逻辑
│   │   └── pipeline.py         # Pipeline 编排器
│   │
│   └── graph/                  # DataHub Graph API 客户端
│       └── client.py
│
├── tests/                      # 测试用例
│   ├── unit/                   # 单元测试
│   └── integration/            # 集成测试
│
├── examples/                   # 示例 Recipe 配置
│   ├── recipes/
│   └── library/
│
├── docs/                       # 文档
│   └── sources/                # 数据源文档
│
├── setup.py                    # 包定义和插件注册
├── pyproject.toml              # 现代 Python 项目配置
└── README.md
```

## 快速开始

### 安装

```bash
# 基础安装
pip install acryl-datahub

# 安装特定数据源的依赖
pip install 'acryl-datahub[snowflake]'
pip install 'acryl-datahub[bigquery]'
pip install 'acryl-datahub[mysql]'

# 或安装所有依赖 (不推荐，包体积大)
pip install 'acryl-datahub[all]'
```

### 第一个采集任务

1. **创建配置文件**

```bash
datahub init --source mysql
# 编辑生成的 recipe.yml
```

2. **测试连接**

```bash
datahub check source-connection -c recipe.yml
```

3. **预览采集**

```bash
datahub ingest -c recipe.yml --preview --preview-workunits 10
```

4. **执行采集**

```bash
datahub ingest -c recipe.yml
```

5. **查看结果**

访问 DataHub UI: `http://localhost:9002`

## 下一步

- [Source Connector 开发指南](./source-development.md) - 学习如何开发自定义 Connector
- [Transformer 开发指南](./transformers.md) - 了解元数据转换
- [Emitter 详解](./emitters.md) - 深入理解数据发送机制
- [完整开发指南](./development.md) - 环境搭建和贡献指南
- [Snowflake Connector](./sources/snowflake.md) - 最完整的 Connector 实现参考
- [BigQuery Connector](./sources/bigquery.md) - 云数据仓库集成示例

## 常见问题

### 如何调试采集问题？

```bash
# 启用详细日志
datahub ingest -c recipe.yml --debug

# 输出到文件而非 DataHub
datahub ingest -c recipe.yml --sink-config '{"type": "file", "config": {"filename": "output.json"}}'

# 检查生成的 MCP
jq '.metadata' output.json | head -20
```

### 如何处理大规模数据源？

1. 启用 Stateful Ingestion (增量采集)
2. 使用过滤器限制采集范围
3. 增加并行度 (`max_threads`)
4. 禁用非必要功能 (如 Profiling)
5. 使用 `ASYNC_BATCH` 模式

### 如何贡献新的 Connector？

参见 [添加新数据源指南](./source-development.md#添加新的-source-connector)。

## 参考资源

- [官方文档](https://datahubproject.io/docs/metadata-ingestion/)
- [源代码](https://github.com/datahub-project/datahub/tree/master/metadata-ingestion)
- [Issue 追踪](https://github.com/datahub-project/datahub/issues)
- [Slack 社区](https://datahubspace.slack.com/)
