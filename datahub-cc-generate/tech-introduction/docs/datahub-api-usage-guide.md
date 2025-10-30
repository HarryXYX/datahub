# DataHub API 完整使用指南

本文档提供 DataHub 所有 API 的详细使用指南,包括 GraphQL、OpenAPI、Rest.li 和 Kafka API。

## 目录

- [1. API 概述](#1-api-概述)
- [2. 认证和授权](#2-认证和授权)
- [3. GraphQL API](#3-graphql-api)
- [4. OpenAPI REST API](#4-openapi-rest-api)
- [5. Rest.li API](#5-restli-api)
- [6. Kafka API](#6-kafka-api)
- [7. 错误处理](#7-错误处理)
- [8. 最佳实践](#8-最佳实践)

---

## 1. API 概述

DataHub 提供多种 API 接口,适用于不同的使用场景:

| API | 适用场景 | 优势 | 劣势 |
|-----|---------|------|------|
| **GraphQL API** | UI 操作、快速查询 | 直观易用、镜像 UI 功能 | 灵活性较低、需要了解 GraphQL 语法 |
| **OpenAPI REST API** | 高级用户、复杂操作 | 最强大灵活 | 学习曲线较陡、无对应 SDK |
| **Rest.li API** | 传统集成 | 完整的 Rest.li 支持 | 正在被 OpenAPI 取代 |
| **Kafka API** | 异步批量摄取 | 高吞吐量、解耦 | 需要 Kafka 基础设施 |
| **Python/Java SDK** | 编程集成 | 类型安全、功能完整 | 需要学习 SDK |

### API 端点

- **GraphQL API**: `http://<datahub-host>:<port>/api/graphql`
- **GraphQL 探索界面 (GraphiQL)**: `http://<datahub-host>:<port>/api/graphiql`
- **OpenAPI Swagger UI**: `http://<datahub-host>:<port>/openapi/swagger-ui/index.html`
- **OpenAPI 规范文档**:
  - JSON: `http://<datahub-host>:<port>/openapi/v3/api-docs`
  - YAML: `http://<datahub-host>:<port>/openapi/v3/api-docs.yaml`
- **Rest.li API**: `http://<datahub-host>:<port>/entities`
- **Kafka Topics**:
  - MetadataChangeProposal: `MetadataChangeProposal_v1`
  - MetadataChangeLog: `MetadataChangeLog_Versioned_v1`, `MetadataChangeLog_Timeseries_v1`
  - Failed Events: `FailedMetadataChangeProposal_v1`

---

## 2. 认证和授权

### 2.1 Personal Access Token (PAT)

DataHub 使用 Personal Access Token 进行 API 认证。

#### 生成 PAT

1. 登录 DataHub UI
2. 进入 **Settings** > **Access Tokens**
3. 点击 **Generate Personal Access Token**
4. 填写表单并保存 Token

#### 使用 PAT

在 HTTP 请求头中添加 Bearer Token:

```bash
Authorization: Bearer <your-access-token>
```

#### 示例: 使用 curl

```bash
# GraphQL API
curl 'http://localhost:9002/api/graphql' \
  -H 'Authorization: Bearer <access-token>' \
  -H 'Content-Type: application/json' \
  --data-raw '{"query":"{ me { username } }","variables":{}}'

# OpenAPI
curl 'http://localhost:8080/openapi/entities/v1/latest?urns=urn:li:dataset:(urn:li:dataPlatform:hive,SampleDataset,PROD)' \
  -H 'Authorization: Bearer <access-token>' \
  -H 'Accept: application/json'
```

### 2.2 权限控制

API 操作受 DataHub 策略系统控制。常见权限包括:

- **Generate Personal Access Tokens**: 生成个人访问令牌
- **Manage All Access Tokens**: 管理所有访问令牌
- **Edit Entity**: 编辑实体
- **View Entity Page**: 查看实体页面
- **Edit Lineage**: 编辑血缘关系
- **Manage Domains**: 管理域

---

## 3. GraphQL API

GraphQL API 是 DataHub 前端使用的主要 API,提供直观的查询和变更操作。

### 3.1 GraphQL 端点

- **生产环境**: `https://<your-datahub-instance>/api/graphql`
- **本地环境**: `http://localhost:9002/api/graphql`
- **GraphiQL 界面**: `http://localhost:9002/api/graphiql`

### 3.2 常用查询 (Queries)

#### 3.2.1 搜索数据集

```graphql
query searchDatasets {
  search(
    input: {
      type: DATASET
      query: "user"
      start: 0
      count: 10
    }
  ) {
    start
    count
    total
    searchResults {
      entity {
        urn
        type
        ... on Dataset {
          name
          properties {
            name
            description
            qualifiedName
          }
          platform {
            name
          }
        }
      }
    }
  }
}
```

#### 3.2.2 获取实体详情

```graphql
query getDataset {
  entity(urn: "urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)") {
    urn
    type
    ... on Dataset {
      name
      properties {
        name
        description
        customProperties {
          key
          value
        }
      }
      ownership {
        owners {
          owner {
            ... on CorpUser {
              username
              properties {
                displayName
              }
            }
          }
          type
        }
      }
      globalTags {
        tags {
          tag {
            urn
            properties {
              name
            }
          }
        }
      }
      schemaMetadata {
        fields {
          fieldPath
          type
          nativeDataType
          description
        }
      }
    }
  }
}
```

#### 3.2.3 查询血缘关系

```graphql
query getLineage {
  entity(urn: "urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)") {
    ... on EntityWithRelationships {
      upstream: lineage(input: { direction: UPSTREAM, start: 0, count: 100 }) {
        total
        relationships {
          type
          entity {
            urn
            type
            ... on Dataset {
              name
              properties {
                name
              }
            }
          }
        }
      }
      downstream: lineage(input: { direction: DOWNSTREAM, start: 0, count: 100 }) {
        total
        relationships {
          type
          entity {
            urn
            type
            ... on Dataset {
              name
            }
          }
        }
      }
    }
  }
}
```

#### 3.2.4 跨血缘搜索

```graphql
query searchAcrossLineage {
  searchAcrossLineage(
    input: {
      urn: "urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)"
      direction: DOWNSTREAM
      query: "*"
      start: 0
      count: 10
      filters: [{ field: "degree", value: "1", values: ["1"] }]
    }
  ) {
    total
    searchResults {
      entity {
        urn
        type
        ... on Dataset {
          name
        }
      }
      degree
      paths {
        path {
          urn
          type
        }
      }
    }
  }
}
```

#### 3.2.5 自动补全

```graphql
query autoComplete {
  autoComplete(
    input: {
      type: DATASET
      query: "sample"
      limit: 10
    }
  ) {
    query
    suggestions
    entities {
      urn
      type
      ... on Dataset {
        name
        properties {
          name
        }
      }
    }
  }
}
```

### 3.3 常用变更 (Mutations)

#### 3.3.1 添加标签

```graphql
mutation addTag {
  addTag(
    input: {
      tagUrn: "urn:li:tag:PII"
      resourceUrn: "urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)"
    }
  )
}
```

#### 3.3.2 批量添加标签

```graphql
mutation batchAddTags {
  batchAddTags(
    input: {
      tagUrns: ["urn:li:tag:PII", "urn:li:tag:Deprecated"]
      resources: [
        { resourceUrn: "urn:li:dataset:(urn:li:dataPlatform:hive,dataset1,PROD)" }
        { resourceUrn: "urn:li:dataset:(urn:li:dataPlatform:hive,dataset2,PROD)" }
      ]
    }
  )
}
```

#### 3.3.3 添加所有者

```graphql
mutation addOwner {
  addOwner(
    input: {
      ownerUrn: "urn:li:corpuser:john_doe"
      resourceUrn: "urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)"
      ownershipTypeUrn: "urn:li:ownershipType:dataowner"
    }
  )
}
```

#### 3.3.4 批量添加所有者

```graphql
mutation batchAddOwners {
  batchAddOwners(
    input: {
      owners: [
        {
          ownerUrn: "urn:li:corpuser:john_doe"
          ownershipTypeUrn: "urn:li:ownershipType:dataowner"
        }
      ]
      resources: [
        { resourceUrn: "urn:li:dataset:(urn:li:dataPlatform:hive,dataset1,PROD)" }
        { resourceUrn: "urn:li:dataset:(urn:li:dataPlatform:hive,dataset2,PROD)" }
      ]
    }
  )
}
```

#### 3.3.5 更新描述

```graphql
mutation updateDescription {
  updateDescription(
    input: {
      description: "This dataset contains user information"
      resourceUrn: "urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)"
    }
  )
}
```

#### 3.3.6 设置域 (Domain)

```graphql
mutation setDomain {
  setDomain(
    entityUrn: "urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)"
    domainUrn: "urn:li:domain:marketing"
  )
}
```

#### 3.3.7 添加术语表术语

```graphql
mutation addTerms {
  addTerm(
    input: {
      termUrn: "urn:li:glossaryTerm:CustomerData"
      resourceUrn: "urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)"
    }
  )
}
```

#### 3.3.8 更新弃用状态

```graphql
mutation updateDeprecation {
  updateDeprecation(
    input: {
      resourceUrn: "urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)"
      deprecated: true
      note: "This dataset is deprecated. Please use dataset_v2 instead."
      decommissionTime: 1735689600000
    }
  )
}
```

#### 3.3.9 更新血缘关系

```graphql
mutation updateLineage {
  updateLineage(
    input: {
      edgesToAdd: [
        {
          downstreamUrn: "urn:li:dataset:(urn:li:dataPlatform:hive,target_dataset,PROD)"
          upstreamUrn: "urn:li:dataset:(urn:li:dataPlatform:hive,source_dataset,PROD)"
        }
      ]
      edgesToRemove: []
    }
  )
}
```

### 3.4 使用 curl 调用 GraphQL

```bash
# 查询示例
curl --location --request POST 'http://localhost:9002/api/graphql' \
--header 'Authorization: Bearer <access-token>' \
--header 'Content-Type: application/json' \
--data-raw '{
  "query": "query { search(input: { type: DATASET, query: \"*\", start: 0, count: 10 }) { total } }",
  "variables": {}
}'

# 变更示例
curl --location --request POST 'http://localhost:9002/api/graphql' \
--header 'Authorization: Bearer <access-token>' \
--header 'Content-Type: application/json' \
--data-raw '{
  "query": "mutation { addTag(input: { tagUrn: \"urn:li:tag:PII\", resourceUrn: \"urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)\" }) }",
  "variables": {}
}'
```

### 3.5 DataLoader 批量查询优化

GraphQL 使用 DataLoader 模式优化批量查询,自动合并和缓存请求。在查询多个实体时,DataHub 会自动批处理请求。

```graphql
# 这个查询会自动批处理多个实体的获取
query batchGetEntities {
  entity1: entity(urn: "urn:li:dataset:(urn:li:dataPlatform:hive,dataset1,PROD)") {
    urn
    type
  }
  entity2: entity(urn: "urn:li:dataset:(urn:li:dataPlatform:hive,dataset2,PROD)") {
    urn
    type
  }
  entity3: entity(urn: "urn:li:dataset:(urn:li:dataPlatform:hive,dataset3,PROD)") {
    urn
    type
  }
}
```

---

## 4. OpenAPI REST API

OpenAPI REST API 提供最底层、最灵活的访问方式,支持完整的 CRUD 操作。

### 4.1 端点概述

| 端点 | 用途 |
|------|------|
| `/openapi/entities/v1/` | 实体和切面的 CRUD 操作 |
| `/openapi/relationships/v1/` | 查询实体间关系 |
| `/openapi/timeline/v1/` | 查询实体版本历史 |
| `/openapi/platform/v1/` | 底层元数据事件 API |

### 4.2 实体操作 (/entities)

#### 4.2.1 创建/更新实体 (UPSERT)

```bash
curl --location --request POST 'http://localhost:8080/openapi/entities/v1/' \
--header 'Content-Type: application/json' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer <token>' \
--data-raw '[
  {
    "entityType": "dataset",
    "entityUrn": "urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)",
    "aspect": {
      "__type": "DatasetProperties",
      "name": "Sample Dataset",
      "description": "This is a sample dataset",
      "customProperties": {
        "owner": "data-team",
        "retention": "90d"
      }
    }
  }
]'
```

#### 4.2.2 更新 Schema

```bash
curl --location --request POST 'http://localhost:8080/openapi/entities/v1/' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <token>' \
--data-raw '[
  {
    "aspect": {
      "__type": "SchemaMetadata",
      "schemaName": "SampleSchema",
      "platform": "urn:li:dataPlatform:hive",
      "version": 0,
      "hash": "",
      "platformSchema": {
        "__type": "MySqlDDL",
        "tableSchema": "CREATE TABLE sample_table (id INT, name VARCHAR(100))"
      },
      "fields": [
        {
          "fieldPath": "id",
          "type": {
            "type": {
              "__type": "NumberType"
            }
          },
          "nativeDataType": "INT",
          "description": "Unique identifier",
          "nullable": false,
          "isPartOfKey": true
        },
        {
          "fieldPath": "name",
          "type": {
            "type": {
              "__type": "StringType"
            }
          },
          "nativeDataType": "VARCHAR(100)",
          "description": "User name",
          "nullable": true,
          "isPartOfKey": false
        }
      ]
    },
    "entityType": "dataset",
    "entityUrn": "urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)"
  }
]'
```

#### 4.2.3 仅创建 (CREATE - 如果存在则失败)

```bash
curl --location --request POST 'http://localhost:8080/openapi/entities/v1/?createEntityIfNotExists=true' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <token>' \
--data-raw '[
  {
    "entityType": "dataset",
    "entityUrn": "urn:li:dataset:(urn:li:dataPlatform:hive,new_dataset,PROD)",
    "aspect": {
      "__type": "DatasetProperties",
      "name": "New Dataset"
    }
  }
]'
```

#### 4.2.4 获取实体

```bash
curl --location --request GET \
'http://localhost:8080/openapi/entities/v1/latest?urns=urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)&aspectNames=datasetProperties&aspectNames=schemaMetadata' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer <token>'
```

**响应示例:**

```json
{
  "responses": {
    "urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)": {
      "entityName": "dataset",
      "urn": "urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)",
      "aspects": {
        "datasetProperties": {
          "name": "datasetProperties",
          "type": "VERSIONED",
          "version": 0,
          "value": {
            "__type": "DatasetProperties",
            "name": "Sample Dataset",
            "description": "This is a sample dataset",
            "customProperties": {
              "owner": "data-team"
            }
          },
          "created": {
            "time": 1650657843351,
            "actor": "urn:li:corpuser:datahub"
          }
        },
        "schemaMetadata": {
          "name": "schemaMetadata",
          "type": "VERSIONED",
          "version": 0,
          "value": {
            "__type": "SchemaMetadata",
            "fields": [
              {
                "fieldPath": "id",
                "type": {
                  "type": {
                    "__type": "NumberType"
                  }
                },
                "nativeDataType": "INT"
              }
            ]
          }
        }
      }
    }
  }
}
```

#### 4.2.5 删除实体

**软删除** (实体不可搜索,但页面可访问):

```bash
curl --location --request DELETE \
'http://localhost:8080/openapi/entities/v1/?urns=urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)&soft=true' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer <token>'
```

**硬删除** (完全删除):

```bash
curl --location --request DELETE \
'http://localhost:8080/openapi/entities/v1/?urns=urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)&soft=false' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer <token>'
```

### 4.3 关系查询 (/relationships)

```bash
curl -X 'GET' \
  'http://localhost:8080/openapi/relationships/v1/?urn=urn:li:corpuser:john_doe&relationshipTypes=IsPartOf&direction=INCOMING&start=0&count=200' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer <token>'
```

**响应示例:**

```json
{
  "start": 0,
  "count": 2,
  "total": 2,
  "entities": [
    {
      "relationshipType": "IsPartOf",
      "urn": "urn:li:corpGroup:data-team"
    },
    {
      "relationshipType": "IsPartOf",
      "urn": "urn:li:corpGroup:engineering"
    }
  ]
}
```

### 4.4 批量获取 (Batch Get)

OpenAPI v3 支持批量获取实体和切面:

```bash
curl -X 'POST' \
  'http://localhost:8080/openapi/v3/entity/dataset/batchGet?systemMetadata=true' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '[
  {
    "urn": "urn:li:dataset:(urn:li:dataPlatform:hive,dataset1,PROD)",
    "datasetProperties": {},
    "globalTags": {}
  },
  {
    "urn": "urn:li:dataset:(urn:li:dataPlatform:hive,dataset2,PROD)",
    "datasetProperties": {}
  }
]'
```

### 4.5 条件写入

使用 `If-Version-Match` 头实现乐观锁:

```bash
curl -X 'POST' \
  'http://localhost:8080/openapi/v3/entity/dataset/batchGet' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '[
  {
    "urn": "urn:li:dataset:(urn:li:dataPlatform:hive,dataset1,PROD)",
    "globalTags": {
      "headers": {
        "If-Version-Match": "1"
      },
      "value": {
        "tags": [
          {
            "tag": "urn:li:tag:PII"
          }
        ]
      }
    }
  }
]'
```

### 4.6 通用 Patch 操作

OpenAPI v3 支持基于 JSON Patch (RFC 6902) 的通用 Patch:

```bash
curl -X 'PATCH' \
  'http://localhost:8080/openapi/v3/entity/dataset/urn:li:dataset:(urn:li:dataPlatform:hive,dataset1,PROD)/globalTags' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
  "arrayPrimaryKeys": {
    "tags": ["tag"]
  },
  "patch": [
    {
      "op": "add",
      "path": "/tags/urn:li:tag:PII",
      "value": {
        "tag": "urn:li:tag:PII"
      }
    },
    {
      "op": "remove",
      "path": "/tags/urn:li:tag:Legacy"
    }
  ]
}'
```

### 4.7 OpenAPI 规范和代码生成

下载 OpenAPI 规范:

```bash
# JSON 格式
curl http://localhost:8080/openapi/v3/api-docs -o openapi.json

# YAML 格式
curl http://localhost:8080/openapi/v3/api-docs.yaml -o openapi.yaml
```

使用 OpenAPI 生成器生成客户端代码:

```bash
# Python 客户端
openapi-generator-cli generate \
  -i openapi.yaml \
  -g python \
  -o ./python-client

# Java 客户端
openapi-generator-cli generate \
  -i openapi.yaml \
  -g java \
  -o ./java-client
```

---

## 5. Rest.li API

Rest.li API 是 DataHub 的传统 API,正在被 OpenAPI 逐步取代,但仍然完全支持。

### 5.1 端点文档

访问 Rest.li 文档:

```bash
# 在浏览器中打开 Rest.li 文档
python -c "import webbrowser; webbrowser.open('http://localhost:8080/restli/docs', new=2)"
```

### 5.2 摄取切面

```bash
curl --location --request POST 'http://localhost:8080/aspects?action=ingestProposal' \
--header 'X-RestLi-Protocol-Version: 2.0.0' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <token>' \
--data-raw '{
  "proposal": {
    "entityType": "dataset",
    "entityUrn": "urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)",
    "changeType": "UPSERT",
    "aspectName": "datasetUsageStatistics",
    "aspect": {
      "value": "{\"timestampMillis\":1629840771000,\"uniqueUserCount\":10,\"totalSqlQueries\":20,\"fieldCounts\":[{\"fieldPath\":\"col1\",\"count\":20},{\"fieldPath\":\"col2\",\"count\":5}]}",
      "contentType": "application/json"
    }
  }
}'
```

### 5.3 获取实体

```bash
curl --header 'X-RestLi-Protocol-Version: 2.0.0' \
     --header 'Authorization: Bearer <token>' \
     'http://localhost:8080/entitiesV2/urn%3Ali%3Adataset%3A%28urn%3Ali%3AdataPlatform%3Ahive%2CSampleDataset%2CPROD%29'
```

### 5.4 搜索实体

```bash
curl -X POST 'http://localhost:8080/entities?action=search' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <token>' \
--data-raw '{
  "input": "sample",
  "entity": "dataset",
  "start": 0,
  "count": 10,
  "filter": {
    "or": [{
      "and": [
        {
          "field": "platform",
          "values": ["hive"],
          "condition": "EQUAL"
        }
      ]
    }]
  }
}'
```

### 5.5 浏览实体

```bash
curl -X POST 'http://localhost:8080/entities?action=browse' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <token>' \
--data-raw '{
  "path": "/prod/hive",
  "entity": "dataset",
  "start": 0,
  "limit": 10
}'
```

---

## 6. Kafka API

Kafka API 用于异步批量元数据摄取,提供高吞吐量和解耦特性。

### 6.1 Kafka Topics

| Topic | 用途 | 保留期 |
|-------|------|--------|
| `MetadataChangeProposal_v1` | 异步元数据变更提案 | 90 天 |
| `FailedMetadataChangeProposal_v1` | 失败的提案 | 90 天 |
| `MetadataChangeLog_Versioned_v1` | 版本化切面的变更日志 | 7 天 |
| `MetadataChangeLog_Timeseries_v1` | 时间序列切面的变更日志 | 90 天 |

### 6.2 MetadataChangeProposal (MCP) 结构

```json
{
  "auditHeader": null,
  "entityType": "dataset",
  "entityUrn": "urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)",
  "entityKeyAspect": null,
  "changeType": "UPSERT",
  "aspectName": "datasetProperties",
  "aspect": {
    "contentType": "application/json",
    "value": "{\"name\":\"Sample Dataset\",\"description\":\"This is a sample dataset\"}"
  },
  "systemMetadata": {
    "lastObserved": 1650657843351,
    "runId": "manual-2024-01-15",
    "registryName": "DataHub",
    "registryVersion": "0.12.0"
  }
}
```

### 6.3 Python 发送 MCP

使用 DataHub Python SDK:

```python
from datahub.emitter.kafka_emitter import DatahubKafkaEmitter
from datahub.metadata.schema_classes import (
    DatasetPropertiesClass,
    ChangeTypeClass
)
from datahub.emitter.mcp import MetadataChangeProposalWrapper

# 创建 Kafka Emitter
emitter = DatahubKafkaEmitter(
    connection=KafkaProducerConnectionConfig(
        bootstrap="localhost:9092",
        schema_registry_url="http://localhost:8081"
    )
)

# 创建 MCP
mcp = MetadataChangeProposalWrapper(
    entityType="dataset",
    entityUrn="urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)",
    changeType=ChangeTypeClass.UPSERT,
    aspectName="datasetProperties",
    aspect=DatasetPropertiesClass(
        name="Sample Dataset",
        description="This is a sample dataset",
        customProperties={
            "owner": "data-team",
            "retention": "90d"
        }
    )
)

# 发送到 Kafka
emitter.emit(mcp)
emitter.flush()
```

### 6.4 Python 批量发送

```python
from datahub.emitter.kafka_emitter import DatahubKafkaEmitter
from datahub.emitter.mcp import MetadataChangeProposalWrapper
from datahub.metadata.schema_classes import (
    DatasetPropertiesClass,
    GlobalTagsClass,
    TagAssociationClass,
    ChangeTypeClass
)

emitter = DatahubKafkaEmitter(
    connection=KafkaProducerConnectionConfig(
        bootstrap="localhost:9092"
    )
)

# 批量创建 MCPs
mcps = []

# Dataset 1: 属性
mcps.append(MetadataChangeProposalWrapper(
    entityType="dataset",
    entityUrn="urn:li:dataset:(urn:li:dataPlatform:hive,dataset1,PROD)",
    changeType=ChangeTypeClass.UPSERT,
    aspectName="datasetProperties",
    aspect=DatasetPropertiesClass(name="Dataset 1")
))

# Dataset 1: 标签
mcps.append(MetadataChangeProposalWrapper(
    entityType="dataset",
    entityUrn="urn:li:dataset:(urn:li:dataPlatform:hive,dataset1,PROD)",
    changeType=ChangeTypeClass.UPSERT,
    aspectName="globalTags",
    aspect=GlobalTagsClass(
        tags=[
            TagAssociationClass(tag="urn:li:tag:PII")
        ]
    )
))

# Dataset 2: 属性
mcps.append(MetadataChangeProposalWrapper(
    entityType="dataset",
    entityUrn="urn:li:dataset:(urn:li:dataPlatform:hive,dataset2,PROD)",
    changeType=ChangeTypeClass.UPSERT,
    aspectName="datasetProperties",
    aspect=DatasetPropertiesClass(name="Dataset 2")
))

# 批量发送
for mcp in mcps:
    emitter.emit(mcp)

emitter.flush()
```

### 6.5 Java 发送 MCP

使用 DataHub Java SDK:

```java
import datahub.client.kafka.KafkaEmitter;
import datahub.client.kafka.KafkaEmitterConfig;
import datahub.event.MetadataChangeProposalWrapper;
import com.linkedin.dataset.DatasetProperties;
import com.linkedin.mxe.MetadataChangeProposal;

// 创建 Kafka Emitter
KafkaEmitterConfig config = KafkaEmitterConfig.builder()
    .bootstrap("localhost:9092")
    .schemaRegistryUrl("http://localhost:8081")
    .build();

KafkaEmitter emitter = new KafkaEmitter(config);

// 创建 MCP
DatasetProperties properties = new DatasetProperties()
    .setName("Sample Dataset")
    .setDescription("This is a sample dataset");

MetadataChangeProposalWrapper<DatasetProperties> mcpw =
    MetadataChangeProposalWrapper.<DatasetProperties>builder()
        .entityType("dataset")
        .entityUrn("urn:li:dataset:(urn:li:dataPlatform:hive,sample_dataset,PROD)")
        .upsert()
        .aspect(properties)
        .build();

// 发送到 Kafka
emitter.emit(mcpw, null).get();
emitter.close();
```

### 6.6 Kafka 消费 MCL

消费 MetadataChangeLog 以跟踪元数据变更:

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'MetadataChangeLog_Versioned_v1',
    bootstrap_servers=['localhost:9092'],
    auto_offset_reset='earliest',
    enable_auto_commit=True,
    value_deserializer=lambda x: json.loads(x.decode('utf-8'))
)

for message in consumer:
    mcl = message.value
    print(f"Entity: {mcl['entityUrn']}")
    print(f"Aspect: {mcl['aspectName']}")
    print(f"Change Type: {mcl['changeType']}")

    # 获取新值
    if 'aspect' in mcl:
        aspect_value = json.loads(mcl['aspect']['value'])
        print(f"New Value: {aspect_value}")

    # 获取旧值
    if 'previousAspectValue' in mcl:
        old_value = json.loads(mcl['previousAspectValue']['value'])
        print(f"Previous Value: {old_value}")
```

---

## 7. 错误处理

### 7.1 常见错误码

| HTTP 状态码 | 含义 | 常见原因 |
|------------|------|---------|
| 400 | Bad Request | 请求格式错误、参数无效 |
| 401 | Unauthorized | Token 无效或过期 |
| 403 | Forbidden | 权限不足 |
| 404 | Not Found | 实体不存在 |
| 422 | Unprocessable Entity | 数据验证失败 |
| 500 | Internal Server Error | 服务器内部错误 |

### 7.2 GraphQL 错误

GraphQL 错误包含在响应的 `errors` 数组中:

```json
{
  "data": null,
  "errors": [
    {
      "message": "Entity urn:li:dataset:(urn:li:dataPlatform:hive,nonexistent,PROD) does not exist",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": ["entity"],
      "extensions": {
        "classification": "DataFetchingException"
      }
    }
  ]
}
```

### 7.3 OpenAPI 错误

OpenAPI 错误返回详细的错误信息:

```json
{
  "status": 422,
  "message": "ValidationExceptionCollection",
  "errors": [
    {
      "entityUrn": "urn:li:dataset:(urn:li:dataPlatform:hive,dataset1,PROD)",
      "aspectName": "datasetProperties",
      "exception": "Cannot perform CREATE if not exists since the entity key already exists."
    }
  ]
}
```

### 7.4 错误处理最佳实践

#### Python 示例

```python
import requests
import json

def safe_graphql_query(query, variables=None):
    """安全的 GraphQL 查询封装"""
    url = "http://localhost:9002/api/graphql"
    headers = {
        "Authorization": "Bearer <your-token>",
        "Content-Type": "application/json"
    }

    payload = {
        "query": query,
        "variables": variables or {}
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()

        result = response.json()

        # 检查 GraphQL 错误
        if "errors" in result:
            for error in result["errors"]:
                print(f"GraphQL Error: {error['message']}")
            return None

        return result.get("data")

    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e.response.status_code} - {e.response.text}")
        return None
    except requests.exceptions.Timeout:
        print("Request timeout")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {str(e)}")
        return None
    except json.JSONDecodeError:
        print("Invalid JSON response")
        return None

# 使用示例
query = """
query getDataset {
  entity(urn: "urn:li:dataset:(urn:li:dataPlatform:hive,sample,PROD)") {
    urn
    type
  }
}
"""

result = safe_graphql_query(query)
if result:
    print(f"Success: {result}")
```

#### 重试机制

```python
import time
from typing import Optional

def retry_with_backoff(func, max_retries=3, initial_delay=1):
    """带退避的重试机制"""
    delay = initial_delay

    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise

            print(f"Attempt {attempt + 1} failed: {str(e)}")
            print(f"Retrying in {delay} seconds...")
            time.sleep(delay)
            delay *= 2

    return None

# 使用示例
def create_dataset():
    # ... API 调用代码 ...
    pass

result = retry_with_backoff(create_dataset, max_retries=3, initial_delay=2)
```

---

## 8. 最佳实践

### 8.1 API 选择指南

**使用 GraphQL API 当:**
- 需要快速原型开发
- 操作镜像 UI 功能
- 查询复杂的嵌套数据
- 需要精确控制返回字段

**使用 OpenAPI 当:**
- 需要完整的 CRUD 操作
- 批量操作大量实体
- 需要底层控制
- 构建自定义工具或集成

**使用 Python/Java SDK 当:**
- 构建生产级集成
- 需要类型安全
- 复杂的元数据转换
- 批量摄取流水线

**使用 Kafka API 当:**
- 大规模批量摄取
- 异步处理需求
- 需要与 Kafka 生态系统集成
- 需要解耦生产者和消费者

### 8.2 性能优化

#### 批量操作

**不推荐: 单个请求**
```python
# 慢 - 多次网络往返
for dataset_urn in dataset_urns:
    add_tag(dataset_urn, tag_urn)
```

**推荐: 批量请求**
```python
# 快 - 单次网络往返
batch_add_tags(dataset_urns, [tag_urn])
```

#### GraphQL 查询优化

**不推荐: 过度查询**
```graphql
query {
  entity(urn: "...") {
    ... on Dataset {
      # 获取所有字段,即使不需要
      properties { ... }
      ownership { ... }
      schemaMetadata { ... }
      # ... 等等
    }
  }
}
```

**推荐: 精确查询**
```graphql
query {
  entity(urn: "...") {
    ... on Dataset {
      # 只获取需要的字段
      properties {
        name
        description
      }
    }
  }
}
```

#### 分页

```python
def fetch_all_datasets(page_size=100):
    """分页获取所有数据集"""
    all_datasets = []
    start = 0

    while True:
        response = search_datasets(start=start, count=page_size)
        datasets = response['searchResults']
        all_datasets.extend(datasets)

        if len(datasets) < page_size:
            break

        start += page_size

    return all_datasets
```

### 8.3 URN 规范

DataHub URN 格式: `urn:li:<entity-type>:<key>`

**示例:**

```
# Dataset
urn:li:dataset:(urn:li:dataPlatform:hive,database.table,PROD)

# User
urn:li:corpuser:john_doe

# Group
urn:li:corpGroup:data-team

# Tag
urn:li:tag:PII

# Domain
urn:li:domain:marketing

# Glossary Term
urn:li:glossaryTerm:CustomerData

# Dashboard
urn:li:dashboard:(urn:li:dataPlatform:looker,dashboard_id)

# Chart
urn:li:chart:(urn:li:dataPlatform:looker,chart_id)
```

**URN 编码:**

URL 中使用 URN 时需要进行 URL 编码:

```python
from urllib.parse import quote

urn = "urn:li:dataset:(urn:li:dataPlatform:hive,database.table,PROD)"
encoded_urn = quote(urn, safe='')
# urn%3Ali%3Adataset%3A%28urn%3Ali%3AdataPlatform%3Ahive%2Cdatabase.table%2CPROD%29
```

### 8.4 安全最佳实践

1. **永远不要在代码中硬编码 Token**

```python
# 不推荐
TOKEN = "eyJhbGciOiJIUzI1NiJ9..."

# 推荐
import os
TOKEN = os.environ.get("DATAHUB_TOKEN")
```

2. **使用短期 Token**

为自动化脚本生成短期 Token,定期轮换。

3. **最小权限原则**

为每个 Token 分配最小必需权限。

4. **审计 API 使用**

定期审查 API 访问日志,监控异常活动。

### 8.5 测试策略

```python
import pytest
from unittest.mock import Mock, patch

def test_add_tag_to_dataset():
    """测试添加标签到数据集"""
    with patch('requests.post') as mock_post:
        # Mock 响应
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            "data": {
                "addTag": True
            }
        }

        # 执行测试
        result = add_tag_to_dataset(
            dataset_urn="urn:li:dataset:(urn:li:dataPlatform:hive,test,PROD)",
            tag_urn="urn:li:tag:Test"
        )

        # 验证
        assert result is True
        assert mock_post.called

        # 验证请求参数
        call_args = mock_post.call_args
        assert "Authorization" in call_args.kwargs["headers"]
```

### 8.6 监控和日志

```python
import logging
import time

logger = logging.getLogger(__name__)

def monitored_api_call(func):
    """API 调用监控装饰器"""
    def wrapper(*args, **kwargs):
        start_time = time.time()

        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time

            logger.info(
                f"API call {func.__name__} succeeded",
                extra={
                    "function": func.__name__,
                    "duration_seconds": duration,
                    "status": "success"
                }
            )

            return result

        except Exception as e:
            duration = time.time() - start_time

            logger.error(
                f"API call {func.__name__} failed: {str(e)}",
                extra={
                    "function": func.__name__,
                    "duration_seconds": duration,
                    "status": "error",
                    "error": str(e)
                }
            )
            raise

    return wrapper

@monitored_api_call
def get_dataset(urn):
    # ... API 调用 ...
    pass
```

---

## 附录

### A. 常用实体类型

| 实体类型 | 描述 | URN 格式 |
|---------|------|----------|
| dataset | 数据集 | `urn:li:dataset:(platform,name,env)` |
| dashboard | 仪表板 | `urn:li:dashboard:(platform,id)` |
| chart | 图表 | `urn:li:chart:(platform,id)` |
| dataJob | 数据作业 | `urn:li:dataJob:(flow,id)` |
| dataFlow | 数据流 | `urn:li:dataFlow:(orchestrator,id,cluster)` |
| corpuser | 用户 | `urn:li:corpuser:username` |
| corpGroup | 用户组 | `urn:li:corpGroup:name` |
| tag | 标签 | `urn:li:tag:name` |
| glossaryTerm | 术语表术语 | `urn:li:glossaryTerm:name` |
| domain | 域 | `urn:li:domain:name` |
| dataProduct | 数据产品 | `urn:li:dataProduct:name` |
| container | 容器 | `urn:li:container:guid` |

### B. 常用切面类型

| 切面名称 | 描述 | 适用实体 |
|---------|------|---------|
| datasetProperties | 数据集属性 | dataset |
| schemaMetadata | Schema 信息 | dataset |
| globalTags | 标签 | 所有实体 |
| glossaryTerms | 术语表术语 | 所有实体 |
| ownership | 所有权 | 所有实体 |
| institutionalMemory | 文档链接 | 所有实体 |
| deprecation | 弃用信息 | 所有实体 |
| upstreamLineage | 上游血缘 | dataset, dataJob |
| datasetUsageStatistics | 使用统计 | dataset |
| datasetProfile | 数据概览 | dataset |
| domains | 域 | 所有实体 |
| status | 状态 | 所有实体 |

### C. 参考资源

- **官方文档**: https://datahubproject.io/docs/
- **GraphQL Schema**: `http://<datahub-host>/api/graphiql`
- **OpenAPI Spec**: `http://<datahub-host>/openapi/swagger-ui/index.html`
- **GitHub**: https://github.com/datahub-project/datahub
- **Slack 社区**: https://slack.datahubproject.io/

### D. 示例代码仓库

完整的示例代码可在以下位置找到:

- Python 示例: `metadata-ingestion/examples/library/`
- Java 示例: `metadata-integration/java/examples/`
- GraphQL 查询示例: `datahub-web-react/src/graphql/`

---

**文档版本**: 1.0
**最后更新**: 2025-10-30
**适用 DataHub 版本**: v0.12.0+
