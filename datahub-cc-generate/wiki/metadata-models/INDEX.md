# Metadata Models 文档导航

## 📚 完整文档索引

本目录包含 DataHub `metadata-models` 模块的完整技术文档。

---

## 🎯 快速开始

### 新手入门路径

1. **[模块总览 (README.md)](README.md)** - 从这里开始
   - 了解模块职责和架构
   - 理解 PDL Schema 和代码生成流程
   - 查看常用命令

2. **[Entity Registry 配置 (entity-registry.md)](entity-registry.md)** - 核心配置
   - 理解实体注册机制
   - 学习如何配置实体和 Aspect

3. **[PDL 语法参考 (pdl-reference.md)](pdl-reference.md)** - 语法指南
   - 学习 PDL 语法
   - 理解注解和类型系统

### 开发者路径

1. **[开发指南 (development.md)](development.md)** - 实战指南
   - 添加自定义 Entity
   - 添加自定义 Aspect
   - 测试和验证

---

## 📖 核心文档

### 基础概念

| 文档 | 描述 | 适合人群 |
|-----|------|---------|
| [模块总览](README.md) | metadata-models 模块概述、目录结构、构建流程 | 所有人 |
| [Entity Registry](entity-registry.md) | entity-registry.yml 配置详解 | 架构师、开发者 |
| [PDL 语法参考](pdl-reference.md) | PDL 语言完整语法参考 | 开发者 |
| [开发指南](development.md) | 扩展元数据模型的实战指南 | 开发者 |

---

## 🏛️ 核心实体文档

深入了解 DataHub 的核心实体类型。

### 数据资产类实体

| 实体 | 文档 | 描述 |
|-----|------|------|
| **Dataset** | [dataset.md](entities/dataset.md) | 数据集（表、视图、流） |
| **Dashboard** | [dashboard.md](entities/dashboard.md) | 数据可视化仪表板 |

### 数据处理类实体

| 实体 | 文档 | 描述 |
|-----|------|------|
| **DataJob / DataFlow** | [data-jobs.md](entities/data-jobs.md) | 数据作业和流程（ETL/ELT Pipeline） |

### 组织类实体

| 实体 | 文档 | 描述 |
|-----|------|------|
| **CorpUser / CorpGroup** | [users-groups.md](entities/users-groups.md) | 企业用户和组织 |

---

## 🔧 核心 Aspect 文档

理解可复用的元数据片段。

| Aspect | 文档 | 描述 | 适用实体 |
|--------|------|------|---------|
| **Ownership** | [ownership.md](aspects/ownership.md) | 所有权信息 | 几乎所有实体 |
| **Schema Metadata** | [schema-metadata.md](aspects/schema-metadata.md) | Schema 结构定义 | Dataset |
| **Lineage** | [lineage.md](aspects/lineage.md) | 数据血缘关系 | Dataset, Dashboard, Chart |
| **Tags / Terms** | [tags-terms.md](aspects/tags-terms.md) | 标签和术语 | 几乎所有实体 |

---

## 🎓 学习路径

### 路径 1：理解元数据模型（1-2 小时）

```
README.md (30 分钟)
    ↓
entity-registry.md (30 分钟)
    ↓
entities/dataset.md (30 分钟)
    ↓
aspects/ownership.md (30 分钟)
```

**目标**：理解 DataHub 元数据模型的基本概念和架构。

### 路径 2：开发者实战（2-4 小时）

```
README.md (30 分钟)
    ↓
pdl-reference.md (1 小时)
    ↓
development.md (1 小时)
    ↓
实践：添加自定义 Entity (1-2 小时)
```

**目标**：能够独立扩展 DataHub 元数据模型。

### 路径 3：架构师深度学习（4-8 小时）

```
所有基础文档 (2 小时)
    ↓
所有实体文档 (2 小时)
    ↓
所有 Aspect 文档 (2 小时)
    ↓
实践：设计复杂的元数据模型 (2 小时)
```

**目标**：掌握元数据建模的最佳实践，能够设计企业级元数据架构。

---

## 🔍 按场景查找

### 场景 1：我想了解某个实体

查看 [核心实体文档](#核心实体文档) 部分，找到对应的实体文档。

### 场景 2：我想添加自定义元数据

1. 阅读 [开发指南](development.md)
2. 参考 [PDL 语法参考](pdl-reference.md)
3. 查看 [Entity Registry](entity-registry.md) 了解如何注册

### 场景 3：我想理解数据血缘

1. 阅读 [Lineage Aspect](aspects/lineage.md)
2. 参考 [Dataset Entity](entities/dataset.md) 中的血缘部分
3. 查看 [DataJob Entity](entities/data-jobs.md) 了解作业血缘

### 场景 4：我想配置搜索

1. 阅读 [PDL 语法参考](pdl-reference.md) 中的 @Searchable 注解
2. 参考现有实体的搜索配置示例

### 场景 5：我想理解所有权管理

1. 阅读 [Ownership Aspect](aspects/ownership.md)
2. 参考 [User/Group Entity](entities/users-groups.md)

---

## 📊 文档统计

| 类型 | 数量 | 说明 |
|-----|------|------|
| 核心文档 | 4 | 基础概念和指南 |
| 实体文档 | 4 | 核心实体详解 |
| Aspect 文档 | 4 | 核心 Aspect 详解 |
| **总计** | **12** | **完整的技术文档** |

---

## 🔗 相关资源

### 官方文档

- [DataHub 官方网站](https://datahubproject.io)
- [DataHub GitHub](https://github.com/datahub-project/datahub)
- [Pegasus 官方文档](https://linkedin.github.io/rest.li/pdl_schema)

### DataHub 其他模块文档

- metadata-service: GMS 后端服务
- datahub-web-react: 前端 UI
- metadata-ingestion: Python 摄取框架

### 社区资源

- [DataHub Slack](https://datahubspace.slack.com)
- [DataHub Town Halls](https://github.com/datahub-project/datahub/wiki)

---

## 💡 贡献指南

发现文档错误或需要改进？

1. 在 DataHub GitHub 仓库提交 Issue
2. 提交 Pull Request 改进文档
3. 在 Slack 社区反馈

---

## 📝 文档维护

- **创建日期**: 2025-10-30
- **最后更新**: 2025-10-30
- **维护者**: DataHub Community
- **版本**: 基于 DataHub master 分支

---

## 🚀 下一步

选择适合你的学习路径，开始探索 DataHub 元数据模型！

建议从 **[模块总览 (README.md)](README.md)** 开始。
