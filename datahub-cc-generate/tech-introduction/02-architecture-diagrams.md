# DataHub 架构图集

本文档包含 DataHub 系统的核心架构图，帮助理解系统设计和数据流。

## 1. 系统整体架构（C4 Level 1）

```mermaid
graph TB
    subgraph Users["用户层"]
        DataEngineer["数据工程师"]
        DataAnalyst["数据分析师"]
        DataScientist["数据科学家"]
        DataSteward["数据治理专员"]
    end

    subgraph DataHub["DataHub 平台"]
        Frontend["Web 界面<br/>(React)"]
        GMS["元数据服务<br/>(Spring Boot)"]
        Ingestion["采集框架<br/>(Python CLI)"]
    end

    subgraph Storage["存储层"]
        MySQL["MySQL<br/>(主存储)"]
        ES["Elasticsearch<br/>(搜索索引)"]
        Kafka["Kafka<br/>(事件流)"]
    end

    subgraph DataSources["数据源"]
        Snowflake["Snowflake"]
        BigQuery["BigQuery"]
        Airflow["Airflow"]
        Looker["Looker"]
        S3["S3"]
    end

    DataEngineer --> Frontend
    DataAnalyst --> Frontend
    DataScientist --> Frontend
    DataSteward --> Frontend

    Frontend -->|GraphQL| GMS
    Ingestion -->|MCE Events| Kafka
    Kafka --> GMS
    GMS --> MySQL
    GMS --> Kafka
    Kafka --> ES

    Ingestion -.->|采集元数据| Snowflake
    Ingestion -.->|采集元数据| BigQuery
    Ingestion -.->|采集元数据| Airflow
    Ingestion -.->|采集元数据| Looker
    Ingestion -.->|采集元数据| S3

    classDef userClass fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef appClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef storageClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef sourceClass fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px

    class DataEngineer,DataAnalyst,DataScientist,DataSteward userClass
    class Frontend,GMS,Ingestion appClass
    class MySQL,ES,Kafka storageClass
    class Snowflake,BigQuery,Airflow,Looker,S3 sourceClass
```

**说明**：
- **用户层**：不同角色通过 Web 界面访问 DataHub
- **应用层**：三大核心服务（Frontend、GMS、Ingestion）
- **存储层**：MySQL（主存储）+ Elasticsearch（搜索）+ Kafka（事件流）
- **数据源层**：100+ 支持的数据源

---

## 2. 容器架构（C4 Level 2）

```mermaid
graph TB
    subgraph Frontend["datahub-frontend (Play Framework)"]
        PlayApp["Play Application<br/>(Scala)"]
        Auth["认证层<br/>(OIDC/SAML)"]
        Proxy["反向代理"]
    end

    subgraph GMS["datahub-gms (Spring Boot)"]
        direction TB
        GraphQLAPI["GraphQL API<br/>(:8080/api/graphql)"]
        RestAPI["Rest.li API<br/>(:8080/entities)"]
        OpenAPI["OpenAPI v3<br/>(:8080/openapi)"]

        subgraph Services["业务服务层"]
            LineageService["LineageService"]
            OwnershipService["OwnershipService"]
            TagService["TagService"]
            SearchService["SearchService"]
        end

        subgraph MetadataIO["metadata-io"]
            EntityService["EntityService"]
            AspectDAO["AspectDAO"]
            SearchDAO["SearchDAO"]
        end

        GraphQLAPI --> Services
        RestAPI --> Services
        OpenAPI --> Services
        Services --> MetadataIO
    end

    subgraph Jobs["metadata-jobs (异步处理)"]
        MCEConsumer["MCE Consumer<br/>(处理外部事件)"]
        MAEConsumer["MAE Consumer<br/>(更新搜索索引)"]
        PEConsumer["PE Consumer<br/>(平台事件)"]
    end

    subgraph Storage["存储层"]
        MySQL[(MySQL<br/>Aspects 存储)]
        ES[(Elasticsearch<br/>搜索索引)]
        KafkaCluster[("Kafka<br/>事件流")]
    end

    Browser["浏览器"] -->|HTTPS| PlayApp
    PlayApp --> Auth
    PlayApp -->|代理 GraphQL| GraphQLAPI

    MetadataIO --> MySQL
    MetadataIO --> ES
    MetadataIO --> KafkaCluster

    KafkaCluster -->|MCE Topic| MCEConsumer
    MCEConsumer -->|写入| EntityService

    EntityService -->|发布 MAE| KafkaCluster
    KafkaCluster -->|MAE Topic| MAEConsumer
    MAEConsumer -->|更新| ES

    classDef frontendClass fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef gmsClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef jobClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef storageClass fill:#ffebee,stroke:#c62828,stroke-width:2px

    class PlayApp,Auth,Proxy frontendClass
    class GraphQLAPI,RestAPI,OpenAPI,Services,MetadataIO gmsClass
    class MCEConsumer,MAEConsumer,PEConsumer jobClass
    class MySQL,ES,KafkaCluster storageClass
```

**核心组件**：

1. **datahub-frontend**：用户认证 + 反向代理
2. **datahub-gms**：元数据服务核心，提供多种 API
3. **metadata-jobs**：异步事件处理器
4. **存储层**：MySQL（持久化）+ ES（搜索）+ Kafka（消息）

---

## 3. 元数据导入流程（序列图）

```mermaid
sequenceDiagram
    participant Ingestion as Ingestion CLI<br/>(Python)
    participant Kafka as Kafka<br/>(MCE Topic)
    participant MCEConsumer as MCE Consumer<br/>(Spring Boot)
    participant GMS as GMS<br/>(EntityService)
    participant MySQL as MySQL
    participant MAETopic as Kafka<br/>(MAE Topic)
    participant MAEConsumer as MAE Consumer
    participant ES as Elasticsearch

    Note over Ingestion: 步骤 1: 采集元数据
    Ingestion->>Ingestion: 连接数据源<br/>(如 Snowflake)
    Ingestion->>Ingestion: 提取元数据<br/>(表结构、血缘等)

    Note over Ingestion,Kafka: 步骤 2: 发送 MCE 事件
    Ingestion->>Kafka: 发送 MCE<br/>(MetadataChangeEvent)
    Note right of Kafka: Topic: MetadataChangeEvent_v4<br/>Format: Avro

    Note over Kafka,GMS: 步骤 3: MCE 消费和持久化
    Kafka->>MCEConsumer: 拉取 MCE
    MCEConsumer->>GMS: 调用 ingestProposal()
    GMS->>GMS: 验证 Aspect
    GMS->>MySQL: 写入 Aspect<br/>(metadata_aspect_v2)
    MySQL-->>GMS: 确认写入

    Note over GMS,MAETopic: 步骤 4: 发布 MAE 审计事件
    GMS->>MAETopic: 发布 MAE<br/>(MetadataAuditEvent)
    Note right of MAETopic: Topic: MetadataAuditEvent_v4<br/>包含变更前后状态

    Note over MAETopic,ES: 步骤 5: 更新搜索索引
    MAETopic->>MAEConsumer: 拉取 MAE
    MAEConsumer->>MAEConsumer: 解析实体和 Aspects
    MAEConsumer->>ES: 批量索引更新<br/>(datahubdatasetindex_v2)
    ES-->>MAEConsumer: 确认索引

    Note over Ingestion,ES: ✅ 元数据导入完成<br/>可通过 UI 搜索和查看
```

**关键步骤**：

1. **采集**：Python CLI 从数据源提取元数据
2. **发送**：MCE 事件发送到 Kafka
3. **持久化**：MCE Consumer 写入 MySQL
4. **审计**：GMS 发布 MAE 事件
5. **索引**：MAE Consumer 更新 Elasticsearch

---

## 4. GraphQL 查询流程（序列图）

```mermaid
sequenceDiagram
    participant Browser as 浏览器
    participant Frontend as datahub-frontend
    participant GraphQL as GraphQL Servlet
    participant DataLoader as DataLoader<br/>(批量加载)
    participant Service as LineageService
    participant EntityService as EntityService
    participant MySQL as MySQL
    participant ES as Elasticsearch

    Note over Browser: 用户搜索 Dataset
    Browser->>Frontend: GET /search?query=users
    Frontend->>GraphQL: GraphQL Query<br/>searchAcrossEntities

    Note over GraphQL: 解析 GraphQL 查询
    GraphQL->>ES: 搜索请求<br/>(query: "users")
    ES-->>GraphQL: 返回 100 个 URNs

    Note over GraphQL,DataLoader: 批量加载优化
    loop 对每个 Dataset URN
        GraphQL->>DataLoader: 请求 Dataset 详情
        Note right of DataLoader: 批量收集请求<br/>(避免 N+1 问题)
    end

    DataLoader->>EntityService: batchGet(urns)
    EntityService->>MySQL: SELECT * FROM metadata_aspect_v2<br/>WHERE urn IN (...)
    MySQL-->>EntityService: 返回 Aspects
    EntityService-->>DataLoader: 返回实体数据
    DataLoader-->>GraphQL: 返回批量结果

    Note over GraphQL: 查询血缘关系
    GraphQL->>Service: getLineage(urn)
    Service->>EntityService: getAspect("upstreamLineage")
    EntityService->>MySQL: 查询血缘 Aspect
    MySQL-->>EntityService: 返回上游 URNs
    EntityService-->>Service: 返回血缘数据
    Service-->>GraphQL: 返回血缘图

    GraphQL-->>Frontend: JSON 响应
    Frontend-->>Browser: 渲染 UI

    Note over Browser,ES: ✅ 查询完成<br/>耗时 < 500ms
```

**性能优化**：

- **DataLoader**：批量加载，避免 N+1 查询问题
- **缓存**：EntityService 使用 Caffeine 缓存热点数据
- **索引优化**：MySQL 使用复合索引 (urn, aspect)

---

## 5. 数据模型（ER 图）

```mermaid
erDiagram
    Dataset ||--o{ SchemaMetadata : has
    Dataset ||--o{ Ownership : has
    Dataset ||--o{ GlobalTags : has
    Dataset ||--o{ GlossaryTerms : has
    Dataset ||--o{ UpstreamLineage : has
    Dataset ||--o{ DatasetProperties : has

    Dashboard ||--o{ DashboardInfo : has
    Dashboard ||--o{ Ownership : has
    Dashboard ||--|| Chart : contains

    Chart ||--o{ ChartInfo : has
    Chart ||--o{ Ownership : has

    CorpUser ||--o{ CorpUserInfo : has
    CorpUser ||--o{ GroupMembership : has

    CorpGroup ||--o{ CorpGroupInfo : has

    GlossaryTerm ||--o{ GlossaryTermInfo : has
    GlossaryTerm ||--o{ GlossaryRelatedTerms : has

    Tag ||--o{ TagProperties : has

    Dataset {
        string urn PK "urn:li:dataset:(...)"
        string platform "mysql, snowflake, etc"
        string name "表名"
        string env "PROD, DEV, etc"
    }

    SchemaMetadata {
        string urn FK
        array fields "字段列表"
        string platformSchema "原始 Schema"
        long created "创建时间"
    }

    Ownership {
        string urn FK
        array owners "所有者列表"
        string type "TECHNICAL, BUSINESS"
    }

    UpstreamLineage {
        string urn FK
        array upstreams "上游 Dataset URNs"
        string lineageType "TRANSFORM, COPY, etc"
    }

    GlobalTags {
        string urn FK
        array tags "标签 URNs"
    }

    CorpUser {
        string urn PK "urn:li:corpUser:john.doe"
        string username "用户名"
    }

    CorpUserInfo {
        string urn FK
        string displayName "显示名称"
        string email "邮箱"
    }
```

**核心实体类型**：

1. **Dataset** - 数据集（表、视图、流）
2. **Dashboard** - 仪表板
3. **Chart** - 图表
4. **CorpUser** - 用户
5. **CorpGroup** - 用户组
6. **GlossaryTerm** - 术语
7. **Tag** - 标签

**Aspect 类型**：

- **Info Aspects**：基础信息（名称、描述等）
- **Schema Aspects**：结构信息
- **Ownership Aspects**：所有权
- **Lineage Aspects**：血缘关系
- **Tag/Term Aspects**：分类标注

---

## 6. 模块依赖图

```mermaid
graph LR
    subgraph Models["元数据模型层"]
        MM["metadata-models<br/>(PDL Schemas)"]
    end

    subgraph Backend["后端服务层"]
        MIO["metadata-io<br/>(数据访问)"]
        MS["metadata-service<br/>(GMS 服务)"]
        GQL["datahub-graphql-core<br/>(GraphQL API)"]
        Jobs["metadata-jobs<br/>(异步处理)"]
    end

    subgraph Frontend["前端层"]
        DFE["datahub-frontend<br/>(Play Framework)"]
        React["datahub-web-react<br/>(React SPA)"]
    end

    subgraph Ingestion["采集层"]
        MI["metadata-ingestion<br/>(Python CLI)"]
        AP["airflow-plugin"]
        DP["dagster-plugin"]
    end

    MM -->|代码生成| MIO
    MM -->|代码生成| MS
    MM -->|代码生成| MI

    MIO --> MS
    MIO --> Jobs

    GQL --> MS
    MS --> DFE

    React -->|GraphQL 查询| DFE
    DFE -->|代理| MS

    MI -->|MCE 事件| Jobs
    AP -->|MCE 事件| Jobs
    DP -->|MCE 事件| Jobs

    Jobs --> MIO

    classDef modelClass fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef backendClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef frontendClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef ingestionClass fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px

    class MM modelClass
    class MIO,MS,GQL,Jobs backendClass
    class DFE,React frontendClass
    class MI,AP,DP ingestionClass
```

**依赖说明**：

1. **metadata-models** 是基础，所有模块依赖其生成的代码
2. **metadata-io** 提供数据访问抽象，被 GMS 和 Jobs 使用
3. **datahub-graphql-core** 独立可部署，也可嵌入 GMS
4. **前端层** 通过 GraphQL API 消费后端服务
5. **采集层** 通过 Kafka 事件与后端解耦

---

## 7. 事件流架构

```mermaid
flowchart TD
    Start([开始]) --> IngestionSource

    subgraph Ingestion["采集层"]
        IngestionSource["数据源<br/>(Snowflake, BigQuery, etc)"]
        IngestionCLI["Ingestion CLI<br/>(Python)"]
        RestEmitter["RestEmitter<br/>(HTTP)"]
        KafkaEmitter["KafkaEmitter"]
    end

    subgraph Kafka["Kafka 事件流"]
        MCETopic["MCE Topic<br/>(MetadataChangeEvent_v4)"]
        MAETopic["MAE Topic<br/>(MetadataAuditEvent_v4)"]
        PETopic["PE Topic<br/>(PlatformEvent_v1)"]
        FMCETopic["FMCE Topic<br/>(Failed MCE)"]
    end

    subgraph GMS["GMS 服务"]
        RestAPI["REST API<br/>(:8080/aspects)"]
        EntityService["EntityService"]
        Validators["Aspect Validators"]
    end

    subgraph Jobs["异步处理器"]
        MCEConsumer["MCE Consumer"]
        MAEConsumer["MAE Consumer"]
        PEConsumer["PE Consumer"]
    end

    subgraph Storage["存储层"]
        MySQL[(MySQL)]
        ES[(Elasticsearch)]
    end

    IngestionSource --> IngestionCLI
    IngestionCLI --> RestEmitter
    IngestionCLI --> KafkaEmitter

    RestEmitter -->|HTTP POST| RestAPI
    RestAPI --> EntityService

    KafkaEmitter --> MCETopic
    MCETopic --> MCEConsumer
    MCEConsumer --> EntityService

    EntityService --> Validators
    Validators -->|验证失败| FMCETopic
    Validators -->|验证通过| MySQL

    EntityService -->|变更事件| MAETopic
    EntityService -->|平台事件| PETopic

    MAETopic --> MAEConsumer
    PETopic --> PEConsumer

    MAEConsumer --> ES
    PEConsumer --> ES

    End([结束])
    ES --> End

    classDef ingestionClass fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef kafkaClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef gmsClass fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef jobClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef storageClass fill:#ffebee,stroke:#c62828,stroke-width:2px

    class IngestionSource,IngestionCLI,RestEmitter,KafkaEmitter ingestionClass
    class MCETopic,MAETopic,PETopic,FMCETopic kafkaClass
    class RestAPI,EntityService,Validators gmsClass
    class MCEConsumer,MAEConsumer,PEConsumer jobClass
    class MySQL,ES storageClass
```

**事件类型**：

1. **MCE (Metadata Change Event)**：外部元数据变更请求
2. **MAE (Metadata Audit Event)**：审计日志，包含变更前后状态
3. **PE (Platform Event)**：平台级事件（如用户操作、系统告警）
4. **FMCE (Failed MCE)**：验证失败的 MCE，用于调试

---

## 8. 部署架构（生产环境）

```mermaid
graph TB
    subgraph Internet["互联网"]
        Users["用户"]
    end

    subgraph K8s["Kubernetes 集群"]
        subgraph Ingress["Ingress 层"]
            IngressCtrl["Nginx Ingress<br/>datahub.company.com"]
            Cert["Let's Encrypt<br/>(TLS 证书)"]
        end

        subgraph Frontend["Frontend Pod (2 replicas)"]
            FE1["datahub-frontend:v0.14.0<br/>Pod 1"]
            FE2["datahub-frontend:v0.14.0<br/>Pod 2"]
        end

        subgraph GMS["GMS Pod (3 replicas)"]
            GMS1["datahub-gms:v0.14.0<br/>Pod 1"]
            GMS2["datahub-gms:v0.14.0<br/>Pod 2"]
            GMS3["datahub-gms:v0.14.0<br/>Pod 3"]
        end

        subgraph Jobs["Jobs Pod (2 replicas)"]
            Job1["mce-consumer<br/>Pod 1"]
            Job2["mae-consumer<br/>Pod 2"]
        end

        subgraph Actions["Actions Pod (1 replica)"]
            Act1["datahub-actions<br/>Pod 1"]
        end

        FESvc["Service: frontend<br/>(ClusterIP)"]
        GMSSvc["Service: gms<br/>(ClusterIP)"]
    end

    subgraph Data["数据层 (Managed Services)"]
        subgraph MySQL["RDS MySQL (Multi-AZ)"]
            MySQLPrimary[(Primary<br/>db.r5.xlarge)]
            MySQLReplica[(Read Replica<br/>db.r5.large)]
        end

        subgraph ES["Elasticsearch (Managed)"]
            ES1[(ES Node 1<br/>r5.xlarge.search)]
            ES2[(ES Node 2<br/>r5.xlarge.search)]
            ES3[(ES Node 3<br/>r5.xlarge.search)]
        end

        subgraph Kafka["MSK Kafka (Managed)"]
            Kafka1[("Broker 1<br/>kafka.m5.large")]
            Kafka2[("Broker 2<br/>kafka.m5.large")]
            Kafka3[("Broker 3<br/>kafka.m5.large")]
            SR["Schema Registry"]
        end
    end

    subgraph Monitoring["监控和日志"]
        Prometheus["Prometheus"]
        Grafana["Grafana"]
        ELK["ELK Stack<br/>(日志聚合)"]
    end

    Users -->|HTTPS| IngressCtrl
    IngressCtrl --> Cert
    IngressCtrl --> FESvc
    FESvc --> FE1
    FESvc --> FE2

    FE1 --> GMSSvc
    FE2 --> GMSSvc
    GMSSvc --> GMS1
    GMSSvc --> GMS2
    GMSSvc --> GMS3

    GMS1 --> MySQLPrimary
    GMS2 --> MySQLPrimary
    GMS3 --> MySQLPrimary

    GMS1 --> MySQLReplica
    GMS2 --> MySQLReplica
    GMS3 --> MySQLReplica

    GMS1 --> ES1
    GMS2 --> ES2
    GMS3 --> ES3

    GMS1 --> Kafka1
    GMS2 --> Kafka2
    GMS3 --> Kafka3

    Kafka1 --> Job1
    Kafka2 --> Job2

    Job1 --> MySQLPrimary
    Job2 --> MySQLPrimary

    Job1 --> ES1
    Job2 --> ES2

    Kafka1 --> Act1

    GMS1 -.->|metrics| Prometheus
    GMS2 -.->|metrics| Prometheus
    GMS3 -.->|metrics| Prometheus
    Prometheus --> Grafana

    FE1 -.->|logs| ELK
    GMS1 -.->|logs| ELK

    classDef ingressClass fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef appClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef dataClass fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef monitorClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px

    class IngressCtrl,Cert ingressClass
    class FE1,FE2,GMS1,GMS2,GMS3,Job1,Job2,Act1 appClass
    class MySQLPrimary,MySQLReplica,ES1,ES2,ES3,Kafka1,Kafka2,Kafka3,SR dataClass
    class Prometheus,Grafana,ELK monitorClass
```

**生产配置**：

- **Frontend**：2 副本 + HPA (2-5)
- **GMS**：3 副本 + HPA (3-10)
- **Jobs**：按 topic 分片，2-4 副本
- **MySQL**：RDS Multi-AZ，读写分离
- **Elasticsearch**：3 节点集群，16GB heap
- **Kafka**：3 broker，replication factor = 3

**资源配置**：

- **GMS Pod**：4 CPU, 8GB RAM
- **Frontend Pod**：2 CPU, 4GB RAM
- **Job Pod**：2 CPU, 4GB RAM

---

## 总结

这些架构图涵盖了 DataHub 的核心设计：

1. **系统架构**：用户 → 应用 → 存储层的三层结构
2. **容器架构**：微服务组件和职责划分
3. **数据流**：元数据导入和查询的完整路径
4. **数据模型**：实体和 Aspect 的关系
5. **模块依赖**：代码库的组织结构
6. **事件流**：异步处理和解耦设计
7. **部署架构**：生产环境的高可用配置

下一步阅读：[数据模型详解](./03-data-model.md)
