# DataHub 系统整体介绍

## 项目概述

DataHub 是一个现代化的元数据平台，为数据发现、协作、治理和可观测性提供统一解决方案。

### 核心特性

- **数据发现**：全文搜索、智能推荐、浏览导航
- **数据治理**：所有权管理、标签分类、术语表、策略控制
- **数据血缘**：端到端血缘追踪、影响分析
- **数据质量**：断言监控、质量评分
- **协作功能**：文档、讨论、通知

## 技术架构概览

DataHub 采用现代化的微服务架构，核心组件包括：

1. **GMS (Generalized Metadata Service)** - 元数据服务后端
2. **Frontend** - Web 用户界面
3. **Ingestion Framework** - 数据源采集框架
4. **Event Streaming** - Kafka 事件流
5. **Storage Layer** - 多存储后端（MySQL + Elasticsearch + Kafka）

## 支持的数据源

DataHub 支持 100+ 数据源，包括：

### 数据仓库
- Snowflake
- Google BigQuery
- Amazon Redshift
- Databricks
- Azure Synapse

### 数据库
- MySQL / PostgreSQL
- Oracle / SQL Server
- MongoDB / Cassandra
- Elasticsearch

### BI 工具
- Looker / Tableau
- Power BI / Superset
- Mode / Metabase

### 编排工具
- Apache Airflow
- Dagster / Prefect
- dbt

### 云存储
- AWS S3
- Google Cloud Storage
- Azure Data Lake

## 核心概念

### 实体 (Entity)
数据目录中的核心对象，如 Dataset、Dashboard、Chart、User 等。每个实体通过 URN 唯一标识。

**URN 格式**：
```
urn:li:<entity_type>:<key_fields>
```

**示例**：
```
urn:li:dataset:(urn:li:dataPlatform:mysql,analytics.users,PROD)
urn:li:dashboard:(looker,dashboard_123)
urn:li:corpUser:john.doe
```

### 方面 (Aspect)
实体的元数据片段，是原子写入单元。常见 Aspects：

- **ownership** - 所有者信息
- **schemaMetadata** - Schema 定义
- **globalTags** - 标签
- **glossaryTerms** - 术语关联
- **upstreamLineage** - 上游血缘
- **datasetProperties** - 数据集属性
- **institutionalMemory** - 文档链接

### 关系 (Relationship)
实体间的关联关系，通过 Aspect 中的外键定义：

- **OwnedBy** - Dataset → User
- **DownstreamOf** - Dataset → Dataset (血缘)
- **Contains** - Dashboard → Chart
- **MemberOf** - User → Group

## 架构设计原则

### 1. Schema-First（模式优先）
所有元数据模型使用 PDL (Pegasus Data Language) 定义，自动生成多语言代码。

### 2. Event-Driven（事件驱动）
所有元数据变更通过 Kafka 事件流传播，实现实时同步和解耦。

### 3. Aspect-Oriented（面向方面）
实体由多个独立的 Aspect 组成，支持灵活扩展和版本化。

### 4. API-First（API 优先）
提供多种 API 接口：
- GraphQL API（推荐）
- OpenAPI REST API
- Rest.li API（传统）
- Kafka API（事件驱动）

### 5. Federation-Ready（联邦就绪）
支持分布式部署，适合 Data Mesh 架构。

## 部署模式

### Quickstart（快速开始）
单机 Docker Compose 部署，适合开发和测试。

```bash
./gradlew quickstartDebug
```

### Production（生产环境）
Kubernetes 集群部署，支持水平扩展：

- GMS 服务：3+ 实例（无状态）
- Frontend 服务：2+ 实例
- Kafka 集群：3+ 节点
- Elasticsearch 集群：3+ 节点
- MySQL 主从复制

### Cloud（云托管）
Acryl DataHub Cloud - 全托管 SaaS 服务。

## 技术栈总览

### 后端 (Java)
- **框架**：Spring Boot 3.4.5
- **API**：Rest.li 29.74.2 + GraphQL 22.3
- **消息队列**：Apache Kafka 8.0.0
- **搜索**：Elasticsearch 8.x
- **数据库**：MySQL 8.0 / PostgreSQL 14+

### 前端 (TypeScript)
- **框架**：React 17 + TypeScript 4.8
- **GraphQL 客户端**：Apollo Client 3.3
- **UI 组件**：Ant Design 4.24
- **构建工具**：Vite 6

### 采集 (Python)
- **框架**：Python 3.8-3.12
- **配置验证**：Pydantic 2.x
- **SQL 解析**：sqlglot 27.27.0
- **数据库连接**：SQLAlchemy

## 下一步阅读

- [架构图详解](./02-architecture-diagrams.md) - 系统架构图集
- [数据模型详解](./03-data-model.md) - 元数据模型设计
- [API 使用指南](./04-api-guide.md) - API 接口文档
- [部署架构](./05-deployment-guide.md) - 部署和运维
- [性能优化](./06-performance-tuning.md) - 性能调优指南
