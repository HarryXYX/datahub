# EntitySearchService - 搜索服务

## 概述

`EntitySearchService` 是 DataHub 搜索功能的核心接口,提供全文搜索、过滤、自动完成、浏览和聚合等功能。它抽象了底层搜索引擎(Elasticsearch/OpenSearch)的实现细节,为上层 API 提供统一的搜索能力。

**源文件位置**: `/metadata-service/services/src/main/java/com/linkedin/metadata/search/EntitySearchService.java`

---

## 接口设计

`EntitySearchService` 是一个**接口**,而不是具体实现类。默认实现为 `ESSearchService` (Elasticsearch) 或 `OpenSearchEntitySearchService` (OpenSearch)。

```java
public interface EntitySearchService {
    // 配置
    SearchServiceConfiguration getSearchServiceConfig();
    void configure();

    // 基本操作
    void clear(OperationContext opContext);
    long docCount(OperationContext opContext, String entityName, Filter filter);

    // 文档管理
    void upsertDocument(OperationContext opContext, String entityName, String document, String docId);
    void deleteDocument(OperationContext opContext, String entityName, String docId);
    void appendRunId(OperationContext opContext, Urn urn, String runId);

    // 搜索
    SearchResult search(...);
    SearchResult filter(...);
    ScrollResult fullTextScroll(...);
    ScrollResult structuredScroll(...);

    // 自动完成和聚合
    AutoCompleteResult autoComplete(...);
    Map<String, Long> aggregateByValue(...);

    // 浏览
    BrowseResult browse(...);
    BrowseResultV2 browseV2(...);
    List<String> getBrowsePaths(...);

    // 调试
    ExplainResponse explain(...);
    Map<Urn, Map<String, Object>> raw(...);
}
```

---

## 核心功能

### 1. 全文搜索 (search)

执行跨实体的全文搜索,支持过滤、排序和分页。

**方法签名**:
```java
@Nonnull
SearchResult search(
    @Nonnull OperationContext opContext,
    @Nonnull List<String> entityNames,    // 搜索的实体类型
    @Nonnull String input,                 // 搜索查询文本
    @Nullable Filter postFilters,          // 后置过滤器
    List<SortCriterion> sortCriteria,      // 排序条件
    int from,                              // 起始位置
    @Nullable Integer size                 // 返回数量
);
```

**使用示例**:
```java
// 搜索所有 Dataset
SearchResult result = searchService.search(
    opContext,
    List.of("dataset"),                    // 搜索 dataset 实体
    "user behavior",                       // 搜索关键词
    null,                                  // 无后置过滤
    List.of(),                             // 默认排序
    0,                                     // 从第一条开始
    10                                     // 返回 10 条
);

// 处理结果
for (SearchResultMetadata metadata : result.getEntities()) {
    System.out.println("URN: " + metadata.getUrn());
    System.out.println("Score: " + metadata.getScore());
}
```

**带过滤器的搜索**:
```java
// 构建过滤器: 只搜索 PROD 环境的 hive 表
Filter filter = QueryUtils.newFilter(
    Map.of(
        "platform", "hive",
        "origin", "PROD"
    )
);

SearchResult result = searchService.search(
    opContext,
    List.of("dataset"),
    "orders",
    filter,
    List.of(),
    0,
    20
);
```

**跨实体搜索**:
```java
// 同时搜索 Dataset、Chart 和 Dashboard
SearchResult result = searchService.search(
    opContext,
    List.of("dataset", "chart", "dashboard"),
    "revenue",
    null,
    List.of(),
    0,
    50
);
```

---

### 2. 结构化过滤 (filter)

不进行全文搜索,仅应用过滤条件获取结果。

**方法签名**:
```java
@Nonnull
SearchResult filter(
    @Nonnull OperationContext opContext,
    @Nonnull String entityName,
    @Nullable Filter filters,
    List<SortCriterion> sortCriteria,
    int from,
    @Nullable Integer size
);
```

**使用示例**:
```java
// 获取特定 Platform 的所有 Dataset
Filter platformFilter = QueryUtils.newFilter("platform", "snowflake");

SearchResult result = searchService.filter(
    opContext,
    "dataset",
    platformFilter,
    List.of(),
    0,
    100
);
```

---

### 3. 自动完成 (autoComplete)

为搜索框提供自动完成建议。

**方法签名**:
```java
@Nonnull
AutoCompleteResult autoComplete(
    @Nonnull OperationContext opContext,
    @Nonnull String entityName,
    @Nonnull String query,               // 用户输入的部分查询
    @Nullable String field,              // 建议的字段 (可选)
    @Nullable Filter requestParams,      // 上下文过滤
    @Nullable Integer limit
);
```

**使用示例**:
```java
// 自动完成 Dataset 名称
AutoCompleteResult result = searchService.autoComplete(
    opContext,
    "dataset",
    "user_",                  // 用户输入 "user_"
    "name",                   // 在 name 字段上自动完成
    null,
    10
);

// 显示建议
for (String suggestion : result.getSuggestions()) {
    System.out.println(suggestion);  // user_profiles, user_events, ...
}
```

**上下文感知的自动完成**:
```java
// 仅在特定 Platform 上自动完成
Filter contextFilter = QueryUtils.newFilter("platform", "bigquery");

AutoCompleteResult result = searchService.autoComplete(
    opContext,
    "dataset",
    "sales",
    "name",
    contextFilter,  // 仅建议 BigQuery 数据集
    10
);
```

---

### 4. 聚合 (aggregateByValue)

按字段值聚合,统计每个值的文档数量。

**方法签名**:
```java
@Nonnull
Map<String, Long> aggregateByValue(
    @Nonnull OperationContext opContext,
    @Nullable List<String> entityNames,
    @Nonnull String field,
    @Nullable Filter requestParams,
    @Nullable Integer limit
);
```

**使用示例**:
```java
// 统计每个 Platform 的 Dataset 数量
Map<String, Long> platformCounts = searchService.aggregateByValue(
    opContext,
    List.of("dataset"),
    "platform",
    null,
    100
);

// 输出: {hive=1500, snowflake=800, bigquery=650, ...}
platformCounts.forEach((platform, count) ->
    System.out.println(platform + ": " + count)
);
```

**多维度聚合**:
```java
// 统计每个 Tag 的使用次数
Map<String, Long> tagCounts = searchService.aggregateByValue(
    opContext,
    List.of("dataset"),
    "tags",
    null,
    50
);

// 统计每个 Domain 的资产数量
Map<String, Long> domainCounts = searchService.aggregateByValue(
    opContext,
    List.of("dataset", "dashboard", "chart"),  // 跨实体聚合
    "domains",
    null,
    20
);
```

---

### 5. 浏览 (browse / browseV2)

按层级结构浏览实体。

#### browse (V1)

```java
@Nonnull
BrowseResult browse(
    @Nonnull OperationContext opContext,
    @Nonnull String entityName,
    @Nonnull String path,           // 浏览路径,如 "/prod/hive"
    @Nullable Filter requestParams,
    int from,
    @Nullable Integer size
);
```

**使用示例**:
```java
// 浏览 /prod/hive 下的 Dataset
BrowseResult result = searchService.browse(
    opContext,
    "dataset",
    "/prod/hive",
    null,
    0,
    20
);

// 获取路径下的实体
for (BrowseResultEntity entity : result.getEntities()) {
    System.out.println(entity.getUrn());
}

// 获取子路径 (下一层目录)
for (BrowseResultGroup group : result.getGroups()) {
    System.out.println("Subfolder: " + group.getName());
}
```

#### browseV2 (推荐)

V2 版本支持搜索和浏览的混合模式:

```java
@Nonnull
BrowseResultV2 browseV2(
    @Nonnull OperationContext opContext,
    @Nonnull List<String> entityNames,
    @Nonnull String path,
    @Nullable Filter filter,
    @Nonnull String input,          // 搜索查询(可以为空)
    int start,
    @Nullable Integer count
);
```

**使用示例**:
```java
// 在特定路径下搜索
BrowseResultV2 result = searchService.browseV2(
    opContext,
    List.of("dataset"),
    "/prod/hive/warehouse",
    null,
    "orders",     // 在此路径下搜索 "orders"
    0,
    10
);
```

---

### 6. 滚动搜索 (fullTextScroll / structuredScroll)

用于检索大量结果,类似分页但更高效。

**方法签名**:
```java
@Nonnull
ScrollResult fullTextScroll(
    @Nonnull OperationContext opContext,
    @Nonnull List<String> entities,
    @Nonnull String input,
    @Nullable Filter postFilters,
    List<SortCriterion> sortCriteria,
    @Nullable String scrollId,      // 上一次的 scroll ID
    @Nullable String keepAlive,     // 保持时间,如 "5m"
    @Nullable Integer size,
    @Nonnull List<String> facets
);
```

**使用示例**:
```java
// 第一次调用
ScrollResult result = searchService.fullTextScroll(
    opContext,
    List.of("dataset"),
    "*",           // 匹配所有
    null,
    List.of(),
    null,          // 初始 scrollId 为 null
    "5m",          // 保持 5 分钟
    1000,
    List.of()
);

String scrollId = result.getScrollId();

// 后续调用
while (result.getNumEntities() > 0) {
    // 处理结果
    processResults(result.getEntities());

    // 继续滚动
    result = searchService.fullTextScroll(
        opContext,
        List.of("dataset"),
        "*",
        null,
        List.of(),
        scrollId,      // 使用前一次的 scrollId
        "5m",
        1000,
        List.of()
    );
    scrollId = result.getScrollId();
}
```

---

### 7. 文档管理

#### upsertDocument

插入或更新搜索文档:

```java
void upsertDocument(
    @Nonnull OperationContext opContext,
    @Nonnull String entityName,
    @Nonnull String document,    // JSON 格式的文档
    @Nonnull String docId        // 文档 ID (通常是 URN)
);
```

**使用示例**:
```java
String docJson = "{ \"urn\": \"...\", \"name\": \"...\", ... }";
searchService.upsertDocument(opContext, "dataset", docJson, urn.toString());
```

#### deleteDocument

删除搜索文档:

```java
void deleteDocument(
    @Nonnull OperationContext opContext,
    @Nonnull String entityName,
    @Nonnull String docId
);
```

**使用示例**:
```java
searchService.deleteDocument(opContext, "dataset", datasetUrn.toString());
```

#### appendRunId

为实体附加 runId,用于跟踪摄取批次:

```java
void appendRunId(
    @Nonnull OperationContext opContext,
    @Nonnull Urn urn,
    @Nullable String runId
);
```

---

## 搜索配置

### SearchServiceConfiguration

```java
@Data
public class SearchServiceConfiguration {
    private Boolean enableCache = true;
    private String cacheImplementation = "caffeine";
    private Integer maxCacheSize = 10000;
    private Integer batchSize = 100;
    private Integer maxTermBucketSize = 100;
    // ... 更多配置
}
```

### 配置示例 (application.yml)

```yaml
searchService:
  enableCache: true
  cacheImplementation: caffeine
  maxCacheSize: 10000
  batchSize: 100
  maxTermBucketSize: 100

  # Elasticsearch 特定配置
  exactMatch:
    exclusive: false
    withPrefix: true
    exactFactor: 10.0
    prefixFactor: 1.6
    caseSensitivityFactor: 0.7
    enableStructured: true
```

---

## 高级功能

### 1. Faceted Search (分面搜索)

在搜索时同时获取聚合数据:

```java
SearchResult result = searchService.search(
    opContext,
    List.of("dataset"),
    "user data",
    null,
    List.of(),
    0,
    20,
    List.of("platform", "origin", "tags")  // 请求这些字段的 facets
);

// 获取 facets
for (AggregationMetadata agg : result.getMetadata().getAggregations()) {
    System.out.println("Field: " + agg.getName());
    for (Map.Entry<String, Long> entry : agg.getAggregations().entrySet()) {
        System.out.println("  " + entry.getKey() + ": " + entry.getCount());
    }
}
```

### 2. Explain API (调试搜索评分)

了解为什么某个文档匹配或不匹配:

```java
ExplainResponse explain = searchService.explain(
    opContext,
    "user data",                // 查询
    "urn:li:dataset:(...)",     // 文档 ID
    "dataset",
    null,
    List.of(),
    null,
    null,
    10,
    List.of()
);

System.out.println("Matched: " + explain.isMatch());
System.out.println("Explanation: " + explain.getExplanation());
```

### 3. Raw Document Access

直接访问搜索索引中的原始文档:

```java
Set<Urn> urns = Set.of(dataset1, dataset2);
Map<Urn, Map<String, Object>> docs = searchService.raw(opContext, urns);

for (Map.Entry<Urn, Map<String, Object>> entry : docs.entrySet()) {
    System.out.println("URN: " + entry.getKey());
    System.out.println("Document: " + entry.getValue());
}
```

---

## 搜索查询语法

### Simple Query String

DataHub 使用 Elasticsearch 的 Simple Query String 语法:

```java
// 基本搜索
searchService.search(opContext, entities, "user", ...);

// 短语搜索
searchService.search(opContext, entities, "\"user behavior\"", ...);

// AND 操作
searchService.search(opContext, entities, "user + behavior", ...);

// OR 操作
searchService.search(opContext, entities, "user | profile", ...);

// NOT 操作
searchService.search(opContext, entities, "user -test", ...);

// 字段搜索
searchService.search(opContext, entities, "name:orders", ...);

// 通配符
searchService.search(opContext, entities, "user*", ...);

// 前缀搜索
searchService.search(opContext, entities, "user_", ...);
```

---

## Filter 构建

### QueryUtils 辅助类

```java
import com.linkedin.metadata.query.filter.Filter;
import com.linkedin.metadata.utils.QueryUtils;

// 简单过滤
Filter filter = QueryUtils.newFilter("platform", "hive");

// 多条件 AND
Filter filter = QueryUtils.newFilter(
    Map.of(
        "platform", "hive",
        "origin", "PROD"
    )
);

// OR 条件
ConjunctiveCriterion orCriterion = QueryUtils.newCriterion(...);
Filter filter = QueryUtils.newFilter(List.of(criterion1, criterion2));
```

---

## 性能优化

### 1. 使用缓存

启用搜索缓存可以显著提高重复查询的性能:

```yaml
searchService:
  enableCache: true
  maxCacheSize: 10000
```

### 2. 限制返回大小

避免一次性请求过多结果:

```java
// 不推荐
SearchResult huge = searchService.search(opContext, entities, query, null, List.of(), 0, 10000);

// 推荐:使用分页
for (int from = 0; from < totalCount; from += 100) {
    SearchResult page = searchService.search(opContext, entities, query, null, List.of(), from, 100);
    processPage(page);
}

// 或使用 Scroll API
```

### 3. 使用 Scroll API 处理大数据

当需要导出或处理大量结果时,使用 `fullTextScroll`:

```java
// Scroll 比分页更高效
ScrollResult result = searchService.fullTextScroll(...);
```

### 4. 限制 Facet 大小

```java
// 限制 facet 返回数量
Map<String, Long> topPlatforms = searchService.aggregateByValue(
    opContext,
    entities,
    "platform",
    null,
    10  // 只返回前 10 个
);
```

---

## 实现类

### ESSearchService (Elasticsearch)

**位置**: `metadata-io/src/main/java/com/linkedin/metadata/search/elasticsearch/ElasticSearchService.java`

使用 Elasticsearch Java Client 实现搜索功能。

### OpenSearchEntitySearchService

**位置**: 类似路径,用于 OpenSearch

---

## 与其他组件集成

### 1. GraphQL 集成

```java
@Component
public class SearchResolver implements DataFetcher<SearchResults> {
    private final EntitySearchService searchService;

    @Override
    public SearchResults get(DataFetchingEnvironment env) {
        String query = env.getArgument("query");
        List<String> types = env.getArgument("types");

        SearchResult result = searchService.search(
            opContext,
            types,
            query,
            null,
            List.of(),
            0,
            20
        );

        return convertToGraphQLResult(result);
    }
}
```

### 2. Rest.li 集成

```java
@RestLiCollection(name = "entities")
public class EntitiesResource extends CollectionResourceTemplate<String, Entity> {

    @Finder("search")
    public CollectionResult<Entity, SearchResultMetadata> search(
        @QueryParam("input") String query,
        @PagingContextParam PagingContext pagingContext
    ) {
        SearchResult result = searchService.search(
            opContext,
            List.of("dataset"),
            query,
            null,
            List.of(),
            pagingContext.getStart(),
            pagingContext.getCount()
        );

        return new CollectionResult<>(...);
    }
}
```

---

## 最佳实践

### 1. 选择合适的搜索方法

- **全文搜索** → `search()`
- **精确过滤** → `filter()`
- **大数据导出** → `fullTextScroll()`
- **自动完成** → `autoComplete()`
- **统计汇总** → `aggregateByValue()`

### 2. 合理使用过滤器

```java
// 先过滤后搜索
Filter preFilter = buildFilter(...);
SearchResult result = searchService.search(
    opContext,
    entities,
    query,
    preFilter,  // 减少搜索范围
    ...
);
```

### 3. 处理空结果

```java
SearchResult result = searchService.search(...);
if (result.getNumEntities() == 0) {
    // 处理无结果情况
    return emptyResponse();
}
```

### 4. 错误处理

```java
try {
    SearchResult result = searchService.search(...);
} catch (Exception e) {
    log.error("Search failed: {}", e.getMessage());
    // 返回友好的错误消息
}
```

---

## 相关资源

- [搜索查询语法](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-simple-query-string-query.html)
- [DataHub 搜索架构](https://datahubproject.io/docs/architecture/architecture/#search)
- [搜索配置文档](https://datahubproject.io/docs/how/search/)
