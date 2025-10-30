# DataHub Source Connector 详细文档

本目录包含各个数据源 Connector 的详细文档。

## 已规划文档

以下文档将在后续版本中补充：

### 1. Snowflake Connector (snowflake.md)

**内容规划**:
- 架构详解
- 配置完全参考
- 血缘提取机制 (Table-level 和 Column-level)
- 使用统计采集 (Usage Stats)
- 数据 Profiling
- Snowflake 特定功能:
  - Shares (跨账户数据共享)
  - Streams (CDC 流)
  - Tags (原生标签支持)
  - Assertions (数据质量断言)
- 性能优化技巧
- 故障排查指南

**参考代码**:
- `metadata-ingestion/src/datahub/ingestion/source/snowflake/`

### 2. MySQL Connector (mysql.md)

**内容规划**:
- 基础配置
- Schema 提取
- 外键血缘
- 视图依赖分析
- Profiling 配置
- 常见问题

**参考代码**:
- `metadata-ingestion/src/datahub/ingestion/source/sql/mysql.py`

### 3. BigQuery Connector (bigquery.md)

**内容规划**:
- GCP 认证配置
- 项目和数据集发现
- 列级血缘 (基于 INFORMATION_SCHEMA)
- 使用统计 (基于审计日志)
- 分区表处理
- 成本优化

**参考代码**:
- `metadata-ingestion/src/datahub/ingestion/source/bigquery_v2/`

### 4. Kafka Connector (kafka.md)

**内容规划**:
- Schema Registry 集成
- Topic 元数据提取
- Consumer Group 信息
- Avro/Protobuf/JSON Schema 支持
- 安全配置 (SASL/SSL)

**参考代码**:
- `metadata-ingestion/src/datahub/ingestion/source/kafka/`

## 如何使用

1. 选择你的数据源
2. 阅读对应的详细文档
3. 参考配置示例
4. 查看源代码了解实现细节

## 贡献文档

如果你熟悉某个 Connector，欢迎贡献文档！

参考 [source-development.md](../source-development.md) 了解如何编写 Source 文档。

## 快速查找

| 数据源 | 文档 | 状态 |
|--------|------|------|
| Snowflake | snowflake.md | 📝 待补充 |
| MySQL | mysql.md | 📝 待补充 |
| BigQuery | bigquery.md | 📝 待补充 |
| Kafka | kafka.md | 📝 待补充 |
| PostgreSQL | - | 📝 待补充 |
| Redshift | - | 📝 待补充 |
| Databricks | - | 📝 待补充 |
| Looker | - | 📝 待补充 |
| Tableau | - | 📝 待补充 |

完整的数据源列表参见 [README.md](../README.md#支持的数据源)。
