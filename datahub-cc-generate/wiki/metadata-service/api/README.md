# DataHub Metadata Service API 总览

DataHub Metadata Service 提供三种主要的 API 接口,满足不同的使用场景和开发需求。

---

## API 类型对比

| 特性 | GraphQL | OpenAPI (REST) | Rest.li |
|------|---------|---------------|---------|
| **用途** | 前端 + 外部开发 | 外部集成 + 自动化 | 内部系统调用 |
| **公开程度** | 公开 | 公开 | 内部 |
| **易用性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **灵活性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **性能** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **文档** | GraphiQL | Swagger UI | Rest.li Docs |
| **端点** | `/api/graphql` | `/openapi/v2/*`, `/openapi/v3/*` | `/entities`, `/aspects` |

---

## GraphQL API

### 概述

GraphQL 是 DataHub 的**主要公开 API**,面向前端应用和外部开发者。它提供灵活的查询能力,允许客户端精确指定需要的数据字段。

### 核心特性

- **单一端点**: `/api/graphql`
- **类型安全**: 强类型 Schema 定义
- **按需查询**: 客户端控制返回字段
- **关联查询**: 一次查询获取关联数据
- **实时文档**: GraphiQL 交互式文档

### 主要功能

#### 查询 (Query)

```graphql
# 获取 Dataset 信息
query getDataset {
  dataset(urn: "urn:li:dataset:(...)") {
    urn
    name
    description
    platform {
      name
    }
    tags {
      tags {
        tag {
          name
        }
      }
    }
  }
}

# 搜索
query search {
  search(
    input: {
      type: DATASET
      query: "user"
      start: 0
      count: 10
    }
  ) {
    searchResults {
      entity {
        ... on Dataset {
          urn
          name
        }
      }
    }
  }
}
```

#### 变更 (Mutation)

```graphql
# 添加标签
mutation addTags {
  addTags(
    input: {
      resourceUrn: "urn:li:dataset:(...)"
      tagUrns: ["urn:li:tag:PII"]
    }
  )
}

# 更新所有者
mutation addOwners {
  addOwners(
    input: {
      resourceUrn: "urn:li:dataset:(...)"
      ownerUrns: ["urn:li:corpuser:alice"]
      ownershipTypeUrn: "urn:li:ownershipType:TechnicalOwner"
    }
  )
}
```

### 访问方式

**GraphiQL (浏览器)**:
```
http://localhost:8080/api/graphiql
```

**cURL**:
```bash
curl -X POST http://localhost:8080/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ dataset(urn: \"...\") { name } }"}'
```

**Python (requests)**:
```python
import requests

query = """
query {
  dataset(urn: "urn:li:dataset:(...)") {
    name
    description
  }
}
"""

response = requests.post(
    "http://localhost:8080/api/graphql",
    json={"query": query}
)

print(response.json())
```

### 适用场景

✅ **推荐使用**:
- 前端应用开发
- 自定义 UI 构建
- 复杂关联查询
- 探索性开发

❌ **不推荐使用**:
- 大批量数据导出
- 高频率轮询
- 元数据摄取(ingestion)

---

## OpenAPI (REST API)

### 概述

OpenAPI 提供标准的 RESTful API,易于集成到现有系统和自动化流程中。支持 OpenAPI 3.0 规范,自动生成 Swagger 文档。

### 核心特性

- **RESTful 风格**: 标准 HTTP 方法(GET, POST, PUT, DELETE)
- **版本化**: `/openapi/v2/` 和 `/openapi/v3/`
- **Swagger UI**: 交互式 API 文档
- **客户端生成**: 支持自动生成客户端库
- **简单易用**: 符合 REST 最佳实践

### 主要端点

#### V2 API

```
/openapi/v2/entity/{entityName}/{entityUrn}  # 实体 CRUD
/openapi/v2/entity/{entityName}/scroll       # 滚动查询
/openapi/v2/relationship/{relationshipType}  # 关系查询
/openapi/v2/timeline/{entityUrn}            # 变更历史
```

#### V3 API

```
/openapi/v3/entity/{entityName}/{entityUrn}  # 实体操作
/openapi/v3/relationship/{sourceType}/{sourceUrn}/{relationshipType}  # 关系
```

### 使用示例

#### 获取实体

```bash
curl -X GET \
  "http://localhost:8080/openapi/v2/entity/dataset/urn%3Ali%3Adataset%3A(...)" \
  -H "Accept: application/json"
```

#### 搜索实体

```bash
curl -X POST \
  "http://localhost:8080/openapi/v2/entity/dataset/scroll" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "user",
    "count": 10
  }'
```

#### 更新 Aspect

```bash
curl -X POST \
  "http://localhost:8080/openapi/v2/entity/dataset/urn%3Ali%3Adataset%3A(...)/globalTags" \
  -H "Content-Type: application/json" \
  -d '{
    "tags": [
      {"tag": "urn:li:tag:PII"}
    ]
  }'
```

### 访问方式

**Swagger UI**:
```
http://localhost:8080/openapi/swagger-ui/
```

**OpenAPI 规范**:
```
http://localhost:8080/openapi/v3/api-docs
```

### 适用场景

✅ **推荐使用**:
- 第三方系统集成
- CI/CD 流程自动化
- 监控和告警系统
- 简单的 CRUD 操作
- 生成客户端库

❌ **不推荐使用**:
- 复杂关联查询
- 需要精细控制返回字段

---

## Rest.li API

### 概述

Rest.li 是 LinkedIn 开发的 REST 框架,作为 DataHub 的**底层 API**,主要供内部组件和元数据摄取框架使用。

### 核心特性

- **高性能**: 针对大规模数据优化
- **批量操作**: 支持批量读写
- **流式处理**: 支持大数据量导出
- **类型安全**: 基于 PDL Schema
- **内部使用**: 主要供 DataHub 组件使用

### 主要端点

```
/entities?action=ingest        # 摄取实体
/entitiesV2/{urn}              # 获取实体
/aspects?action=ingestProposal # 摄取 Aspect
/aspects?action=getTimeseriesAspectValues  # 获取时序 Aspect
/entities?action=search        # 搜索
/entities?action=browse        # 浏览
```

### 使用示例

#### 摄取 Aspect

```bash
curl -X POST 'http://localhost:8080/aspects?action=ingestProposal' \
  -H 'X-RestLi-Protocol-Version: 2.0.0' \
  -H 'Content-Type: application/json' \
  -d '{
    "proposal": {
      "entityType": "dataset",
      "entityUrn": "urn:li:dataset:(...)",
      "changeType": "UPSERT",
      "aspectName": "globalTags",
      "aspect": {
        "value": "{\"tags\":[{\"tag\":\"urn:li:tag:PII\"}]}",
        "contentType": "application/json"
      }
    }
  }'
```

#### 搜索实体

```bash
curl -X POST 'http://localhost:8080/entities?action=search' \
  -d '{
    "input": "user",
    "entity": "dataset",
    "start": 0,
    "count": 10
  }'
```

### 访问方式

**Rest.li 文档**:
```
http://localhost:8080/restli/docs
```

### 适用场景

✅ **推荐使用**:
- 元数据摄取(ingestion)
- 大批量数据导入
- DataHub 内部组件通信
- 需要最高性能的场景

❌ **不推荐使用**:
- 应用开发(使用 GraphQL 代替)
- 简单的实体查询

⚠️ **注意**: Rest.li API 被视为系统内部 API,可能在版本更新中变更。外部开发建议使用 GraphQL 或 OpenAPI。

---

## API 选择指南

### 我应该使用哪个 API?

```
┌─────────────────────────────────────────────┐
│ 你的需求是什么?                              │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
    构建应用           集成系统/自动化
        │                   │
        │         ┌─────────┴─────────┐
        │         │                   │
        │    需要标准REST        需要最高性能
        │         │                   │
    GraphQL     OpenAPI            Rest.li
        │         │                   │
        ▼         ▼                   ▼
    前端 UI    CI/CD/监控        数据摄取
    自定义应用  第三方集成        批量导入
    探索开发    自动化脚本        内部服务
```

### 快速决策树

1. **构建用户界面或应用?** → GraphQL
2. **需要集成到第三方系统?** → OpenAPI
3. **执行大批量数据操作?** → Rest.li
4. **不确定?** → 从 GraphQL 开始

---

## 认证与授权

所有 API 都支持以下认证方式:

### 1. Token 认证

```bash
curl -H "Authorization: Bearer <access_token>" \
  http://localhost:8080/api/graphql
```

### 2. Cookie 认证

通过 DataHub UI 登录后,Cookie 会自动携带。

### 3. 系统认证

配置系统 Client ID 和 Secret:

```yaml
datahub:
  authentication:
    systemClientId: ${DATAHUB_SYSTEM_CLIENT_ID}
    systemClientSecret: ${DATAHUB_SYSTEM_CLIENT_SECRET}
```

---

## 性能优化建议

### GraphQL

1. **限制查询深度**: 避免过深的嵌套查询
2. **使用分页**: 大数据集使用 `start` 和 `count`
3. **缓存结果**: 客户端缓存不变数据
4. **批量查询**: 使用 `batchGet` 替代多次单独查询

### OpenAPI

1. **使用过滤器**: 减少返回数据量
2. **Scroll API**: 大数据集使用滚动查询
3. **压缩**: 启用 gzip 压缩
4. **限流**: 遵守 API 限流规则

### Rest.li

1. **批量操作**: 使用 batch 端点
2. **投影**: 指定需要的字段
3. **异步处理**: 大数据量使用异步模式

---

## 错误处理

### HTTP 状态码

| 状态码 | 含义 | 处理建议 |
|--------|------|----------|
| 200 | 成功 | 正常处理 |
| 400 | 请求错误 | 检查请求参数 |
| 401 | 未认证 | 提供有效 Token |
| 403 | 无权限 | 检查授权策略 |
| 404 | 资源不存在 | 验证 URN |
| 429 | 限流 | 降低请求频率 |
| 500 | 服务器错误 | 联系管理员 |

### GraphQL 错误响应

```json
{
  "errors": [
    {
      "message": "Entity not found",
      "path": ["dataset"],
      "extensions": {
        "classification": "DataFetchingException"
      }
    }
  ],
  "data": null
}
```

### REST 错误响应

```json
{
  "status": 404,
  "message": "Entity not found: urn:li:dataset:(...)",
  "timestamp": "2025-10-30T10:00:00Z"
}
```

---

## 相关文档

- [GraphQL API 详细文档](graphql-api.md)
- [OpenAPI 详细文档](openapi.md)
- [Rest.li API 详细文档](restli-api.md)
- [认证授权](../auth/authentication.md)
- [开发指南](../development.md)

---

## 外部资源

- [GraphQL 官方文档](https://graphql.org/learn/)
- [OpenAPI 规范](https://swagger.io/specification/)
- [Rest.li 官方文档](https://linkedin.github.io/rest.li/)
- [DataHub API 示例](https://github.com/datahub-project/datahub/tree/master/metadata-ingestion/examples)
