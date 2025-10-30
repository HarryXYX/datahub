# DataHub Metadata Ingestion Wiki 目录

本 Wiki 提供了 DataHub Metadata Ingestion 模块的完整文档，涵盖架构、开发指南和最佳实践。

## 📚 文档索引

### 入门指南

1. **[模块总览 (README.md)](./README.md)**
   - 核心架构与组件
   - 支持的数据源列表 (40+)
   - CLI 命令详解
   - Recipe 配置指南
   - Stateful Ingestion 详解
   - 快速开始教程

### 开发指南

2. **[Source Connector 开发指南 (source-development.md)](./source-development.md)**
   - Source 基类详解
   - 配置类设计 (Pydantic)
   - WorkUnit 生成与 Aspect 构建
   - URN 构建规范
   - 报告和错误处理
   - 测试框架 (单元测试、集成测试、Golden File)
   - 完整 MySQL Connector 示例
   - 最佳实践与性能优化

3. **[Transformer 开发指南 (transformers.md)](./transformers.md)**
   - Transformer 接口说明
   - 常用 Transformer 列表
   - 自定义 Transformer 开发
   - 配置示例

4. **[Emitter 说明文档 (emitters.md)](./emitters.md)**
   - RestEmitter 详解
   - KafkaEmitter 使用
   - FileEmitter 调试
   - 批量发送优化
   - 性能对比

5. **[完整开发环境指南 (development.md)](./development.md)**
   - 环境搭建
   - 开发工作流
   - 代码格式化与测试
   - 提交代码规范

### 数据源参考

6. **[Snowflake Connector (sources/snowflake.md)](./sources/snowflake.md)** (待补充)
   - 最复杂、最完整的 Connector 实现
   - 血缘提取、使用统计、Profiling
   - Snowflake 特定功能 (Shares、Streams、Tags)

7. **[MySQL Connector (sources/mysql.md)](./sources/mysql.md)** (待补充)
   - 基础数据库 Connector 实现
   - Schema 提取、外键血缘

8. **[BigQuery Connector (sources/bigquery.md)](./sources/bigquery.md)** (待补充)
   - 云数据仓库集成
   - 列级血缘、使用统计

9. **[Kafka Connector (sources/kafka.md)](./sources/kafka.md)** (待补充)
   - Schema Registry 集成
   - Topic 元数据提取

## 📂 目录结构

```
wiki/metadata-ingestion/
├── INDEX.md                    # 本文档
├── README.md                   # 模块总览
├── source-development.md       # Source 开发指南
├── transformers.md             # Transformer 指南
├── emitters.md                 # Emitter 说明
├── development.md              # 开发环境指南
└── sources/                    # 数据源详细文档
    ├── snowflake.md            (待补充)
    ├── mysql.md                (待补充)
    ├── bigquery.md             (待补充)
    └── kafka.md                (待补充)
```

## 🚀 快速导航

### 我想...

- **了解 Metadata Ingestion 架构** → [README.md](./README.md)
- **开发一个新的 Source Connector** → [source-development.md](./source-development.md)
- **转换元数据 (添加标签、所有者等)** → [transformers.md](./transformers.md)
- **优化采集性能** → [emitters.md](./emitters.md) + [README.md#性能优化](./README.md#性能优化)
- **设置开发环境** → [development.md](./development.md)
- **学习最佳实践** → [source-development.md#最佳实践](./source-development.md#最佳实践)

## 📖 阅读建议

### 对于初学者

1. 阅读 [README.md](./README.md) 了解整体架构
2. 运行快速开始示例
3. 查看 [source-development.md](./source-development.md) 的完整示例

### 对于开发者

1. 设置开发环境: [development.md](./development.md)
2. 学习 Source 开发: [source-development.md](./source-development.md)
3. 参考实际代码: `metadata-ingestion/src/datahub/ingestion/source/`
4. 运行测试并迭代

### 对于贡献者

1. Fork DataHub 仓库
2. 按照 [source-development.md](./source-development.md) 开发
3. 编写测试和文档
4. 提交 PR

## 🔧 相关资源

- **官方文档**: https://datahubproject.io/docs/metadata-ingestion/
- **源代码**: https://github.com/datahub-project/datahub/tree/master/metadata-ingestion
- **Issue 追踪**: https://github.com/datahub-project/datahub/issues
- **Slack 社区**: https://datahubspace.slack.com/

## 📝 贡献文档

如果你发现文档有误或需要改进，欢迎提交 PR 或在 Issue 中反馈。

## 📊 统计信息

- **总文档数**: 5 个核心文档
- **代码示例**: 50+ 个
- **涵盖主题**: 架构、开发、测试、部署、优化
- **最后更新**: 2025-10-30

---

**Happy Coding! 🎉**
