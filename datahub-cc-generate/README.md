# DataHub 项目完整技术文档

本目录包含 DataHub 项目的完整技术文档和代码 wiki，由 Claude Code 自动生成。

**生成日期**: 2025-10-30
**项目版本**: master 分支 (commit: a3275c37c1)

---

## 📚 文档结构

```
datahub-cc-generate/
├── tech-introduction/          # 核心技术介绍文档
│   ├── 01-system-overview.md
│   ├── 02-architecture-diagrams.md
│   ├── 03-data-model.md
│   ├── 04-api-guide.md
│   ├── 05-deployment-guide.md
│   └── 06-performance-tuning.md
└── wiki/                        # 模块级代码 Wiki
    ├── metadata-models/
    ├── metadata-service/
    ├── metadata-ingestion/
    └── datahub-web-react/
```

---

## 🎯 快速导航

### 新手入门

1. **了解 DataHub** → [01-system-overview.md](./tech-introduction/01-system-overview.md)
   - DataHub 是什么？
   - 核心特性
   - 支持的数据源

2. **理解架构** → [02-architecture-diagrams.md](./tech-introduction/02-architecture-diagrams.md)
   - 8 个 Mermaid 架构图
   - 系统组件交互
   - 数据流详解

3. **学习数据模型** → [03-data-model.md](./tech-introduction/03-data-model.md)
   - Entity、Aspect、URN 概念
   - 核心实体类型
   - 关系模型

### API 开发

4. **API 使用** → [04-api-guide.md](./tech-introduction/04-api-guide.md)
   - GraphQL API 完整指南
   - OpenAPI REST API
   - Kafka 事件 API
   - 认证和授权

### 运维部署

5. **生产部署** → [05-deployment-guide.md](./tech-introduction/05-deployment-guide.md)
   - Kubernetes 集群部署
   - 基础设施配置
   - 监控和告警
   - 灾难恢复

6. **性能优化** → [06-performance-tuning.md](./tech-introduction/06-performance-tuning.md)
   - Elasticsearch 优化
   - JVM 调优
   - GraphQL 性能
   - Kafka 配置

---

## 📖 模块 Wiki

### metadata-models (元数据模型)

**位置**: [wiki/metadata-models/](./wiki/metadata-models/)

**文档数量**: 13 个
**总大小**: 184 KB

**核心内容**:
- ✅ PDL Schema 定义和代码生成
- ✅ Entity Registry 配置详解
- ✅ 4 个核心实体文档 (Dataset, Dashboard, DataJob/Flow, User/Group)
- ✅ 4 个核心 Aspect 文档 (Ownership, Schema, Lineage, Tags/Terms)
- ✅ 自定义 Entity/Aspect 开发指南

**快速开始**: [metadata-models/INDEX.md](./wiki/metadata-models/INDEX.md)

---

### metadata-service (GMS 后端服务)

**位置**: [wiki/metadata-service/](./wiki/metadata-service/)

**文档数量**: 8 个
**总字数**: 57,500+

**核心内容**:
- ✅ GMS 架构和 13 个子模块
- ✅ 核心服务 (LineageService, OwnershipService, SearchService, TagService)
- ✅ API 层实现 (GraphQL, Rest.li, OpenAPI)
- ✅ 认证授权机制和 Policy Validator
- ✅ Aspect Validator 开发指南

**快速开始**: [metadata-service/README.md](./wiki/metadata-service/README.md)

---

### metadata-ingestion (Python 采集框架)

**位置**: [wiki/metadata-ingestion/](./wiki/metadata-ingestion/)

**文档数量**: 8 个
**代码行数**: 2,109+

**核心内容**:
- ✅ Python 采集框架架构
- ✅ 100+ 数据源支持
- ✅ Source Connector 完整开发指南 (含 900+ 行 MySQL 示例)
- ✅ Transformer 和 Emitter 详解
- ✅ Recipe 配置和 Stateful Ingestion
- ✅ 测试框架和最佳实践

**快速开始**: [metadata-ingestion/INDEX.md](./wiki/metadata-ingestion/INDEX.md)

---

### datahub-web-react (前端应用)

**位置**: [wiki/datahub-web-react/](./wiki/datahub-web-react/)

**文档数量**: 7 个
**文档行数**: 4,763

**核心内容**:
- ✅ React 应用架构 (React 17 + TypeScript + Apollo Client)
- ✅ 搜索功能详解 (过滤器、自动补全、保存视图)
- ✅ 血缘图可视化 (ReactFlow 集成、字段级血缘)
- ✅ GraphQL 集成完整指南
- ✅ Alchemy 组件库使用
- ✅ 状态管理和性能优化

**快速开始**: [datahub-web-react/INDEX.md](./wiki/datahub-web-react/INDEX.md)

---

## 📊 文档统计总览

| 分类 | 文档数量 | 文档大小 | 代码示例 |
|------|---------|---------|---------|
| **核心技术文档** | 6 个 | ~300 KB | 100+ |
| **metadata-models Wiki** | 13 个 | 184 KB | 50+ |
| **metadata-service Wiki** | 8 个 | ~200 KB | 123+ |
| **metadata-ingestion Wiki** | 8 个 | 76 KB | 50+ |
| **datahub-web-react Wiki** | 7 个 | ~150 KB | 80+ |
| **总计** | **42 个** | **~910 KB** | **400+** |

---

## 🎨 文档特色

### 1. 全面覆盖

- ✅ 从系统概览到代码实现的完整路径
- ✅ 架构图、数据模型、API、部署、性能优化
- ✅ 4 个核心模块的详细 Wiki

### 2. 实战导向

- ✅ 400+ 可运行的代码示例
- ✅ 真实场景和最佳实践
- ✅ 故障排查和优化技巧

### 3. 可视化

- ✅ 8 个核心 Mermaid 架构图
- ✅ 数据流图和组件交互图
- ✅ 表格和清单形式的知识点

### 4. 中文编写

- ✅ 全部使用中文撰写
- ✅ 技术术语准确
- ✅ 便于国内团队理解

---

## 🚀 使用建议

### 按角色阅读

#### 产品经理 / 业务人员
1. [01-system-overview.md](./tech-introduction/01-system-overview.md) - 了解 DataHub 能做什么
2. [02-architecture-diagrams.md](./tech-introduction/02-architecture-diagrams.md) - 理解系统架构
3. [03-data-model.md](./tech-introduction/03-data-model.md) - 理解数据组织方式

#### 后端工程师
1. [metadata-service/README.md](./wiki/metadata-service/README.md) - GMS 服务架构
2. [04-api-guide.md](./tech-introduction/04-api-guide.md) - API 开发
3. [metadata-models/](./wiki/metadata-models/) - 数据模型扩展
4. [06-performance-tuning.md](./tech-introduction/06-performance-tuning.md) - 性能优化

#### 数据工程师
1. [metadata-ingestion/](./wiki/metadata-ingestion/) - 采集框架
2. [metadata-ingestion/source-development.md](./wiki/metadata-ingestion/source-development.md) - 开发 Connector
3. [04-api-guide.md](./tech-introduction/04-api-guide.md) - API 集成

#### 前端工程师
1. [datahub-web-react/README.md](./wiki/datahub-web-react/README.md) - 前端架构
2. [datahub-web-react/graphql.md](./wiki/datahub-web-react/graphql.md) - GraphQL 集成
3. [datahub-web-react/components/alchemy.md](./wiki/datahub-web-react/components/alchemy.md) - UI 组件

#### DevOps / SRE
1. [05-deployment-guide.md](./tech-introduction/05-deployment-guide.md) - 部署架构
2. [06-performance-tuning.md](./tech-introduction/06-performance-tuning.md) - 性能调优
3. [02-architecture-diagrams.md](./tech-introduction/02-architecture-diagrams.md) - 生产部署架构图

### 按任务阅读

#### 我想部署 DataHub
1. [01-system-overview.md](./tech-introduction/01-system-overview.md#部署模式)
2. [05-deployment-guide.md](./tech-introduction/05-deployment-guide.md)

#### 我想开发自定义数据源
1. [metadata-ingestion/source-development.md](./wiki/metadata-ingestion/source-development.md)
2. [03-data-model.md](./tech-introduction/03-data-model.md)

#### 我想扩展数据模型
1. [metadata-models/development.md](./wiki/metadata-models/development.md)
2. [metadata-models/pdl-reference.md](./wiki/metadata-models/pdl-reference.md)

#### 我想优化性能
1. [06-performance-tuning.md](./tech-introduction/06-performance-tuning.md)
2. [05-deployment-guide.md](./tech-introduction/05-deployment-guide.md#性能优化)

#### 我想使用 API
1. [04-api-guide.md](./tech-introduction/04-api-guide.md)
2. [metadata-service/api/](./wiki/metadata-service/api/)

---

## 🛠️ 文档生成工具

本文档使用以下 AI 工具生成：

- **nia-oracle** - 代码库探索和架构分析
- **ultra-think** - 深度架构分析和优化建议
- **docs-architect** - 模块级 Wiki 文档生成
- **mermaid-expert** - 架构图绘制
- **api-documenter** - API 文档生成
- **terraform-specialist** - 部署架构文档

---

## 📝 文档维护

### 更新策略

- **主要版本更新**: 重新生成所有文档
- **小版本更新**: 仅更新变化的模块
- **补丁更新**: 手动更新相关章节

### 反馈渠道

如发现文档错误或需要补充内容，请：
1. 在项目 issue 中提出
2. 直接修改并提交 PR

---

## 🔗 相关资源

### 官方资源

- **官方文档**: https://datahubproject.io/docs
- **GitHub 仓库**: https://github.com/datahub-project/datahub
- **Demo 环境**: https://demo.datahub.io
- **Slack 社区**: https://datahubspace.slack.com

### 项目文档

- **CLAUDE.md**: 项目 AI 开发指南
- **README.md**: 项目主 README
- **docs/**: 官方文档目录

---

## 📄 许可证

本文档遵循 DataHub 项目的 Apache 2.0 许可证。

---

## 🙏 致谢

感谢 DataHub 开源社区和所有贡献者！

---

**文档版本**: v1.0.0
**最后更新**: 2025-10-30
**生成工具**: Claude Code + Multiple AI Agents
