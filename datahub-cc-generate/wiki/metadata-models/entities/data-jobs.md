# DataJob 和 DataFlow Entity 文档

## 概述

DataHub 使用两个相关的实体来建模数据处理流程：

- **DataFlow**：数据流程/管道的容器（如 Airflow DAG、dbt Project）
- **DataJob**：数据流程中的单个任务/作业（如 Airflow Task、dbt Model）

### 常见示例

- **Airflow**: DAG (DataFlow) → Tasks (DataJob)
- **dbt**: Project (DataFlow) → Models (DataJob)
- **Spark**: Application (DataFlow) → Job (DataJob)
- **Databricks**: Workflow (DataFlow) → Notebook (DataJob)

## DataFlow Entity

### URN 格式

```
urn:li:dataFlow:(<orchestrator>,<flow_id>,<cluster>)
```

### URN 示例

```
# Airflow DAG
urn:li:dataFlow:(airflow,user_etl_dag,prod)

# dbt Project
urn:li:dataFlow:(dbt,analytics_project,prod)

# Spark Application
urn:li:dataFlow:(spark,data_processing_app,prod)
```

### Key Aspect: DataFlowKey

```pdl
@Aspect = {
  "name": "dataFlowKey"
}
record DataFlowKey {
  /**
   * Workflow manager like Airflow, dbt, etc.
   */
  orchestrator: string

  /**
   * Unique Identifier of the data flow
   */
  flowId: string

  /**
   * Cluster where the flow is executed
   */
  cluster: string
}
```

### 核心 Aspects

#### 1. dataFlowInfo

**定义文件**：`com/linkedin/datajob/DataFlowInfo.pdl`

```pdl
record DataFlowInfo {
  /**
   * Flow name
   */
  name: string

  /**
   * Flow description
   */
  description: optional string

  /**
   * Optional project/namespace
   */
  project: optional string

  /**
   * Created timestamp
   */
  created: optional TimeStamp

  /**
   * Last modified timestamp
   */
  lastModified: optional TimeStamp

  /**
   * Environment
   */
  env: optional FabricType

  /**
   * Custom properties
   */
  customProperties: map[string, string]

  /**
   * External URL
   */
  externalUrl: optional Url
}
```

#### 使用示例

```json
{
  "name": "User ETL Pipeline",
  "description": "Daily pipeline to sync user data from MySQL to Snowflake",
  "project": "data_engineering",
  "created": {
    "time": 1609459200000,
    "actor": "urn:li:corpuser:etl_team"
  },
  "lastModified": {
    "time": 1640995200000,
    "actor": "urn:li:corpuser:data_engineer"
  },
  "env": "PROD",
  "customProperties": {
    "schedule": "0 2 * * *",
    "owner_email": "data-eng@company.com",
    "slack_channel": "#data-alerts"
  },
  "externalUrl": "https://airflow.company.com/dags/user_etl_dag"
}
```

## DataJob Entity

### URN 格式

```
urn:li:dataJob:(<data_flow_urn>,<job_id>)
```

### URN 示例

```
# Airflow Task
urn:li:dataJob:(urn:li:dataFlow:(airflow,user_etl_dag,prod),extract_users)

# dbt Model
urn:li:dataJob:(urn:li:dataFlow:(dbt,analytics_project,prod),models.staging.stg_users)

# Spark Job
urn:li:dataJob:(urn:li:dataFlow:(spark,data_processing_app,prod),transform_stage)
```

### Key Aspect: DataJobKey

```pdl
@Aspect = {
  "name": "dataJobKey"
}
record DataJobKey {
  /**
   * DataFlow urn that this job is part of
   */
  flow: DataFlowUrn

  /**
   * Unique Identifier of the data job
   */
  jobId: string
}
```

### 核心 Aspects

#### 1. dataJobInfo

**定义文件**：`com/linkedin/datajob/DataJobInfo.pdl`

```pdl
record DataJobInfo {
  /**
   * Job name
   */
  name: string

  /**
   * Job description
   */
  description: optional string

  /**
   * Job type
   */
  type: union[AzkabanJobType, string]

  /**
   * DataFlow urn
   */
  flowUrn: optional DataFlowUrn

  /**
   * Created timestamp
   */
  created: optional TimeStamp

  /**
   * Last modified timestamp
   */
  lastModified: optional TimeStamp

  /**
   * Environment
   */
  env: optional FabricType

  /**
   * Custom properties
   */
  customProperties: map[string, string]

  /**
   * External URL
   */
  externalUrl: optional Url
}
```

#### 使用示例

```json
{
  "name": "Extract Users Task",
  "description": "Extract user data from MySQL production database",
  "type": "PYTHON",
  "flowUrn": "urn:li:dataFlow:(airflow,user_etl_dag,prod)",
  "created": {
    "time": 1609459200000,
    "actor": "urn:li:corpuser:data_engineer"
  },
  "lastModified": {
    "time": 1640995200000,
    "actor": "urn:li:corpuser:data_engineer"
  },
  "env": "PROD",
  "customProperties": {
    "timeout": "300",
    "retries": "3",
    "executor": "KubernetesExecutor"
  },
  "externalUrl": "https://airflow.company.com/dags/user_etl_dag/tasks/extract_users"
}
```

#### 2. dataJobInputOutput

**定义文件**：`com/linkedin/datajob/DataJobInputOutput.pdl`

定义 DataJob 的输入和输出数据集。

```pdl
record DataJobInputOutput {
  /**
   * Input datasets
   */
  inputDatasets: array[DatasetUrn]

  /**
   * Output datasets
   */
  outputDatasets: array[DatasetUrn]

  /**
   * Input datasets (with lineage fields)
   */
  inputDatasetEdges: optional array[Edge]

  /**
   * Output datasets (with lineage fields)
   */
  outputDatasetEdges: optional array[Edge]

  /**
   * Input data jobs
   */
  inputDatajobs: optional array[DataJobUrn]

  /**
   * Input data jobs (with lineage fields)
   */
  inputDatajobEdges: optional array[Edge]

  /**
   * Fine-grained lineages
   */
  fineGrainedLineages: optional array[FineGrainedLineage]
}
```

#### 使用示例

```json
{
  "inputDatasetEdges": [
    {
      "destinationUrn": "urn:li:dataset:(urn:li:dataPlatform:mysql,prod_db.users,PROD)",
      "created": {
        "time": 1640995200000,
        "actor": "urn:li:corpuser:airflow"
      }
    }
  ],
  "outputDatasetEdges": [
    {
      "destinationUrn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics_db.dim_users,PROD)",
      "created": {
        "time": 1640995200000,
        "actor": "urn:li:corpuser:airflow"
      }
    }
  ],
  "fineGrainedLineages": [
    {
      "upstreamType": "FIELD_SET",
      "upstreams": [
        "urn:li:schemaField:(urn:li:dataset:(urn:li:dataPlatform:mysql,prod_db.users,PROD),user_id)"
      ],
      "downstreamType": "FIELD_SET",
      "downstreams": [
        "urn:li:schemaField:(urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics_db.dim_users,PROD),user_key)"
      ],
      "transformOperation": "HASH"
    }
  ]
}
```

#### 3. dataTransformLogic

**定义文件**：`com/linkedin/common/DataTransformLogic.pdl`

存储数据转换的 SQL 或代码逻辑。

```json
{
  "type": "SQL",
  "sql": "SELECT user_id, email, created_at FROM users WHERE active = true",
  "language": "ANSI_SQL"
}
```

## 关系图

```
DataFlow (Airflow DAG)
   │
   ├── Contains ──────→ DataJob (Task 1)
   │                       ├── Reads ──────→ Dataset A
   │                       └── Writes ─────→ Dataset B
   │
   ├── Contains ──────→ DataJob (Task 2)
   │                       ├── Reads ──────→ Dataset B
   │                       └── Writes ─────→ Dataset C
   │
   ├── OwnedBy ───────→ CorpUser / CorpGroup
   ├── HasTags ───────→ Tag
   └── InDomain ──────→ Domain
```

## 实际使用场景

### 场景 1：摄取 Airflow DAG 元数据

```yaml
# airflow_recipe.yml
source:
  type: airflow
  config:
    conn_id: airflow_prod
    webserver_url: https://airflow.company.com
    dag_pattern:
      allow:
        - ".*etl.*"
        - ".*transform.*"
    include_start_execution_time: true

sink:
  type: datahub-rest
  config:
    server: http://localhost:8080
```

运行摄取：

```bash
datahub ingest -c airflow_recipe.yml
```

### 场景 2：摄取 dbt 模型元数据

```yaml
# dbt_recipe.yml
source:
  type: dbt
  config:
    manifest_path: "./target/manifest.json"
    catalog_path: "./target/catalog.json"
    run_results_path: "./target/run_results.json"
    target_platform: snowflake
    target_platform_instance: prod

sink:
  type: datahub-rest
  config:
    server: http://localhost:8080
```

### 场景 3：通过 GraphQL 查询 DataJob

```graphql
query GetDataJob {
  dataJob(urn: "urn:li:dataJob:(urn:li:dataFlow:(airflow,etl_dag,prod),extract_users)") {
    urn
    dataFlow {
      flowId
      orchestrator
      info {
        name
      }
    }
    info {
      name
      description
      type
    }
    inputOutput {
      inputDatasets {
        urn
        name
        platform {
          name
        }
      }
      outputDatasets {
        urn
        name
      }
    }
    ownership {
      owners {
        owner {
          ... on CorpUser {
            username
          }
        }
      }
    }
  }
}
```

### 场景 4：通过 Python SDK 创建 DataJob

```python
from datahub.emitter.mcp import MetadataChangeProposalWrapper
from datahub.emitter.rest_emitter import DatahubRestEmitter
from datahub.metadata.schema_classes import (
    DataJobInfoClass,
    DataJobInputOutputClass,
    EdgeClass,
    AuditStampClass
)

# 创建 DataFlow URN
dataflow_urn = "urn:li:dataFlow:(airflow,user_etl_dag,prod)"

# 创建 DataJob URN
datajob_urn = f"urn:li:dataJob:({dataflow_urn},extract_users)"

# 创建 DataJobInfo
datajob_info = DataJobInfoClass(
    name="Extract Users Task",
    description="Extract user data from MySQL",
    type="PYTHON",
    flowUrn=dataflow_urn,
    customProperties={
        "timeout": "300",
        "retries": "3"
    }
)

# 创建 DataJobInputOutput
datajob_io = DataJobInputOutputClass(
    inputDatasetEdges=[
        EdgeClass(
            destinationUrn="urn:li:dataset:(urn:li:dataPlatform:mysql,prod_db.users,PROD)",
            created=AuditStampClass(
                time=1640995200000,
                actor="urn:li:corpuser:airflow"
            )
        )
    ],
    outputDatasetEdges=[
        EdgeClass(
            destinationUrn="urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.dim_users,PROD)",
            created=AuditStampClass(
                time=1640995200000,
                actor="urn:li:corpuser:airflow"
            )
        )
    ]
)

# 发送到 DataHub
emitter = DatahubRestEmitter("http://localhost:8080")

emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn=datajob_urn,
        aspect=datajob_info
    )
)

emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn=datajob_urn,
        aspect=datajob_io
    )
)
```

## DataProcessInstance（运行实例）

**DataProcessInstance** 是 DataJob 的执行实例，记录单次运行的状态和结果。

### URN 格式

```
urn:li:dataProcessInstance:<instance_id>
```

### 核心 Aspects

#### dataProcessInstanceRunEvent

记录运行状态和时间。

```json
{
  "timestampMillis": 1640995200000,
  "status": "COMPLETE",
  "result": {
    "type": "SUCCESS",
    "nativeResultType": "airflow"
  },
  "durationMillis": 300000,
  "attempt": 1
}
```

## 支持的编排工具

| 工具 | Platform ID | 摄取支持 |
|------|------------|---------|
| Airflow | `airflow` | ✅ Full |
| dbt | `dbt` | ✅ Full |
| Dagster | `dagster` | ✅ Full |
| Prefect | `prefect` | ✅ Full |
| Azure Data Factory | `adf` | ✅ Full |
| Great Expectations | `great-expectations` | ✅ Partial |
| Spark | `spark` | ✅ Partial |
| Databricks | `databricks` | ✅ Full |

## 最佳实践

### 1. DataFlow 和 DataJob 命名

- **DataFlow**: 使用业务友好的名称（如 `daily_user_sync`）
- **DataJob**: 使用清晰描述任务的名称（如 `extract_mysql_users`）
- 保持命名一致性

### 2. 描述信息

- 说明 DataJob 的业务目的
- 记录数据转换逻辑
- 注明依赖关系和顺序
- 提供故障排查信息

### 3. 血缘关系

- 使用 `dataJobInputOutput` 明确输入输出
- 对于复杂转换，使用 `fineGrainedLineages` 记录字段级血缘
- 使用 `dataTransformLogic` 保存 SQL/代码

### 4. 运行实例

- 定期清理旧的 `dataProcessInstance`
- 监控失败率和执行时长
- 用于根因分析和性能优化

### 5. 自定义属性

推荐记录的 customProperties：

```json
{
  "schedule": "0 2 * * *",
  "timeout_seconds": "3600",
  "retries": "3",
  "sla_hours": "4",
  "notification_email": "data-team@company.com",
  "cost_center": "engineering",
  "criticality": "high"
}
```

## 相关文档

- [Dataset Entity](dataset.md)
- [Lineage Aspect](../aspects/lineage.md)
- [Entity Registry](../entity-registry.md)

## 外部资源

- [DataHub DataFlow 官方文档](https://datahubproject.io/docs/generated/metamodel/entities/dataFlow/)
- [DataHub DataJob 官方文档](https://datahubproject.io/docs/generated/metamodel/entities/dataJob/)
- [Airflow Integration](https://datahubproject.io/docs/generated/ingestion/sources/airflow/)
- [dbt Integration](https://datahubproject.io/docs/generated/ingestion/sources/dbt/)
