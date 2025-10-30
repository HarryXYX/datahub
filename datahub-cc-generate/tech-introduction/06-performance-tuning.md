# DataHub 性能优化指南

本文档提供 DataHub 平台的性能优化策略和最佳实践。

## 性能瓶颈识别

### 常见性能问题

| 症状 | 可能原因 | 优化方向 |
|------|---------|---------|
| 搜索响应慢 (>2s) | Elasticsearch 负载高、索引未优化 | ES 优化、查询优化 |
| GraphQL 查询超时 | N+1 查询、未使用 DataLoader | 批量加载、缓存 |
| 元数据导入慢 | Kafka Consumer Lag、批量写入未优化 | 消费者并发、批量操作 |
| UI 加载缓慢 | 前端 Bundle 过大、网络延迟 | 代码分割、CDN |
| 数据库连接耗尽 | 连接池配置不当、长事务 | 连接池调优 |

---

## 1. Elasticsearch 优化

### 1.1 索引设计优化

**分片策略**：

```json
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "refresh_interval": "30s",
    "index": {
      "max_result_window": 10000,
      "translog": {
        "durability": "async",
        "sync_interval": "5s"
      }
    }
  }
}
```

**建议**：
- **小规模** (<1M 文档): 1 主分片
- **中规模** (1M-10M): 3 主分片
- **大规模** (>10M): 5-10 主分片
- **副本数**: 生产环境至少 1 个副本

**索引模板优化**：

```json
{
  "index_patterns": ["datahubdatasetindex_v2*"],
  "settings": {
    "number_of_shards": 5,
    "number_of_replicas": 1,
    "codec": "best_compression",
    "index": {
      "mapping": {
        "total_fields": {
          "limit": 2000
        }
      }
    }
  },
  "mappings": {
    "dynamic_templates": [
      {
        "strings_as_keywords": {
          "match_mapping_type": "string",
          "mapping": {
            "type": "keyword",
            "ignore_above": 256
          }
        }
      }
    ]
  }
}
```

### 1.2 查询优化

**使用 search_after 代替 from/size**：

```python
# ❌ 慢查询（深度分页）
POST /datahubdatasetindex_v2/_search
{
  "from": 10000,
  "size": 100,
  "query": { "match_all": {} }
}

# ✅ 优化后（游标分页）
POST /datahubdatasetindex_v2/_search
{
  "size": 100,
  "query": { "match_all": {} },
  "search_after": [1577836800000, "urn:li:dataset:..."],
  "sort": [
    { "@timestamp": "asc" },
    { "urn": "asc" }
  ]
}
```

**批量查询（Multi-Search）**：

```python
# ✅ 使用 _msearch 批量查询
POST /_msearch
{"index": "datahubdatasetindex_v2"}
{"query": {"term": {"urn": "urn:li:dataset:1"}}}
{"index": "datahubdatasetindex_v2"}
{"query": {"term": {"urn": "urn:li:dataset:2"}}}
```

### 1.3 JVM 调优

**ES JVM 配置** (`jvm.options`):

```bash
# 堆大小设置为物理内存的 50%，最大 31GB
-Xms16g
-Xmx16g

# GC 配置（Java 17+）
-XX:+UseG1GC
-XX:G1ReservePercent=25
-XX:InitiatingHeapOccupancyPercent=30

# GC 日志
-Xlog:gc*,gc+age=trace,safepoint:file=/var/log/elasticsearch/gc.log:utctime,pid,tags:filecount=32,filesize=64m
```

**监控指标**：
- **Heap Usage**: 保持在 75% 以下
- **GC Duration**: Full GC < 1s
- **Field Data Cache**: < 10% heap

---

## 2. GMS (Spring Boot) 优化

### 2.1 JVM 配置

**GMS JVM 参数** (`application.yaml`):

```yaml
server:
  tomcat:
    threads:
      max: 200
      min-spare: 20
    max-connections: 8192
    accept-count: 100

spring:
  datasource:
    hikari:
      maximum-pool-size: 50
      minimum-idle: 10
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000

  kafka:
    producer:
      batch-size: 32768
      linger-ms: 100
      compression-type: lz4
      buffer-memory: 67108864
```

**JVM 启动参数**：

```bash
java -Xms8g -Xmx8g \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -XX:ParallelGCThreads=8 \
  -XX:ConcGCThreads=2 \
  -XX:InitiatingHeapOccupancyPercent=45 \
  -XX:+HeapDumpOnOutOfMemoryError \
  -XX:HeapDumpPath=/var/log/datahub-gms/heapdump.hprof \
  -XX:+UseStringDeduplication \
  -Dspring.profiles.active=prod \
  -jar datahub-gms.jar
```

### 2.2 连接池优化

**HikariCP 配置**：

```yaml
spring:
  datasource:
    hikari:
      # 连接池大小 = ((core_count * 2) + effective_spindle_count)
      maximum-pool-size: 50
      minimum-idle: 10

      # 连接超时
      connection-timeout: 30000

      # 空闲超时（10分钟）
      idle-timeout: 600000

      # 最大生命周期（30分钟）
      max-lifetime: 1800000

      # 连接测试查询
      connection-test-query: SELECT 1

      # 连接池性能优化
      leak-detection-threshold: 60000
      register-mbeans: true
```

**监控查询**：

```sql
-- 查看当前连接数
SHOW PROCESSLIST;

-- 查看慢查询
SELECT * FROM mysql.slow_log ORDER BY query_time DESC LIMIT 10;
```

### 2.3 缓存配置

**Caffeine 缓存配置**：

```java
@Configuration
public class CacheConfig {

    @Bean
    public Cache<String, Entity> entityCache() {
        return Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterWrite(10, TimeUnit.MINUTES)
            .recordStats()
            .build();
    }

    @Bean
    public Cache<String, AspectValue> aspectCache() {
        return Caffeine.newBuilder()
            .maximumSize(50_000)
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .recordStats()
            .build();
    }
}
```

---

## 3. GraphQL 性能优化

### 3.1 DataLoader 批量加载

**N+1 问题示例**：

```graphql
# ❌ 会触发 100 次数据库查询
query {
  search(input: {type: DATASET, query: "*"}) {
    results {
      entity {
        ... on Dataset {
          ownership {  # 每个 Dataset 一次查询
            owners {
              owner {
                ... on CorpUser {
                  username
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**DataLoader 解决方案**：

```java
@Component
public class OwnershipDataLoader implements DataLoader<String, Ownership> {

    @Autowired
    private EntityService entityService;

    public CompletableFuture<Ownership> load(String urn) {
        return CompletableFuture.supplyAsync(() ->
            entityService.getLatestAspect(urn, "ownership")
        );
    }

    // 批量加载实现
    public CompletableFuture<List<Ownership>> batchLoad(List<String> urns) {
        // 单次数据库查询获取所有 Ownership
        Map<String, Ownership> results = entityService.getLatestAspects(
            urns, Collections.singleton("ownership")
        );

        return CompletableFuture.completedFuture(
            urns.stream()
                .map(results::get)
                .collect(Collectors.toList())
        );
    }
}
```

### 3.2 查询复杂度限制

**限制查询深度**：

```java
@Configuration
public class GraphQLConfig {

    @Bean
    public GraphQL graphQL(GraphQLSchema schema) {
        return GraphQL.newGraphQL(schema)
            .instrumentation(new MaxQueryDepthInstrumentation(10))
            .instrumentation(new MaxQueryComplexityInstrumentation(1000))
            .build();
    }
}
```

### 3.3 持久化查询

**使用预定义查询**（APQ - Automatic Persisted Queries）：

```javascript
// 客户端发送查询 hash
const queryHash = sha256(queryString);
client.query({
  extensions: {
    persistedQuery: {
      version: 1,
      sha256Hash: queryHash
    }
  }
});
```

---

## 4. Kafka 性能优化

### 4.1 Producer 配置

**高吞吐量配置**：

```yaml
spring:
  kafka:
    producer:
      # 批量大小（32KB）
      batch-size: 32768

      # 延迟发送（等待批量累积）
      linger-ms: 100

      # 压缩算法
      compression-type: lz4

      # 发送缓冲区（64MB）
      buffer-memory: 67108864

      # 确认级别（生产环境使用 all）
      acks: all

      # 重试次数
      retries: 3

      # 幂等性（避免重复）
      enable-idempotence: true
```

**Python Producer 配置**：

```python
from confluent_kafka import Producer

config = {
    'bootstrap.servers': 'kafka:9092',
    'batch.size': 32768,
    'linger.ms': 100,
    'compression.type': 'lz4',
    'acks': 'all',
    'max.in.flight.requests.per.connection': 5,
    'enable.idempotence': True
}

producer = Producer(config)
```

### 4.2 Consumer 配置

**并发消费优化**：

```yaml
spring:
  kafka:
    consumer:
      # 每次拉取的最大记录数
      max-poll-records: 500

      # 拉取最大字节数（50MB）
      fetch-max-bytes: 52428800

      # 单分区拉取最大字节数（10MB）
      max-partition-fetch-bytes: 10485760

      # 心跳间隔
      heartbeat-interval: 3000

      # 会话超时
      session-timeout: 30000

      # 自动提交
      enable-auto-commit: false

    listener:
      # 并发数（根据 partition 数调整）
      concurrency: 10

      # 批量监听
      type: batch

      # 手动提交
      ack-mode: manual
```

**MCE Consumer 优化示例**：

```java
@KafkaListener(
    topics = "MetadataChangeEvent_v4",
    groupId = "datahub-mce-consumer",
    concurrency = "10",
    containerFactory = "batchFactory"
)
public void consume(List<ConsumerRecord<String, GenericRecord>> records,
                   Acknowledgment ack) {
    try {
        // 批量处理
        List<MetadataChangeEvent> events = records.stream()
            .map(this::deserialize)
            .collect(Collectors.toList());

        entityService.ingestProposals(events);

        // 手动提交
        ack.acknowledge();
    } catch (Exception e) {
        log.error("Failed to process batch", e);
        // 不提交，等待重试
    }
}
```

### 4.3 Topic 配置

**生产环境 Topic 配置**：

```bash
kafka-topics.sh --create \
  --bootstrap-server kafka:9092 \
  --topic MetadataChangeEvent_v4 \
  --partitions 10 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --config compression.type=lz4 \
  --config min.insync.replicas=2 \
  --config max.message.bytes=10485760
```

---

## 5. MySQL 优化

### 5.1 索引优化

**metadata_aspect_v2 表索引**：

```sql
-- 主键索引
PRIMARY KEY (urn, aspect, version)

-- URN 查询索引
CREATE INDEX idx_urn ON metadata_aspect_v2(urn);

-- Aspect 查询索引
CREATE INDEX idx_aspect ON metadata_aspect_v2(aspect);

-- 复合索引（最常用）
CREATE INDEX idx_urn_aspect ON metadata_aspect_v2(urn, aspect);

-- 时间范围查询索引
CREATE INDEX idx_createdon ON metadata_aspect_v2(createdon);
```

**索引使用分析**：

```sql
-- 查看索引使用情况
SELECT
    table_name,
    index_name,
    cardinality,
    seq_in_index
FROM information_schema.statistics
WHERE table_schema = 'datahub'
  AND table_name = 'metadata_aspect_v2';

-- 查看未使用的索引
SELECT * FROM sys.schema_unused_indexes
WHERE object_schema = 'datahub';
```

### 5.2 查询优化

**批量获取 Aspects**：

```java
// ❌ 慢查询（N 次查询）
for (String urn : urns) {
    Aspect aspect = jdbcTemplate.queryForObject(
        "SELECT metadata FROM metadata_aspect_v2 WHERE urn = ? AND aspect = ?",
        new Object[]{urn, aspectName},
        String.class
    );
}

// ✅ 优化后（1 次查询）
String sql = "SELECT urn, metadata FROM metadata_aspect_v2 " +
             "WHERE urn IN (:urns) AND aspect = :aspect";

Map<String, Object> params = new HashMap<>();
params.put("urns", urns);
params.put("aspect", aspectName);

List<Aspect> aspects = namedParameterJdbcTemplate.query(
    sql, params, aspectRowMapper
);
```

### 5.3 读写分离

**Spring Boot 读写分离配置**：

```yaml
spring:
  datasource:
    # 主库（写）
    primary:
      url: jdbc:mysql://mysql-primary:3306/datahub
      username: datahub
      password: ${MYSQL_PASSWORD}
      hikari:
        maximum-pool-size: 30

    # 从库（读）
    replica:
      url: jdbc:mysql://mysql-replica:3306/datahub
      username: datahub_readonly
      password: ${MYSQL_PASSWORD}
      hikari:
        maximum-pool-size: 50
```

**动态数据源路由**：

```java
@Configuration
public class DataSourceConfig {

    @Bean
    public DataSource routingDataSource(
        @Qualifier("primaryDataSource") DataSource primary,
        @Qualifier("replicaDataSource") DataSource replica
    ) {
        Map<Object, Object> dataSources = new HashMap<>();
        dataSources.put("primary", primary);
        dataSources.put("replica", replica);

        RoutingDataSource routing = new RoutingDataSource();
        routing.setDefaultTargetDataSource(primary);
        routing.setTargetDataSources(dataSources);
        return routing;
    }
}

// 使用注解控制读写分离
@Transactional(readOnly = true)  // 使用从库
public Entity getEntity(String urn) {
    return entityRepository.findByUrn(urn);
}

@Transactional  // 使用主库
public void updateEntity(Entity entity) {
    entityRepository.save(entity);
}
```

---

## 6. 前端性能优化

### 6.1 代码分割

**React 懒加载**：

```typescript
// ❌ 全部打包在一起
import LineageExplorer from './LineageExplorer';
import SchemaViewer from './SchemaViewer';

// ✅ 按需加载
const LineageExplorer = React.lazy(() => import('./LineageExplorer'));
const SchemaViewer = React.lazy(() => import('./SchemaViewer'));

function EntityPage() {
  return (
    <Suspense fallback={<Spin />}>
      <Switch>
        <Route path="/lineage" component={LineageExplorer} />
        <Route path="/schema" component={SchemaViewer} />
      </Switch>
    </Suspense>
  );
}
```

### 6.2 GraphQL 查询优化

**使用 Fragment 减少重复**：

```graphql
fragment DatasetFields on Dataset {
  urn
  name
  platform {
    name
  }
  properties {
    description
  }
}

query GetDatasets {
  search(input: {type: DATASET, query: "*"}) {
    results {
      entity {
        ...DatasetFields
      }
    }
  }
}
```

**Apollo Client 缓存配置**：

```typescript
const client = new ApolloClient({
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          search: {
            keyArgs: ['input', ['type', 'query']],
            merge(existing, incoming) {
              return incoming;
            }
          }
        }
      }
    }
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
      nextFetchPolicy: 'cache-first'
    }
  }
});
```

### 6.3 资源优化

**Vite 构建优化** (`vite.config.ts`):

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'antd': ['antd'],
          'apollo': ['@apollo/client'],
          'reactflow': ['reactflow']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});
```

---

## 7. 监控和诊断

### 7.1 关键性能指标

**GMS 指标**：

| 指标 | 目标值 | 告警阈值 |
|------|--------|---------|
| GraphQL 查询延迟 (P95) | < 500ms | > 2s |
| Rest.li API 延迟 (P95) | < 200ms | > 1s |
| MySQL 连接池使用率 | < 80% | > 90% |
| JVM Heap 使用率 | < 75% | > 85% |
| GC 停顿时间 (P99) | < 100ms | > 500ms |

**Elasticsearch 指标**：

| 指标 | 目标值 | 告警阈值 |
|------|--------|---------|
| 搜索延迟 (P95) | < 500ms | > 2s |
| 索引速率 | > 1000 docs/s | < 100 docs/s |
| Heap 使用率 | < 75% | > 85% |
| CPU 使用率 | < 70% | > 90% |

**Kafka 指标**：

| 指标 | 目标值 | 告警阈值 |
|------|--------|---------|
| Consumer Lag | < 1000 | > 10000 |
| Producer 失败率 | < 0.1% | > 1% |
| 网络带宽使用率 | < 70% | > 90% |

### 7.2 性能诊断工具

**JVM Profiling**：

```bash
# 使用 JFR 记录性能数据
java -XX:StartFlightRecording=duration=60s,filename=recording.jfr -jar datahub-gms.jar

# 分析 JFR 文件
jfr print --events jdk.ObjectAllocationSample recording.jfr
```

**MySQL 慢查询分析**：

```sql
-- 启用慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;

-- 分析慢查询
SELECT
    query_time,
    lock_time,
    rows_sent,
    rows_examined,
    sql_text
FROM mysql.slow_log
ORDER BY query_time DESC
LIMIT 10;
```

**Elasticsearch 诊断**：

```bash
# 查看集群健康
curl -X GET "localhost:9200/_cluster/health?pretty"

# 查看热点线程
curl -X GET "localhost:9200/_nodes/hot_threads"

# 查看慢查询日志
grep "took_millis" /var/log/elasticsearch/datahub-cluster.log | sort -k9 -n | tail -20
```

---

## 8. 性能测试

### 8.1 负载测试

**JMeter 测试计划**：

```xml
<TestPlan>
  <ThreadGroup threads="100" rampup="60" duration="600">
    <HTTPSampler
      domain="datahub.company.com"
      path="/api/graphql"
      method="POST">
      <body>
        {
          "query": "query { search(input: {type: DATASET, query: \"*\"}) { results { entity { urn } } } }"
        }
      </body>
    </HTTPSampler>
  </ThreadGroup>
</TestPlan>
```

**K6 负载测试脚本**：

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // 爬坡到 100 用户
    { duration: '5m', target: 100 },  // 保持 100 用户
    { duration: '2m', target: 0 },    // 降到 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% 请求 < 2s
    http_req_failed: ['rate<0.01'],     // 错误率 < 1%
  },
};

export default function () {
  const query = {
    query: `
      query {
        search(input: {type: DATASET, query: "*", start: 0, count: 10}) {
          results {
            entity {
              urn
              type
            }
          }
        }
      }
    `
  };

  const res = http.post(
    'https://datahub.company.com/api/graphql',
    JSON.stringify(query),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${__ENV.TOKEN}`
      }
    }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
```

### 8.2 基准测试

**数据库性能基准**：

```bash
# Sysbench MySQL 测试
sysbench oltp_read_write \
  --mysql-host=mysql \
  --mysql-user=datahub \
  --mysql-password=password \
  --mysql-db=datahub \
  --tables=10 \
  --table-size=100000 \
  --threads=16 \
  --time=300 \
  run
```

**Elasticsearch 基准**：

```bash
# Rally 基准测试
esrally race \
  --track=http_logs \
  --target-hosts=elasticsearch:9200 \
  --pipeline=benchmark-only
```

---

## 9. 优化检查清单

### 部署前检查

- [ ] JVM 堆大小配置合理（8GB-16GB）
- [ ] 数据库连接池大小适当（30-50）
- [ ] Kafka 分区数 >= Consumer 并发数
- [ ] Elasticsearch 分片数合理（3-5）
- [ ] 启用 GC 日志和监控
- [ ] 配置读写分离（如果适用）

### 运行时监控

- [ ] GraphQL 查询延迟 P95 < 500ms
- [ ] Kafka Consumer Lag < 1000
- [ ] MySQL 慢查询 < 10 per minute
- [ ] ES Heap 使用率 < 75%
- [ ] JVM GC 停顿时间 < 100ms

### 定期优化

- [ ] 每月审查 MySQL 慢查询日志
- [ ] 每季度优化 ES 索引模板
- [ ] 每半年进行负载测试
- [ ] 持续监控缓存命中率

---

## 10. 常见问题排查

### Q1: GraphQL 查询突然变慢

**排查步骤**：
1. 检查是否有 N+1 查询：查看日志中的数据库查询次数
2. 检查 DataLoader 是否生效：查看批量查询日志
3. 检查数据库连接池：是否耗尽连接
4. 检查 ES 健康状态：`curl localhost:9200/_cluster/health`

### Q2: Kafka Consumer Lag 持续增长

**排查步骤**：
1. 检查 Consumer 并发数：是否小于分区数
2. 检查处理速度：单条消息处理时间
3. 检查数据库写入速度：是否有慢查询
4. 检查 ES 索引速度：是否有索引压力

### Q3: 前端加载缓慢

**排查步骤**：
1. 检查 Bundle 大小：`npm run build --analyze`
2. 检查网络请求：Chrome DevTools Network
3. 检查 GraphQL 查询：是否请求了不必要的字段
4. 检查缓存策略：Apollo Client 缓存是否生效

---

## 相关资源

- [Elasticsearch 性能调优指南](https://www.elastic.co/guide/en/elasticsearch/reference/current/tune-for-indexing-speed.html)
- [Spring Boot 性能优化](https://docs.spring.io/spring-boot/reference/actuator/metrics.html)
- [Kafka 性能调优](https://kafka.apache.org/documentation/#producerconfigs)
- [React 性能优化](https://react.dev/learn/render-and-commit)

---

**最后更新**: 2025-10-30
