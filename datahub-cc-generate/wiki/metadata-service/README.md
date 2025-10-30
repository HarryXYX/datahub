# DataHub Metadata Service (GMS) 完整指南

## 目录

1. [模块总览](#模块总览)
2. [核心架构](#核心架构)
3. [子模块说明](#子模块说明)
4. [技术栈](#技术栈)
5. [配置参数](#配置参数)
6. [快速开始](#快速开始)
7. [相关文档](#相关文档)

---

## 模块总览

DataHub Metadata Service (GMS) 是 DataHub 的核心后端服务,采用 Java/Spring Boot 构建,负责所有元数据的存储、检索和管理。GMS 提供多种 API 接口,支持不同的访问模式和用例。

### 核心职责

- **元数据存储管理**: 使用 Kafka + 数据库 (MySQL/PostgreSQL/Cassandra) 实现元数据的持久化存储
- **API 服务提供**: 提供 GraphQL、Rest.li 和 OpenAPI 三种 API 接口
- **搜索与索引**: 与 Elasticsearch/OpenSearch 集成,提供强大的搜索能力
- **血缘关系管理**: 管理和查询数据资产之间的血缘关系
- **认证与授权**: 实现基于策略的访问控制
- **事件流处理**: 通过 Kafka 处理元数据变更事件 (MCE/MCL)

### 设计理念

GMS 采用**事件驱动架构**和**Schema-First** 的设计理念:

1. **Schema-First**: 所有元数据模型在 `metadata-models` 中使用 Avro/PDL 定义
2. **事件驱动**: 所有元数据变更通过 Kafka 事件流传播
3. **Aspect 模式**: 元数据以 Aspect(方面)的形式组织,每个 Aspect 代表实体的一个特定维度
4. **多 API 支持**: 同一数据层支持多种 API 风格,满足不同场景需求

---

## 核心架构

```
┌─────────────────────────────────────────────────────────────┐
│                        API 层                                 │
├──────────────────┬──────────────────┬───────────────────────┤
│   GraphQL API    │   Rest.li API    │    OpenAPI v2/v3     │
│  (公开接口)       │   (系统内部)      │    (公开接口)         │
└────────┬─────────┴────────┬─────────┴─────────┬─────────────┘
         │                  │                   │
         └──────────────────┼───────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │          服务层 (Services)           │
         ├─────────────────────────────────────┤
         │ LineageService  OwnerService        │
         │ TagService      SearchService       │
         │ EntityService   TimelineService     │
         └──────────────────┬──────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │          认证授权层                   │
         ├─────────────────────────────────────┤
         │ DataHubAuthorizer                   │
         │ AspectPayloadValidators             │
         └──────────────────┬──────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │         数据访问层                    │
         ├─────────────────────────────────────┤
         │ EntityRegistry                      │
         │ AspectDao / EntityDao               │
         └──────────────────┬──────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │          存储层                      │
         ├──────────────────┬──────────────────┤
         │ Primary Store    │  Secondary Store │
         │ (MySQL/Postgres/ │  (Elasticsearch/ │
         │  Cassandra)      │   OpenSearch)    │
         └──────────────────┴──────────────────┘
                            │
                    ┌───────┴────────┐
                    │  Kafka Streams │
                    │   (MCE/MCL)    │
                    └────────────────┘
```

### 数据流转流程

1. **写入路径** (Ingestion):
   ```
   Client → API Layer → Validators → EntityService
        → AspectDao → Primary DB + Kafka (MCL)
        → Indexing Pipeline → Elasticsearch
   ```

2. **读取路径** (Query):
   ```
   Client → API Layer → EntityService → AspectDao → Primary DB
   或
   Client → API Layer → SearchService → Elasticsearch
   ```

---

## 子模块说明

### 1. **configuration**
配置管理模块,包含所有 GMS 的配置类。

- **路径**: `/metadata-service/configuration`
- **关键类**:
  - `DataHubAppConfiguration`: GMS 主配置类
  - `FeatureFlags`: 功能开关配置
  - `CacheConfiguration`: 缓存配置
  - `KafkaConfiguration`: Kafka 连接配置
  - `ElasticSearchConfiguration`: ES 配置
- **用途**: 通过 Spring Boot `@ConfigurationProperties` 管理所有运行时配置

### 2. **services**
核心业务逻辑服务层。

- **路径**: `/metadata-service/services`
- **关键服务**:
  - `LineageService`: 血缘关系管理 ([详细文档](services/lineage-service.md))
  - `OwnerService`: 所有权管理 ([详细文档](services/ownership-service.md))
  - `EntitySearchService`: 搜索服务 ([详细文档](services/search-service.md))
  - `TagService`: 标签管理 ([详细文档](services/tag-service.md))
  - `EntityService`: 实体 CRUD 操作
  - `GraphService`: 图关系查询
  - `TimelineService`: 变更历史

### 3. **auth-impl** / **auth-config** / **auth-filter** / **auth-servlet-impl**
认证授权模块组。

- **auth-impl**: 授权实现 (DataHubAuthorizer, 策略评估)
- **auth-config**: 授权配置
- **auth-filter**: Servlet 过滤器,拦截请求进行认证
- **auth-servlet-impl**: 认证相关的 HTTP 端点

详见 [认证授权文档](auth/)。

### 4. **graphql-servlet-impl**
GraphQL API 实现。

- **路径**: `/metadata-service/graphql-servlet-impl`
- **端点**: `/api/graphql`, `/api/graphiql`
- **Controller**: `GraphQLController`, `GraphiQLController`
- **特点**:
  - 面向前端和外部开发者的主要 API
  - 支持 GraphiQL 交互式查询界面
  - Schema 定义在 `datahub-graphql-core` 模块

详见 [GraphQL API 文档](api/graphql-api.md)。

### 5. **restli-api** / **restli-servlet-impl** / **restli-client**
Rest.li API 相关模块。

- **restli-api**: Rest.li 资源定义 (IDL)
- **restli-servlet-impl**: Rest.li Servlet 实现
- **restli-client**: Rest.li 客户端库

详见 [Rest.li API 文档](api/restli-api.md)。

### 6. **openapi-servlet** / **openapi-entity-servlet** / **openapi-analytics-servlet**
OpenAPI (Swagger) 实现。

- **openapi-servlet**: OpenAPI v2/v3 实现
- **openapi-entity-servlet**: 实体相关的 OpenAPI 端点
- **openapi-analytics-servlet**: 分析数据相关的 OpenAPI 端点
- **特点**:
  - 基于 Spring WebMVC
  - 自动生成 Swagger 文档
  - 提供 RESTful 风格的 API

详见 [OpenAPI 文档](api/openapi.md)。

### 7. **servlet**
通用 Servlet 配置和工具类。

- **路径**: `/metadata-service/servlet`
- **用途**: 提供基础的 Servlet 配置、过滤器和拦截器

### 8. **factories**
Spring Bean 工厂类。

- **路径**: `/metadata-service/factories`
- **用途**: 创建和配置 GMS 核心组件的 Spring Bean

### 9. **events-service**
事件处理服务。

- **路径**: `/metadata-service/events-service`
- **用途**: 处理和路由 Kafka 事件 (MCE/MCL)

### 10. **plugin**
插件系统支持。

- **路径**: `/metadata-service/plugin`
- **用途**: 支持自定义插件扩展 GMS 功能

### 11. **war**
Web Application Archive 打包模块。

- **路径**: `/metadata-service/war`
- **用途**: 打包所有模块为一个可部署的 WAR 文件
- **构建命令**: `./gradlew :metadata-service:war:build`

### 12. **schema-registry-api** / **schema-registry-servlet**
Schema Registry API 实现(兼容 Confluent Schema Registry)。

- **用途**: 提供 Schema Registry 兼容的 API 端点

### 13. **iceberg-catalog**
Apache Iceberg Catalog 集成。

- **路径**: `/metadata-service/iceberg-catalog`
- **用途**: 将 DataHub 作为 Iceberg Catalog 使用

---

## 技术栈

### 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| **Java** | 17+ | 主要编程语言 |
| **Spring Boot** | 2.x/3.x | 应用框架 |
| **Spring MVC** | - | Web 框架 |
| **Rest.li** | 28.x | LinkedIn 的 REST 框架 |
| **GraphQL Java** | 17+ | GraphQL 实现 |
| **Kafka** | 2.x+ | 事件流 |
| **Avro** | 1.10+ | Schema 定义和序列化 |

### 数据存储

| 技术 | 用途 |
|------|------|
| **MySQL / PostgreSQL / Cassandra** | 主存储 (Primary Store) |
| **Elasticsearch / OpenSearch** | 搜索索引 (Secondary Store) |
| **Neo4j (可选)** | 图数据库 |

### 工具库

- **Lombok**: 减少样板代码
- **Guice / Spring DI**: 依赖注入
- **Caffeine**: 本地缓存
- **TestNG / JUnit**: 测试框架
- **Mockito**: Mock 框架
- **Spotless**: 代码格式化

---

## 配置参数

GMS 通过 `application.yml` 或环境变量进行配置。以下是关键配置项:

### 数据库配置

```yaml
ebean:
  username: datahub
  password: ${DATAHUB_DB_PASSWORD}
  url: jdbc:mysql://mysql:3306/datahub
  driver: com.mysql.jdbc.Driver
```

### Kafka 配置

```yaml
kafka:
  bootstrapServers: kafka:9092
  schemaRegistry:
    url: http://schema-registry:8081
  producer:
    compressionType: snappy
  consumer:
    maxPartitionFetchBytes: 5242880
```

### Elasticsearch 配置

```yaml
elasticSearch:
  host: elasticsearch
  port: 9200
  useSSL: false
  bulkProcessor:
    requestsLimit: 1000
    flushPeriod: 1
    retries: 3
```

### 搜索配置

```yaml
searchService:
  enableCache: true
  cacheImplementation: caffeine
  maxCacheSize: 10000
  batchSize: 100
```

### GraphQL 配置

```yaml
graphQL:
  maxQueryDepth: 12
  maxComplexity: 1000
  defaultPageSize: 20
  maxPageSize: 100
```

### 缓存配置

```yaml
cache:
  primary:
    ttlSeconds: 600
    maxSize: 10000
  search:
    ttlSeconds: 300
    maxSize: 1000
  homepage:
    ttlSeconds: 600
    maxSize: 100
```

### 认证配置

```yaml
datahub:
  authentication:
    enabled: true
    systemClientId: ${DATAHUB_SYSTEM_CLIENT_ID}
    systemClientSecret: ${DATAHUB_SYSTEM_CLIENT_SECRET}
```

### 功能开关

```yaml
featureFlags:
  showSimplifiedHomepageByDefault: false
  lineageSearchCacheEnabled: true
  showSearchFiltersV2: true
  showBrowseV2: true
```

完整的配置选项请参考 `DataHubAppConfiguration.java`。

---

## 快速开始

### 本地开发

1. **启动依赖服务**:
   ```bash
   cd docker
   docker-compose -f docker-compose.dev.yml up -d mysql kafka elasticsearch
   ```

2. **构建项目**:
   ```bash
   ./gradlew :metadata-service:war:build
   ```

3. **运行 GMS**:
   ```bash
   ./gradlew :metadata-service:war:run
   ```

4. **访问 API**:
   - GraphiQL: http://localhost:8080/api/graphiql
   - Rest.li Docs: http://localhost:8080/restli/docs
   - OpenAPI Swagger: http://localhost:8080/openapi/swagger-ui/

### Docker 部署

```bash
cd docker
docker-compose up datahub-gms
```

### 健康检查

```bash
# 检查服务状态
curl http://localhost:8080/health

# 检查配置
curl http://localhost:8080/config
```

---

## 相关文档

### API 文档
- [GraphQL API](api/graphql-api.md)
- [Rest.li API](api/restli-api.md)
- [OpenAPI](api/openapi.md)

### 服务文档
- [LineageService - 血缘服务](services/lineage-service.md)
- [OwnerService - 所有权服务](services/ownership-service.md)
- [SearchService - 搜索服务](services/search-service.md)
- [TagService - 标签服务](services/tag-service.md)

### 认证授权
- [认证机制](auth/authentication.md)
- [授权策略](auth/authorization.md)
- [Policy Validator](auth/policy-validator.md)

### 开发指南
- [开发指南](development.md)
- [添加新服务](development.md#添加新服务)
- [添加新 API 端点](development.md#添加新-api-端点)
- [Aspect Validator 开发](development.md#aspect-validator-开发)
- [测试指南](development.md#测试指南)

### 外部资源
- [DataHub 官方文档](https://datahubproject.io/docs/)
- [GraphQL 官方文档](https://graphql.org/)
- [Rest.li 官方文档](https://linkedin.github.io/rest.li/)
- [Spring Boot 文档](https://spring.io/projects/spring-boot)
