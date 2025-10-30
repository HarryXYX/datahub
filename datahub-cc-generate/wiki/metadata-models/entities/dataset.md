# Dataset Entity 文档

## 概述

**Dataset** 是 DataHub 中最核心的实体之一，代表逻辑或物理的数据资产。它可以表示：

- **关系型数据库表**（MySQL、PostgreSQL、Oracle）
- **数据仓库表**（Snowflake、BigQuery、Redshift）
- **视图**（View）
- **流数据主题**（Kafka Topic、Kinesis Stream）
- **对象存储文件集**（S3 Bucket、HDFS Directory）
- **NoSQL 集合**（MongoDB Collection、Cassandra Table）

## Entity Registry 配置

```yaml
- name: dataset
  doc: |
    Datasets represent logical or physical data assets stored
    or represented in various data platforms. Tables, Views,
    Streams are all instances of datasets.
  category: core
  keyAspect: datasetKey
  searchGroup: primary
  aspects:
    - viewProperties
    - subTypes
    - datasetProfile
    - datasetUsageStatistics
    - operation
    - domains
    - applications
    - schemaMetadata
    - status
    - container
    - deprecation
    - testResults
    - siblings
    - embed
    - incidentsSummary
    - datasetProperties
    - editableDatasetProperties
    - datasetDeprecation
    - datasetUpstreamLineage
    - upstreamLineage
    - institutionalMemory
    - ownership
    - editableSchemaMetadata
    - globalTags
    - glossaryTerms
    - browsePaths
    - dataPlatformInstance
    - browsePathsV2
    - access
    - structuredProperties
    - forms
    - partitionsSummary
    - versionProperties
    - icebergCatalogInfo
    - logicalParent
```

## URN 格式

Dataset 使用三元组作为唯一标识：

```
urn:li:dataset:(<platform_urn>,<dataset_name>,<fabric_type>)
```

### 参数说明

- **platform_urn**：数据平台 URN（如 `urn:li:dataPlatform:mysql`）
- **dataset_name**：数据集名称，通常是完全限定名（如 `my_database.users_table`）
- **fabric_type**：环境类型（`PROD`、`DEV`、`TEST`、`STAGING`）

### URN 示例

```
# MySQL 生产表
urn:li:dataset:(urn:li:dataPlatform:mysql,ecommerce_db.orders,PROD)

# BigQuery 表
urn:li:dataset:(urn:li:dataPlatform:bigquery,project.dataset.table,PROD)

# Kafka Topic
urn:li:dataset:(urn:li:dataPlatform:kafka,user-events,PROD)

# S3 Bucket
urn:li:dataset:(urn:li:dataPlatform:s3,s3://my-bucket/path/to/data,PROD)

# Snowflake 表
urn:li:dataset:(urn:li:dataPlatform:snowflake,DATABASE.SCHEMA.TABLE,PROD)
```

## Key Aspect: DatasetKey

定义文件：`com/linkedin/metadata/key/DatasetKey.pdl`

```pdl
@Aspect = {
  "name": "datasetKey"
}
record DatasetKey {
  /**
   * Data platform urn associated with the dataset
   */
  @Searchable = {
    "fieldType": "URN",
    "enableAutocomplete": true
  }
  platform: Urn

  /**
   * Unique guid for dataset
   */
  @Searchable = {
    "fieldName": "id"
    "fieldType": "WORD_GRAM",
    "enableAutocomplete": true,
    "boostScore": 10.0
  }
  name: string

  /**
   * Fabric type where dataset belongs to or where it was generated.
   */
  @Searchable = {
    "fieldType": "TEXT_PARTIAL",
    "addToFilters": true,
    "filterNameOverride": "Environment",
    "queryByDefault": false,
    "searchLabel": "origin"
  }
  origin: FabricType
}
```

### FabricType 枚举

```pdl
enum FabricType {
  PROD    // 生产环境
  DEV     // 开发环境
  TEST    // 测试环境
  QA      // 质量保证环境
  STAGING // 预发布环境
  CORP    // 企业环境
}
```

## 核心 Aspects

### 1. datasetProperties（必需）

**定义文件**：`com/linkedin/dataset/DatasetProperties.pdl`

Dataset 的基本属性信息。

#### 字段说明

```pdl
record DatasetProperties {
  /**
   * Display name of the Dataset
   */
  name: optional string

  /**
   * Fully-qualified name of the Dataset
   */
  qualifiedName: optional string

  /**
   * Documentation of the dataset
   */
  description: optional string

  /**
   * A timestamp documenting when the asset was created
   */
  created: optional TimeStamp

  /**
   * A timestamp documenting when the asset was last modified
   */
  lastModified: optional TimeStamp

  /**
   * Custom properties (key-value pairs)
   */
  customProperties: map[string, string] = {}

  /**
   * External URL
   */
  externalUrl: optional Url
}
```

#### 使用示例

```json
{
  "name": "User Orders Table",
  "qualifiedName": "ecommerce_db.orders",
  "description": "Contains all customer orders with payment and shipping information",
  "created": {
    "time": 1609459200000,
    "actor": "urn:li:corpuser:datahub"
  },
  "lastModified": {
    "time": 1640995200000,
    "actor": "urn:li:corpuser:etl_user"
  },
  "customProperties": {
    "data_retention_days": "365",
    "pii_level": "high",
    "business_owner": "sales-team@company.com"
  },
  "externalUrl": "https://console.aws.amazon.com/..."
}
```

### 2. schemaMetadata（核心）

**定义文件**：`com/linkedin/schema/SchemaMetadata.pdl`

描述 Dataset 的 Schema 结构。

#### 字段说明

```pdl
record SchemaMetadata {
  /**
   * SHA1 hash of the schema content
   */
  hash: string

  /**
   * Native schema in the dataset's platform
   */
  platformSchema: union[
    EspressoSchema,
    OracleDDL,
    MySqlDDL,
    PrestoDDL,
    KafkaSchema,
    OrcSchema,
    Schemaless,
    OtherSchema
  ]

  /**
   * List of fields from document schema
   */
  fields: array[SchemaField]

  /**
   * Primary keys
   */
  primaryKeys: optional array[string]

  /**
   * Foreign key constraints
   */
  foreignKeys: optional array[ForeignKeyConstraint]
}
```

#### SchemaField 结构

```pdl
record SchemaField {
  /**
   * Field path (e.g., "user.address.city")
   */
  fieldPath: string

  /**
   * Native data type
   */
  nativeDataType: string

  /**
   * Type from DataHub's type system
   */
  type: SchemaFieldDataType

  /**
   * Description
   */
  description: optional string

  /**
   * Nullable flag
   */
  nullable: boolean = true

  /**
   * Is recursive reference
   */
  isPartOfKey: boolean = false

  /**
   * Global tags on this field
   */
  globalTags: optional GlobalTags

  /**
   * Glossary terms on this field
   */
  glossaryTerms: optional GlossaryTerms
}
```

#### 使用示例

```json
{
  "hash": "abc123def456",
  "platformSchema": {
    "com.linkedin.schema.MySqlDDL": {
      "tableSchema": "CREATE TABLE orders (order_id INT PRIMARY KEY, user_id INT, ...);"
    }
  },
  "fields": [
    {
      "fieldPath": "order_id",
      "nativeDataType": "INT",
      "type": {
        "type": {
          "com.linkedin.schema.NumberType": {}
        }
      },
      "description": "Unique order identifier",
      "nullable": false,
      "isPartOfKey": true
    },
    {
      "fieldPath": "user_id",
      "nativeDataType": "INT",
      "type": {
        "type": {
          "com.linkedin.schema.NumberType": {}
        }
      },
      "description": "Reference to user table",
      "nullable": false,
      "globalTags": {
        "tags": [
          {
            "tag": "urn:li:tag:pii"
          }
        ]
      }
    },
    {
      "fieldPath": "order_date",
      "nativeDataType": "TIMESTAMP",
      "type": {
        "type": {
          "com.linkedin.schema.TimeType": {}
        }
      },
      "description": "Order creation timestamp",
      "nullable": false
    }
  ],
  "primaryKeys": ["order_id"]
}
```

### 3. upstreamLineage（血缘）

**定义文件**：`com/linkedin/common/UpstreamLineage.pdl`

定义 Dataset 的上游依赖关系。

#### 字段说明

```pdl
record UpstreamLineage {
  /**
   * List of upstream datasets
   */
  upstreams: array[Upstream]
}

record Upstream {
  /**
   * Dataset URN
   */
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
}
```

#### DatasetLineageType 枚举

```pdl
enum DatasetLineageType {
  COPY         // 直接复制
  TRANSFORMED  // 经过转换
  VIEW         // 视图
}
```

#### 使用示例

```json
{
  "upstreams": [
    {
      "dataset": "urn:li:dataset:(urn:li:dataPlatform:mysql,ecommerce_db.users,PROD)",
      "type": "TRANSFORMED",
      "auditStamp": {
        "time": 1640995200000,
        "actor": "urn:li:corpuser:etl_pipeline"
      },
      "query": "SELECT user_id, order_count FROM users JOIN orders USING(user_id)"
    },
    {
      "dataset": "urn:li:dataset:(urn:li:dataPlatform:mysql,ecommerce_db.raw_orders,PROD)",
      "type": "COPY",
      "auditStamp": {
        "time": 1640995200000,
        "actor": "urn:li:corpuser:etl_pipeline"
      }
    }
  ]
}
```

### 4. ownership（所有权）

**定义文件**：`com/linkedin/common/Ownership.pdl`

定义 Dataset 的所有者。

#### 使用示例

```json
{
  "owners": [
    {
      "owner": "urn:li:corpuser:john.doe",
      "type": "DATAOWNER",
      "source": {
        "type": "MANUAL"
      }
    },
    {
      "owner": "urn:li:corpGroup:data-engineering",
      "type": "TECHNICAL_OWNER",
      "source": {
        "type": "SERVICE"
      }
    }
  ],
  "lastModified": {
    "time": 1640995200000,
    "actor": "urn:li:corpuser:admin"
  }
}
```

### 5. globalTags（标签）

**定义文件**：`com/linkedin/common/GlobalTags.pdl`

为 Dataset 添加标签。

#### 使用示例

```json
{
  "tags": [
    {
      "tag": "urn:li:tag:pii",
      "context": "Dataset contains personally identifiable information"
    },
    {
      "tag": "urn:li:tag:gdpr-compliant"
    },
    {
      "tag": "urn:li:tag:high-priority"
    }
  ]
}
```

### 6. glossaryTerms（术语）

**定义文件**：`com/linkedin/common/GlossaryTerms.pdl`

关联业务术语。

#### 使用示例

```json
{
  "terms": [
    {
      "urn": "urn:li:glossaryTerm:OrderManagement.OrderStatus"
    },
    {
      "urn": "urn:li:glossaryTerm:SalesMetrics.Revenue"
    }
  ],
  "auditStamp": {
    "time": 1640995200000,
    "actor": "urn:li:corpuser:data_steward"
  }
}
```

### 7. datasetProfile（数据剖析）

**定义文件**：`com/linkedin/dataset/DatasetProfile.pdl`

数据质量和统计信息。

#### 字段说明

```pdl
record DatasetProfile {
  /**
   * The timestamp when the profile was computed
   */
  timestampMillis: long

  /**
   * Total row count
   */
  rowCount: optional long

  /**
   * Total column count
   */
  columnCount: optional long

  /**
   * Per-field statistics
   */
  fieldProfiles: optional array[DatasetFieldProfile]
}
```

#### 使用示例

```json
{
  "timestampMillis": 1640995200000,
  "rowCount": 1500000,
  "columnCount": 15,
  "fieldProfiles": [
    {
      "fieldPath": "user_id",
      "uniqueCount": 50000,
      "uniqueProportion": 0.033,
      "nullCount": 0,
      "nullProportion": 0.0,
      "min": "1",
      "max": "50000"
    },
    {
      "fieldPath": "email",
      "uniqueCount": 50000,
      "uniqueProportion": 0.033,
      "nullCount": 100,
      "nullProportion": 0.000067
    }
  ]
}
```

### 8. datasetUsageStatistics（使用统计）

**定义文件**：`com/linkedin/dataset/DatasetUsageStatistics.pdl`

Dataset 使用情况统计。

#### 使用示例

```json
{
  "timestampMillis": 1640995200000,
  "eventGranularity": {
    "unit": "DAY",
    "multiple": 1
  },
  "uniqueUserCount": 50,
  "totalSqlQueries": 1500,
  "topSqlQueries": [
    "SELECT * FROM orders WHERE order_date > '2023-01-01'"
  ],
  "userCounts": [
    {
      "user": "urn:li:corpuser:analyst1",
      "count": 300
    },
    {
      "user": "urn:li:corpuser:data_scientist",
      "count": 200
    }
  ],
  "fieldCounts": [
    {
      "fieldPath": "order_id",
      "count": 1500
    },
    {
      "fieldPath": "user_id",
      "count": 1200
    }
  ]
}
```

## 实际使用场景

### 场景 1：摄取 MySQL 表元数据

使用 DataHub Python CLI 摄取：

```yaml
# mysql_recipe.yml
source:
  type: mysql
  config:
    host_port: mysql.company.com:3306
    database: ecommerce_db
    username: datahub_user
    password: ${MYSQL_PASSWORD}
    include_tables: true
    include_views: true
    profiling:
      enabled: true

sink:
  type: datahub-rest
  config:
    server: http://localhost:8080
```

运行摄取：

```bash
datahub ingest -c mysql_recipe.yml
```

### 场景 2：通过 GraphQL 查询 Dataset

```graphql
query GetDataset {
  dataset(urn: "urn:li:dataset:(urn:li:dataPlatform:mysql,ecommerce_db.orders,PROD)") {
    urn
    name
    description
    platform {
      name
    }
    schemaMetadata {
      fields {
        fieldPath
        nativeDataType
        description
        nullable
        globalTags {
          tags {
            tag {
              name
            }
          }
        }
      }
    }
    ownership {
      owners {
        owner {
          ... on CorpUser {
            username
            info {
              displayName
            }
          }
        }
        type
      }
    }
    upstreamLineage {
      upstreams {
        dataset {
          name
        }
        type
      }
    }
  }
}
```

### 场景 3：通过 Python SDK 创建 Dataset

```python
from datahub.emitter.mce_builder import make_dataset_urn
from datahub.emitter.mcp import MetadataChangeProposalWrapper
from datahub.emitter.rest_emitter import DatahubRestEmitter
from datahub.metadata.schema_classes import (
    DatasetPropertiesClass,
    SchemaMetadataClass,
    SchemaFieldClass,
    SchemaFieldDataTypeClass,
    NumberTypeClass
)

# 创建 Dataset URN
dataset_urn = make_dataset_urn(
    platform="mysql",
    name="ecommerce_db.orders",
    env="PROD"
)

# 创建 Dataset Properties
dataset_properties = DatasetPropertiesClass(
    name="User Orders Table",
    description="Contains all customer orders",
    customProperties={
        "retention_days": "365",
        "data_classification": "confidential"
    }
)

# 创建 Schema Metadata
schema_metadata = SchemaMetadataClass(
    schemaName="orders",
    platform="urn:li:dataPlatform:mysql",
    version=0,
    hash="",
    platformSchema=MySqlDDL(tableSchema="CREATE TABLE ..."),
    fields=[
        SchemaFieldClass(
            fieldPath="order_id",
            nativeDataType="INT",
            type=SchemaFieldDataTypeClass(type=NumberTypeClass()),
            description="Order ID",
            nullable=False,
            isPartOfKey=True
        ),
        SchemaFieldClass(
            fieldPath="user_id",
            nativeDataType="INT",
            type=SchemaFieldDataTypeClass(type=NumberTypeClass()),
            description="User ID",
            nullable=False
        )
    ]
)

# 发送到 DataHub
emitter = DatahubRestEmitter("http://localhost:8080")

# 发送 Dataset Properties
emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn=dataset_urn,
        aspect=dataset_properties
    )
)

# 发送 Schema Metadata
emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn=dataset_urn,
        aspect=schema_metadata
    )
)
```

## 子类型（SubTypes）

Dataset 可以通过 `subTypes` Aspect 标记特定类型：

- **Table**：普通表
- **View**：视图
- **Materialized View**：物化视图
- **Topic**：Kafka/Kinesis 主题
- **Stream**：流式数据集
- **File**：文件数据集

示例：

```json
{
  "typeNames": ["Table", "Partitioned"]
}
```

## 容器层次结构

Dataset 通过 `container` Aspect 关联到容器：

```
Platform Instance (Snowflake Prod)
  └── Container (Database: SALES_DB)
        └── Container (Schema: PUBLIC)
              └── Dataset (Table: ORDERS)
```

示例：

```json
{
  "container": "urn:li:container:sales_db.public"
}
```

## 最佳实践

### 1. Dataset 命名规范

- 使用完全限定名：`database.schema.table`
- 对于 S3/HDFS：使用完整路径
- 保持一致的大小写策略

### 2. Schema 元数据

- 始终提供字段描述
- 标记 PII 字段
- 维护准确的类型信息

### 3. 血缘关系

- 摄取时自动捕获血缘
- 手动验证复杂转换的血缘
- 记录 SQL 查询以便追溯

### 4. 数据剖析

- 定期运行剖析（每日/每周）
- 监控行数变化以检测异常
- 跟踪 NULL 值比例

## 相关文档

- [Entity Registry](../entity-registry.md)
- [Schema Metadata Aspect](../aspects/schema-metadata.md)
- [Lineage Aspect](../aspects/lineage.md)
- [Ownership Aspect](../aspects/ownership.md)

## 外部资源

- [DataHub Dataset 官方文档](https://datahubproject.io/docs/generated/metamodel/entities/dataset/)
- [Dataset Ingestion Sources](https://datahubproject.io/docs/metadata-ingestion/)
