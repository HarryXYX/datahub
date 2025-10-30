# DataHub 数据模型详解

## 元数据模型概述

DataHub 使用 **Aspect-Oriented** 架构来组织元数据，这是一种灵活且可扩展的设计模式。

### 核心概念

```
实体 (Entity) = URN + Aspects 集合
```

- **实体 (Entity)**：数据目录中的核心对象
- **URN (Uniform Resource Name)**：实体的全局唯一标识符
- **Aspect**：实体的元数据片段，是原子写入单元
- **关系 (Relationship)**：实体间的关联，通过 Aspect 中的外键定义

---

## URN 设计

### URN 格式

```
urn:li:<entity_type>:(<key_field_1>,<key_field_2>,...)
```

### 示例

#### Dataset URN
```
urn:li:dataset:(urn:li:dataPlatform:mysql,analytics.users,PROD)
```
- **entity_type**: `dataset`
- **platform**: `urn:li:dataPlatform:mysql`
- **name**: `analytics.users`
- **origin**: `PROD`

#### Dashboard URN
```
urn:li:dashboard:(looker,dashboard_123)
```
- **entity_type**: `dashboard`
- **platform**: `looker`
- **id**: `dashboard_123`

#### User URN
```
urn:li:corpUser:john.doe
```
- **entity_type**: `corpUser`
- **username**: `john.doe`

### URN 设计原则

1. **全局唯一性**：URN 在整个 DataHub 实例中唯一
2. **可读性**：URN 应该便于人类理解
3. **稳定性**：URN 不应随元数据更新而变化
4. **层次性**：支持嵌套 URN（如 dataPlatform）

---

## 核心实体类型

### 1. Dataset（数据集）

**定义**：表、视图、流、文件等数据容器

**Key 字段**：
- `platform`: 数据平台 URN
- `name`: 数据集名称
- `origin`: 环境（PROD/DEV/QA）

**常用 Aspects**：

| Aspect 名称 | 用途 | 示例 |
|------------|------|------|
| `datasetProperties` | 基础属性（名称、描述） | 表描述、自定义属性 |
| `schemaMetadata` | Schema 定义 | 列名、数据类型、注释 |
| `ownership` | 所有者信息 | 技术负责人、业务负责人 |
| `globalTags` | 标签 | PII, Sensitive, Deprecated |
| `glossaryTerms` | 术语关联 | Customer, Revenue |
| `upstreamLineage` | 上游血缘 | 依赖的表和转换逻辑 |
| `datasetUsageStatistics` | 使用统计 | 查询次数、用户数 |
| `datasetProfile` | 数据剖析 | 行数、空值率、唯一值 |
| `domains` | 领域归属 | Finance, Marketing |

**PDL Schema 示例**（简化版）：

```pdl
record DatasetProperties {
  name: optional string
  description: optional string
  customProperties: map[string, string]
  externalUrl: optional Url
  created: optional Time
  lastModified: optional Time
}

record SchemaMetadata {
  schemaName: string
  platform: Urn
  version: long
  hash: string
  platformSchema: union[
    MySQLDDL: record { tableSchema: string }
    PrestoSchema: record { rawSchema: string }
  ]
  fields: array[SchemaField]
}

record SchemaField {
  fieldPath: string
  nativeDataType: string
  type: SchemaFieldDataType
  description: optional string
  nullable: boolean = true
  isPartOfKey: boolean = false
  globalTags: optional GlobalTags
  glossaryTerms: optional GlossaryTerms
}
```

---

### 2. Dashboard（仪表板）

**定义**：BI 工具中的仪表板

**Key 字段**：
- `platform`: BI 平台（looker, tableau, etc）
- `dashboardId`: 仪表板 ID

**常用 Aspects**：

| Aspect 名称 | 用途 |
|------------|------|
| `dashboardInfo` | 标题、描述、URL |
| `ownership` | 所有者 |
| `dashboardUsageStatistics` | 查看次数、用户数 |
| `globalTags` | 标签 |
| `inputFields` | 使用的字段（跨 Dataset） |

**关系**：
- `Contains` → Chart（包含的图表）
- `Consumes` → Dataset（消费的数据集）

---

### 3. Chart（图表）

**定义**：Dashboard 中的单个图表

**Key 字段**：
- `platform`: BI 平台
- `chartId`: 图表 ID

**常用 Aspects**：
- `chartInfo`: 图表类型、配置
- `inputFields`: 使用的字段
- `ownership`: 所有者

---

### 4. DataJob（数据作业）

**定义**：ETL 任务、Airflow Task、dbt Model 等

**Key 字段**：
- `flow`: 所属 DataFlow URN
- `jobId`: 作业 ID

**常用 Aspects**：

| Aspect 名称 | 用途 |
|------------|------|
| `dataJobInfo` | 作业类型、描述 |
| `dataJobInputOutput` | 输入输出 Dataset |
| `ownership` | 所有者 |
| `dataProcessInstanceProperties` | 执行实例信息 |

**关系**：
- `Consumes` → Dataset（读取的数据）
- `Produces` → Dataset（生成的数据）
- `MemberOf` → DataFlow（所属管道）

---

### 5. DataFlow（数据流）

**定义**：DAG、Pipeline、Workflow

**Key 字段**：
- `orchestrator`: 编排工具（airflow, dagster）
- `flowId`: 流程 ID
- `cluster`: 集群名

**常用 Aspects**：
- `dataFlowInfo`: 描述、调度信息
- `ownership`: 所有者
- `globalTags`: 标签

**关系**：
- `Contains` → DataJob（包含的任务）

---

### 6. CorpUser（企业用户）

**定义**：数据平台的用户

**Key 字段**：
- `username`: 用户名

**常用 Aspects**：

| Aspect 名称 | 用途 |
|------------|------|
| `corpUserInfo` | 姓名、邮箱、部门 |
| `corpUserEditableInfo` | 可编辑信息 |
| `groupMembership` | 所属用户组 |
| `corpUserStatus` | 账号状态 |

---

### 7. CorpGroup（企业用户组）

**定义**：组织架构中的团队或部门

**Key 字段**：
- `groupName`: 组名

**常用 Aspects**：
- `corpGroupInfo`: 组描述、邮箱
- `ownership`: 组负责人

---

### 8. GlossaryTerm（术语表术语）

**定义**：业务术语定义

**Key 字段**：
- `termId`: 术语 ID

**常用 Aspects**：

| Aspect 名称 | 用途 |
|------------|------|
| `glossaryTermInfo` | 术语定义、业务规则 |
| `institutionalMemory` | 相关文档链接 |
| `glossaryRelatedTerms` | 相关术语（同义词、反义词） |
| `ownership` | 术语负责人 |

**关系**：
- `IsA` → GlossaryTerm（父子关系）
- `RelatedTo` → GlossaryTerm（相关术语）

---

### 9. Tag（标签）

**定义**：分类标签

**Key 字段**：
- `tagName`: 标签名

**常用 Aspects**：
- `tagProperties`: 描述、颜色

**示例标签**：
- `PII` - 个人身份信息
- `Sensitive` - 敏感数据
- `Deprecated` - 已废弃
- `HighQuality` - 高质量数据

---

### 10. Domain（领域）

**定义**：数据领域，用于组织数据资产

**Key 字段**：
- `domainId`: 领域 ID

**常用 Aspects**：
- `domainProperties`: 名称、描述
- `institutionalMemory`: 领域文档

**示例领域**：
- `Finance` - 财务数据
- `Marketing` - 营销数据
- `Sales` - 销售数据

---

## Aspect 详解

### Aspect 设计原则

1. **原子性**：每个 Aspect 应该是最小的可独立更新单元
2. **版本化**：Aspect 支持版本控制，保留历史
3. **可选性**：实体可以不包含某些 Aspect
4. **扩展性**：支持自定义 Aspect

### Aspect 存储

**MySQL 存储结构**：

```sql
CREATE TABLE metadata_aspect_v2 (
  urn VARCHAR(500) NOT NULL,
  aspect VARCHAR(200) NOT NULL,
  version BIGINT NOT NULL,
  metadata TEXT NOT NULL,  -- JSON 格式
  createdon TIMESTAMP NOT NULL,
  createdby VARCHAR(255) NOT NULL,
  PRIMARY KEY (urn, aspect, version),
  INDEX idx_urn (urn),
  INDEX idx_aspect (aspect)
);
```

**示例数据**：

```json
{
  "urn": "urn:li:dataset:(urn:li:dataPlatform:mysql,analytics.users,PROD)",
  "aspect": "schemaMetadata",
  "version": 0,
  "metadata": {
    "schemaName": "users",
    "platform": "urn:li:dataPlatform:mysql",
    "version": 0,
    "hash": "abc123",
    "fields": [
      {
        "fieldPath": "id",
        "nativeDataType": "int(11)",
        "type": { "type": { "com.linkedin.schema.NumberType": {} } },
        "nullable": false,
        "isPartOfKey": true
      },
      {
        "fieldPath": "email",
        "nativeDataType": "varchar(255)",
        "type": { "type": { "com.linkedin.schema.StringType": {} } },
        "nullable": false,
        "globalTags": {
          "tags": [
            { "tag": "urn:li:tag:PII" }
          ]
        }
      }
    ]
  },
  "createdon": "2025-10-30T10:00:00Z",
  "createdby": "urn:li:corpUser:datahub"
}
```

---

## 关系 (Relationship)

### 关系定义方式

关系通过 Aspect 中的 `@Relationship` 注解定义：

```pdl
record Ownership {
  owners: array[Owner]
}

record Owner {
  @Relationship = {
    "name": "OwnedBy",
    "entityTypes": ["corpUser", "corpGroup"]
  }
  owner: Urn
  type: OwnershipType
}
```

### 常见关系类型

| 关系名称 | 源实体 | 目标实体 | 说明 |
|---------|-------|---------|------|
| `OwnedBy` | Dataset | CorpUser/CorpGroup | 所有权 |
| `DownstreamOf` | Dataset | Dataset | 数据血缘（下游） |
| `Consumes` | DataJob | Dataset | 任务读取数据 |
| `Produces` | DataJob | Dataset | 任务生成数据 |
| `Contains` | Dashboard | Chart | Dashboard 包含 Chart |
| `MemberOf` | CorpUser | CorpGroup | 用户归属 |
| `IsPartOf` | GlossaryTerm | GlossaryNode | 术语层次 |

### 血缘关系详解

**UpstreamLineage Aspect**：

```pdl
record UpstreamLineage {
  upstreams: array[Upstream]
}

record Upstream {
  @Relationship = {
    "name": "DownstreamOf",
    "entityTypes": ["dataset"]
  }
  dataset: DatasetUrn
  type: DatasetLineageType  // TRANSFORMED, COPIED, VIEW
  auditStamp: AuditStamp
}
```

**血缘类型**：

- `TRANSFORMED`: 通过 ETL 转换生成
- `COPIED`: 直接复制
- `VIEW`: 数据库视图
- `NONE`: 未知

**示例**：

```json
{
  "upstreams": [
    {
      "dataset": "urn:li:dataset:(urn:li:dataPlatform:snowflake,raw.events,PROD)",
      "type": "TRANSFORMED",
      "auditStamp": {
        "time": 1730275200000,
        "actor": "urn:li:corpUser:airflow"
      }
    }
  ]
}
```

---

## Entity Registry（实体注册表）

**位置**：`metadata-models/src/main/resources/entity-registry.yml`

**作用**：定义所有实体类型及其支持的 Aspects

**示例配置**：

```yaml
entities:
  - name: dataset
    keyAspect: datasetKey
    aspects:
      - datasetProperties
      - schemaMetadata
      - ownership
      - globalTags
      - glossaryTerms
      - upstreamLineage
      - institutionalMemory
      - datasetUsageStatistics
      - datasetProfile
      - domains
      - status
      - container
      - deprecation
      - testResults
      - operation
      - datasetDeprecation
      - viewProperties
      - subTypes

  - name: dashboard
    keyAspect: dashboardKey
    aspects:
      - dashboardInfo
      - ownership
      - globalTags
      - glossaryTerms
      - institutionalMemory
      - domains
      - status
      - dashboardUsageStatistics
      - inputFields
```

---

## 元数据变更提案 (MCP)

### MCP 结构

```pdl
record MetadataChangeProposal {
  entityType: string
  entityUrn: optional Urn
  entityKeyAspect: optional GenericAspect
  changeType: ChangeType  // UPSERT, CREATE, DELETE, PATCH
  aspectName: string
  aspect: GenericAspect
  systemMetadata: optional SystemMetadata
}
```

### MCP 示例：添加标签

```json
{
  "entityType": "dataset",
  "entityUrn": "urn:li:dataset:(urn:li:dataPlatform:mysql,analytics.users,PROD)",
  "changeType": "UPSERT",
  "aspectName": "globalTags",
  "aspect": {
    "value": "{\"tags\":[{\"tag\":\"urn:li:tag:PII\"}]}",
    "contentType": "application/json"
  }
}
```

### MCP 示例：更新 Ownership

```json
{
  "entityType": "dataset",
  "entityUrn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.customers,PROD)",
  "changeType": "UPSERT",
  "aspectName": "ownership",
  "aspect": {
    "value": "{\"owners\":[{\"owner\":\"urn:li:corpUser:john.doe\",\"type\":\"TECHNICAL_OWNER\"}],\"lastModified\":{\"time\":1730275200000,\"actor\":\"urn:li:corpUser:admin\"}}",
    "contentType": "application/json"
  }
}
```

---

## 数据模型扩展

### 添加自定义 Aspect

**步骤 1**：定义 PDL Schema

```pdl
// metadata-models/src/main/pegasus/com/yourcompany/dataset/CustomMetrics.pdl
namespace com.yourcompany.dataset

record CustomMetrics {
  @Searchable = {}
  qualityScore: double

  completenessRate: double

  freshnessHours: long

  usageCount: long
}
```

**步骤 2**：注册到 Entity Registry

```yaml
entities:
  - name: dataset
    aspects:
      - com.yourcompany.dataset.CustomMetrics  # 添加自定义 Aspect
```

**步骤 3**：重新构建

```bash
./gradlew :metadata-models:build
```

### 添加自定义实体

**步骤 1**：定义 Key Aspect

```pdl
namespace com.yourcompany.ml

record MLModelKey {
  @Searchable = {
    "fieldType": "TEXT_PARTIAL"
  }
  modelName: string

  platform: string
}
```

**步骤 2**：定义 Info Aspect

```pdl
record MLModelInfo {
  name: string
  description: optional string
  modelType: string  // "classification", "regression", etc
  framework: string  // "tensorflow", "pytorch", etc
  version: string
}
```

**步骤 3**：注册新实体

```yaml
entities:
  - name: mlModel
    keyAspect: mlModelKey
    aspects:
      - mlModelInfo
      - ownership
      - globalTags
```

---

## 最佳实践

### 1. URN 设计

✅ **推荐**：
```
urn:li:dataset:(urn:li:dataPlatform:snowflake,ANALYTICS.CUSTOMERS,PROD)
```

❌ **不推荐**：
```
urn:li:dataset:snowflake_analytics_customers  # 难以解析
```

### 2. Aspect 设计

✅ **推荐**：小而聚焦的 Aspect
```pdl
record DatasetProperties {
  name: string
  description: optional string
}

record DatasetStatistics {
  rowCount: long
  sizeInBytes: long
}
```

❌ **不推荐**：大而全的 Aspect
```pdl
record DatasetEverything {
  name: string
  description: string
  rowCount: long
  sizeInBytes: long
  schema: array[Field]
  owners: array[Owner]
  // ... 100+ 字段
}
```

### 3. 关系定义

✅ **推荐**：使用 `@Relationship` 注解
```pdl
record Owner {
  @Relationship = {
    "name": "OwnedBy",
    "entityTypes": ["corpUser"]
  }
  owner: Urn
}
```

### 4. 搜索优化

✅ **推荐**：为常用查询字段添加 `@Searchable`
```pdl
record DatasetProperties {
  @Searchable = {
    "fieldType": "TEXT_PARTIAL",
    "enableAutocomplete": true
  }
  name: string
}
```

---

## 相关文档

- [PDL Schema 语法](https://linkedin.github.io/rest.li/pdl_schema)
- [Entity Registry 配置](https://datahubproject.io/docs/metadata-modeling/metadata-model/)
- [自定义实体开发指南](./wiki/metadata-models/custom-entities.md)

---

## 数据模型变更检查清单

在修改数据模型时，请确保：

- [ ] PDL schema 语法正确
- [ ] 字段有合适的文档注释
- [ ] 添加 `@Searchable` 注解到需要搜索的字段
- [ ] 添加 `@Relationship` 注解到外键字段
- [ ] 更新 Entity Registry 配置
- [ ] 运行 `./gradlew :metadata-models:build` 验证
- [ ] 更新 GraphQL schema（如果需要）
- [ ] 编写单元测试
- [ ] 更新文档

