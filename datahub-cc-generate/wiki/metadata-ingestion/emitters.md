# Emitter 说明文档

Emitter 负责将元数据发送到 DataHub 或其他目标系统。

## RestEmitter

### 配置

```yaml
sink:
  type: datahub-rest
  config:
    server: "http://localhost:8080"
    token: "${DATAHUB_TOKEN}"

    # 模式选择
    mode: ASYNC_BATCH  # SYNC, ASYNC, ASYNC_BATCH

    # 并发配置
    max_threads: 4
    max_per_batch: 100
    max_pending_requests: 2000
```

### 模式说明

| 模式 | 特点 | 适用场景 |
|------|------|----------|
| SYNC | 同步发送，阻塞等待响应 | 调试、小规模数据 |
| ASYNC | 异步发送，非阻塞 | 中等规模数据 |
| ASYNC_BATCH | 批量异步发送 (推荐) | 大规模数据、性能优先 |

### 批量发送优化

ASYNC_BATCH 模式使用 `/ingestProposalBatch` 端点：

```python
# 批量发送最多 100 个 MCP
max_per_batch: 100

# 并发 4 个线程
max_threads: 4

# 最多 2000 个待处理请求
max_pending_requests: 2000
```

**性能提升**: 相比 ASYNC 模式，ASYNC_BATCH 可提升 3-5x 吞吐量。

## KafkaEmitter

### 配置

```yaml
sink:
  type: datahub-kafka
  config:
    connection:
      bootstrap: "localhost:9092"
      schema_registry_url: "http://localhost:8081"
```

### 适用场景

- 需要与 Kafka 生态集成
- 高吞吐量实时采集
- 需要事件溯源

## FileEmitter

用于调试和测试：

```yaml
sink:
  type: file
  config:
    filename: "output.json"
```

## 下一步

- [完整开发指南](./development.md)
- [Source Connector 开发](./source-development.md)
