# Lineage (血缘) Aspect 文档

## 概述

**Lineage** Aspects 用于追踪数据的来源和流向，帮助理解数据如何在系统中流动和转换。DataHub 支持多种血缘 Aspects：

- **upstreamLineage**: 上游血缘（通用）
- **datasetUpstreamLineage**: Dataset 特定上游血缘
- **dataJobInputOutput**: DataJob 的输入输出
- **fineGrainedLineages**: 字段级血缘

## 定义文件

- `com/linkedin/common/UpstreamLineage.pdl`
- `com/linkedin/dataset/UpstreamLineage.pdl`
- `com/linkedin/datajob/DataJobInputOutput.pdl`

## upstreamLineage Aspect

### Aspect 名称

```
upstreamLineage
```

### 适用实体

- Dataset
- Dashboard
- Chart

### PDL 定义

```pdl
@Aspect = {
  "name": "upstreamLineage"
}
record UpstreamLineage {
  /**
   * List of upstream datasets
   */
  upstreams: array[Upstream]

  /**
   * Fine-grained lineages (field-level)
   */
  fineGrainedLineages: optional array[FineGrainedLineage]
}
```

### Upstream Record

```pdl
record Upstream {
  /**
   * Dataset URN
   */
  @Relationship = {
    "name": "DownstreamOf",
    "entityTypes": [ "dataset" ],
    "isLineage": true
  }
  dataset: DatasetUrn

  /**
   * Type of lineage
   */
  type: DatasetLineageType

  /**
   * Audit stamp
   */
  auditStamp: AuditStamp

  /**
   * Query that generated the lineage
   */
  query: optional string

  /**
   * Platform where query was executed
   */
  platform: optional Urn
}
```

### DatasetLineageType 枚举

```pdl
enum DatasetLineageType {
  /**
   * Direct copy (no transformation)
   */
  COPY

  /**
   * Transformed data
   */
  TRANSFORMED

  /**
   * View (SQL view)
   */
  VIEW
}
```

## 使用示例

### 示例 1：基本上游血缘

```json
{
  "upstreams": [
    {
      "dataset": "urn:li:dataset:(urn:li:dataPlatform:mysql,ecommerce.orders,PROD)",
      "type": "TRANSFORMED",
      "auditStamp": {
        "time": 1640995200000,
        "actor": "urn:li:corpuser:etl_pipeline"
      },
      "query": "SELECT order_id, SUM(amount) as total FROM orders GROUP BY order_id"
    },
    {
      "dataset": "urn:li:dataset:(urn:li:dataPlatform:mysql,ecommerce.users,PROD)",
      "type": "TRANSFORMED",
      "auditStamp": {
        "time": 1640995200000,
        "actor": "urn:li:corpuser:etl_pipeline"
      }
    }
  ]
}
```

### 示例 2：包含查询的血缘

```json
{
  "upstreams": [
    {
      "dataset": "urn:li:dataset:(urn:li:dataPlatform:snowflake,raw_db.sales_data,PROD)",
      "type": "TRANSFORMED",
      "auditStamp": {
        "time": 1640995200000,
        "actor": "urn:li:dataJob:(urn:li:dataFlow:(dbt,analytics,prod),transform_sales)"
      },
      "query": "SELECT\n  sale_id,\n  customer_id,\n  amount * 1.1 as amount_with_tax,\n  sale_date\nFROM {{ ref('raw_sales') }}",
      "platform": "urn:li:dataPlatform:dbt"
    }
  ]
}
```

## 字段级血缘（Fine-Grained Lineage）

### FineGrainedLineage 结构

```pdl
record FineGrainedLineage {
  /**
   * Upstream field URNs
   */
  upstreams: array[Urn]

  /**
   * Upstream type (FIELD_SET, DATASET, etc.)
   */
  upstreamType: FineGrainedLineageUpstreamType

  /**
   * Downstream field URNs
   */
  downstreams: array[Urn]

  /**
   * Downstream type (FIELD_SET, DATASET, etc.)
   */
  downstreamType: FineGrainedLineageDownstreamType

  /**
   * Transformation operation
   */
  transformOperation: optional string

  /**
   * Confidence score (0.0 to 1.0)
   */
  confidenceScore: optional float = 1.0

  /**
   * Query that generated the lineage
   */
  query: optional string
}
```

### 示例：字段级血缘

```json
{
  "fineGrainedLineages": [
    {
      "upstreamType": "FIELD_SET",
      "upstreams": [
        "urn:li:schemaField:(urn:li:dataset:(urn:li:dataPlatform:mysql,source.orders,PROD),order_id)"
      ],
      "downstreamType": "FIELD_SET",
      "downstreams": [
        "urn:li:schemaField:(urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.fact_orders,PROD),order_key)"
      ],
      "transformOperation": "HASH",
      "confidenceScore": 1.0,
      "query": "SELECT MD5(order_id) as order_key FROM source.orders"
    },
    {
      "upstreamType": "FIELD_SET",
      "upstreams": [
        "urn:li:schemaField:(urn:li:dataset:(urn:li:dataPlatform:mysql,source.orders,PROD),amount)",
        "urn:li:schemaField:(urn:li:dataset:(urn:li:dataPlatform:mysql,source.orders,PROD),tax)"
      ],
      "downstreamType": "FIELD_SET",
      "downstreams": [
        "urn:li:schemaField:(urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.fact_orders,PROD),total_amount)"
      ],
      "transformOperation": "SUM",
      "confidenceScore": 1.0,
      "query": "SELECT amount + tax as total_amount FROM source.orders"
    }
  ]
}
```

## DataJob 血缘

### dataJobInputOutput Aspect

DataJob 使用专门的 Aspect 记录输入输出：

```json
{
  "inputDatasetEdges": [
    {
      "destinationUrn": "urn:li:dataset:(urn:li:dataPlatform:mysql,source.orders,PROD)",
      "created": {
        "time": 1640995200000,
        "actor": "urn:li:corpuser:airflow"
      }
    }
  ],
  "outputDatasetEdges": [
    {
      "destinationUrn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.orders,PROD)",
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
        "urn:li:schemaField:(urn:li:dataset:(urn:li:dataPlatform:mysql,source.orders,PROD),customer_id)"
      ],
      "downstreamType": "FIELD_SET",
      "downstreams": [
        "urn:li:schemaField:(urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.orders,PROD),customer_key)"
      ],
      "transformOperation": "IDENTITY"
    }
  ]
}
```

## 实际使用场景

### 场景 1：通过 Python SDK 添加血缘

```python
from datahub.metadata.schema_classes import (
    UpstreamLineageClass,
    UpstreamClass,
    DatasetLineageTypeClass,
    AuditStampClass
)

# 创建上游血缘
upstream_lineage = UpstreamLineageClass(
    upstreams=[
        UpstreamClass(
            dataset="urn:li:dataset:(urn:li:dataPlatform:mysql,source.orders,PROD)",
            type=DatasetLineageTypeClass.TRANSFORMED,
            auditStamp=AuditStampClass(
                time=1640995200000,
                actor="urn:li:corpuser:etl_pipeline"
            ),
            query="SELECT * FROM orders WHERE status = 'completed'"
        ),
        UpstreamClass(
            dataset="urn:li:dataset:(urn:li:dataPlatform:mysql,source.customers,PROD)",
            type=DatasetLineageTypeClass.TRANSFORMED,
            auditStamp=AuditStampClass(
                time=1640995200000,
                actor="urn:li:corpuser:etl_pipeline"
            )
        )
    ]
)

# 发送到 DataHub
emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn="urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.orders,PROD)",
        aspect=upstream_lineage
    )
)
```

### 场景 2：从 SQL 解析血缘

```python
from datahub.utilities.sql_lineage_parser import SqlLineageParser

sql = """
INSERT INTO analytics.customer_orders
SELECT
    c.customer_id,
    c.name,
    COUNT(o.order_id) as order_count,
    SUM(o.amount) as total_amount
FROM source.customers c
LEFT JOIN source.orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name
"""

# 解析 SQL 获取血缘
parser = SqlLineageParser(sql, platform="snowflake")
lineage_info = parser.get_lineage()

# 生成 upstreamLineage
upstream_lineage = UpstreamLineageClass(
    upstreams=[
        UpstreamClass(
            dataset=make_dataset_urn(platform="snowflake", name=table),
            type=DatasetLineageTypeClass.TRANSFORMED,
            query=sql
        )
        for table in lineage_info.source_tables
    ]
)
```

### 场景 3：dbt 自动血缘

dbt 摄取器自动生成血缘：

```yaml
# dbt_recipe.yml
source:
  type: dbt
  config:
    manifest_path: "./target/manifest.json"
    catalog_path: "./target/catalog.json"
    target_platform: snowflake
    parse_column_lineage: true  # 启用字段级血缘
```

dbt 会自动解析 ref() 和 source() 生成血缘图。

### 场景 4：查询血缘图

```graphql
query GetLineage {
  dataset(urn: "urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.orders,PROD)") {
    upstream: lineage(input: { direction: UPSTREAM, start: 0, count: 100 }) {
      total
      relationships {
        entity {
          ... on Dataset {
            urn
            name
            platform {
              name
            }
          }
        }
        type
      }
    }
    downstream: lineage(input: { direction: DOWNSTREAM, start: 0, count: 100 }) {
      total
      relationships {
        entity {
          ... on Dataset {
            urn
            name
          }
        }
      }
    }
  }
}
```

## 血缘可视化

DataHub UI 提供多种血缘可视化：

### 1. Lineage 标签页

在实体页面查看直接的上下游关系。

### 2. Impact Analysis（影响分析）

查看变更对下游的影响范围。

### 3. Root Cause Analysis（根因分析）

追溯数据质量问题的来源。

## 高级特性

### 1. 多跳血缘

DataHub 自动计算多跳血缘（传递闭包）：

```
Source Table A
  → Staging Table B
    → Analytics Table C
      → Dashboard D
```

查询 Dashboard D 时可以看到 Source Table A。

### 2. 时间旅行

查询特定时间点的血缘：

```python
client.get_aspect_at_timestamp(
    entity_urn=dataset_urn,
    aspect_type=UpstreamLineageClass,
    timestamp_millis=1640995200000
)
```

### 3. 血缘置信度

使用 `confidenceScore` 表示血缘的可靠性：

- `1.0`: 确定的血缘（自动解析）
- `0.8`: 高置信度（基于启发式规则）
- `0.5`: 中等置信度（需要人工验证）

## 最佳实践

### 1. 捕获 SQL 查询

始终在 `query` 字段中保存生成血缘的 SQL：

```json
{
  "query": "CREATE TABLE analytics.orders AS\nSELECT * FROM source.orders WHERE...",
  "platform": "urn:li:dataPlatform:snowflake"
}
```

### 2. 字段级血缘

对于关键数据转换，提供字段级血缘：

- 便于理解数据来源
- 支持精确的影响分析
- 帮助数据质量追踪

### 3. 及时更新

- 在 ETL/ELT 运行时立即发送血缘
- 使用 DataHub Airflow Plugin 自动捕获
- 监控血缘的完整性

### 4. 血缘类型选择

- **COPY**: 仅用于 1:1 复制（如备份、复制）
- **TRANSFORMED**: 大多数 ETL 场景
- **VIEW**: 仅用于数据库视图

### 5. 避免循环血缘

确保血缘图是有向无环图（DAG），避免循环依赖。

## 性能优化

### 1. 批量摄取血缘

```python
# 批量发送多个血缘关系
for dataset, lineage in lineage_map.items():
    emitter.emit_mcp(
        MetadataChangeProposalWrapper(
            entityUrn=dataset,
            aspect=lineage
        )
    )
emitter.flush()  # 一次性提交
```

### 2. 增量更新

只更新变化的血缘关系，而不是每次全量更新。

## 相关文档

- [Dataset Entity](../entities/dataset.md)
- [DataJob Entity](../entities/data-jobs.md)
- [Schema Metadata](schema-metadata.md)

## 外部资源

- [DataHub Lineage 官方文档](https://datahubproject.io/docs/lineage/lineage-feature-guide/)
- [SQL Lineage Parser](https://datahubproject.io/docs/api/graphql/queries/#lineage)
