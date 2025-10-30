# LineageService - 血缘关系服务

## 概述

`LineageService` 是 DataHub 中负责管理数据血缘关系的核心服务。它提供了添加、删除和更新实体之间血缘关系的能力,支持 Dataset、Chart、Dashboard 和 DataJob 等多种实体类型。

**源文件位置**: `/metadata-service/services/src/main/java/com/linkedin/metadata/service/LineageService.java`

---

## 核心功能

### 1. Dataset 血缘管理

管理 Dataset 之间的上下游关系,通过 `UpstreamLineage` Aspect 实现。

**方法签名**:
```java
public void updateDatasetLineage(
    @Nonnull OperationContext opContext,
    @Nonnull Urn downstreamUrn,
    @Nonnull List<Urn> upstreamUrnsToAdd,
    @Nonnull List<Urn> upstreamUrnsToRemove,
    @Nonnull Urn actor) throws Exception
```

**功能说明**:
- 为一个 Dataset 添加或移除上游 Dataset
- 验证所有 URN 都是 Dataset 类型且存在
- 创建 `UpstreamLineage` Aspect 的 MetadataChangeProposal (MCP)
- 设置血缘类型为 `TRANSFORMED`
- 记录操作者和时间戳

**使用示例**:
```java
Urn downstreamDataset = UrnUtils.getUrn("urn:li:dataset:(urn:li:dataPlatform:hive,db.table1,PROD)");
List<Urn> upstreamsToAdd = List.of(
    UrnUtils.getUrn("urn:li:dataset:(urn:li:dataPlatform:hive,db.table2,PROD)")
);
List<Urn> upstreamsToRemove = List.of();
Urn actor = UrnUtils.getUrn("urn:li:corpuser:datahub");

lineageService.updateDatasetLineage(
    opContext,
    downstreamDataset,
    upstreamsToAdd,
    upstreamsToRemove,
    actor
);
```

---

### 2. Chart 血缘管理

管理 Chart 与 Dataset/Chart 之间的血缘关系,通过 `ChartInfo` Aspect 的 `inputEdges` 字段实现。

**方法签名**:
```java
public void updateChartLineage(
    @Nonnull OperationContext opContext,
    @Nonnull Urn downstreamUrn,
    @Nonnull List<Urn> upstreamUrnsToAdd,
    @Nonnull List<Urn> upstreamUrnsToRemove,
    @Nonnull Urn actor) throws Exception
```

**功能说明**:
- Chart 可以指向 Dataset 或其他 Chart
- 使用 `Edge` 对象表示血缘关系
- 同时更新 `inputEdges` (推荐) 和 `inputs` (已废弃) 字段

**Aspect 结构**:
```java
ChartInfo {
  inputEdges: [Edge]  // 推荐使用
  inputs: [ChartDataSourceType]  // 已废弃,但为了兼容性仍保留
}

Edge {
  sourceUrn: Urn          // 下游 (Chart)
  destinationUrn: Urn     // 上游 (Dataset/Chart)
  created: AuditStamp
  lastModified: AuditStamp
  properties: Map<String, String>
}
```

---

### 3. Dashboard 血缘管理

管理 Dashboard 与 Chart/Dataset 之间的血缘关系,通过 `DashboardInfo` Aspect 实现。

**方法签名**:
```java
public void updateDashboardLineage(
    @Nonnull OperationContext opContext,
    @Nonnull Urn downstreamUrn,
    @Nonnull List<Urn> upstreamUrnsToAdd,
    @Nonnull List<Urn> upstreamUrnsToRemove,
    @Nonnull Urn actor) throws Exception
```

**功能说明**:
- Dashboard 可以指向 Chart 和 Dataset
- 分别管理 `chartEdges`/`charts` 和 `datasetEdges`/`datasets` 字段
- 自动根据 URN 类型分类处理

**Aspect 结构**:
```java
DashboardInfo {
  chartEdges: [Edge]      // Chart 血缘 (推荐)
  charts: [ChartUrn]      // Chart 血缘 (已废弃)
  datasetEdges: [Edge]    // Dataset 血缘 (推荐)
  datasets: [DatasetUrn]  // Dataset 血缘 (已废弃)
}
```

---

### 4. DataJob 血缘管理

DataJob 支持双向血缘:上游(输入)和下游(输出)。

#### 4.1 上游血缘

**方法签名**:
```java
public void updateDataJobUpstreamLineage(
    @Nonnull OperationContext opContext,
    @Nonnull Urn downstreamUrn,
    @Nonnull List<Urn> upstreamUrnsToAdd,
    @Nonnull List<Urn> upstreamUrnsToRemove,
    @Nonnull Urn actor) throws Exception
```

**功能说明**:
- DataJob 可以指向 Dataset 和其他 DataJob
- 使用 `DataJobInputOutput` Aspect
- 分别管理 `inputDatasetEdges`/`inputDatasets` 和 `inputDatajobEdges`/`inputDatajobs`

#### 4.2 下游血缘

**方法签名**:
```java
public void updateDataJobDownstreamLineage(
    @Nonnull OperationContext opContext,
    @Nonnull Urn dataJobUrn,
    @Nonnull List<Urn> downstreamUrnsToAdd,
    @Nonnull List<Urn> downstreamUrnsToRemove,
    @Nonnull Urn actor) throws Exception
```

**功能说明**:
- 管理 DataJob 的输出 Dataset
- 使用 `outputDatasetEdges` 和 `outputDatasets` 字段

**Aspect 结构**:
```java
DataJobInputOutput {
  // 输入
  inputDatasetEdges: [Edge]
  inputDatasets: [DatasetUrn]  // 已废弃
  inputDatajobEdges: [Edge]
  inputDatajobs: [DataJobUrn]  // 已废弃

  // 输出
  outputDatasetEdges: [Edge]
  outputDatasets: [DatasetUrn]  // 已废弃
}
```

---

## 核心设计

### 验证机制

所有血缘操作都包含严格的验证:

1. **URN 类型验证**: 确保 URN 类型符合预期
   ```java
   public void validateDatasetUrns(OperationContext opContext, List<Urn> urns) throws Exception {
     for (Urn urn : urns) {
       if (!urn.getEntityType().equals(Constants.DATASET_ENTITY_NAME)) {
         throw new IllegalArgumentException("Expected dataset URN");
       }
       validateUrnExists(opContext, urn);
     }
   }
   ```

2. **URN 存在性验证**: 确保引用的实体存在
   ```java
   public void validateUrnExists(OperationContext opContext, Urn urn) throws Exception {
     if (!_entityClient.exists(opContext, urn)) {
       throw new IllegalArgumentException("URN does not exist: " + urn);
     }
   }
   ```

3. **特定实体类型验证**:
   - `validateDatasetUrns()`: 仅允许 Dataset
   - `validateChartUpstreamUrns()`: 允许 Dataset 和 Chart
   - `validateDashboardUpstreamUrns()`: 允许 Dataset 和 Chart
   - `validateDataJobUpstreamUrns()`: 允许 Dataset 和 DataJob

### 去重机制

添加血缘时自动跳过已存在的关系:

```java
final List<Urn> upstreamsToAdd = new ArrayList<>();
for (Urn upstreamUrn : upstreamUrnsToAdd) {
  if (upstreams.stream().anyMatch(upstream -> upstream.getDataset().equals(upstreamUrn))) {
    continue;  // 已存在,跳过
  }
  upstreamsToAdd.add(upstreamUrn);
}
```

### Edge 属性

所有 Edge 都包含以下属性:

```java
Edge {
  sourceUrn: Urn              // 源(下游)
  destinationUrn: Urn         // 目标(上游)
  created: AuditStamp         // 创建时间和操作者
  lastModified: AuditStamp    // 最后修改时间
  properties: {
    "source": "UI"            // 标识来源
  }
}
```

### Aspect 版本兼容性

为了保持向后兼容,服务同时维护两套字段:

- **新字段** (推荐): `*Edges` - 使用 `Edge` 对象,包含完整元数据
- **旧字段** (已废弃): 简单的 URN 数组

**示例**:
```java
// 新方式 (推荐)
chartInfo.setInputEdges(inputEdges);

// 旧方式 (保留兼容性)
chartInfo.setInputs(inputs);
```

---

## 使用场景

### 场景 1: 构建 ETL 流水线血缘

```java
// 1. 定义实体
Urn sourceTable = UrnUtils.getUrn("urn:li:dataset:(urn:li:dataPlatform:mysql,source_db.orders,PROD)");
Urn targetTable = UrnUtils.getUrn("urn:li:dataset:(urn:li:dataPlatform:hive,warehouse.orders,PROD)");
Urn etlJob = UrnUtils.getUrn("urn:li:dataJob:(urn:li:dataFlow:(airflow,etl_dag,PROD),load_orders)");
Urn actor = UrnUtils.getUrn("urn:li:corpuser:etl_system");

// 2. 设置 DataJob 的输入
lineageService.updateDataJobUpstreamLineage(
    opContext,
    etlJob,
    List.of(sourceTable),  // 输入: source_db.orders
    List.of(),
    actor
);

// 3. 设置 DataJob 的输出
lineageService.updateDataJobDownstreamLineage(
    opContext,
    etlJob,
    List.of(targetTable),  // 输出: warehouse.orders
    List.of(),
    actor
);

// 4. 或者直接设置 Dataset 血缘
lineageService.updateDatasetLineage(
    opContext,
    targetTable,          // 下游: warehouse.orders
    List.of(sourceTable), // 上游: source_db.orders
    List.of(),
    actor
);
```

### 场景 2: 管理 Dashboard 血缘

```java
Urn dashboard = UrnUtils.getUrn("urn:li:dashboard:(looker,sales_dashboard)");
Urn chart1 = UrnUtils.getUrn("urn:li:chart:(looker,revenue_chart)");
Urn chart2 = UrnUtils.getUrn("urn:li:chart:(looker,orders_chart)");
Urn dataset = UrnUtils.getUrn("urn:li:dataset:(urn:li:dataPlatform:bigquery,sales.orders,PROD)");
Urn actor = UrnUtils.getUrn("urn:li:corpuser:analyst");

// Dashboard 依赖多个 Chart 和 Dataset
lineageService.updateDashboardLineage(
    opContext,
    dashboard,
    List.of(chart1, chart2, dataset),  // 添加多种类型的上游
    List.of(),
    actor
);
```

### 场景 3: 删除过时的血缘关系

```java
Urn dataset = UrnUtils.getUrn("urn:li:dataset:(urn:li:dataPlatform:hive,warehouse.orders,PROD)");
Urn oldUpstream = UrnUtils.getUrn("urn:li:dataset:(urn:li:dataPlatform:mysql,legacy.orders,PROD)");
Urn actor = UrnUtils.getUrn("urn:li:corpuser:datahub");

// 移除旧的血缘关系
lineageService.updateDatasetLineage(
    opContext,
    dataset,
    List.of(),              // 不添加新的
    List.of(oldUpstream),   // 删除旧的
    actor
);
```

---

## 错误处理

### 常见错误

1. **URN 不存在**:
   ```
   IllegalArgumentException: Error: urn does not exist: urn:li:dataset:(...)
   ```
   **解决方法**: 确保实体已经存在于 DataHub 中

2. **URN 类型不匹配**:
   ```
   IllegalArgumentException: Tried to add lineage edge with non-dataset node when we expect a dataset
   ```
   **解决方法**: 检查 URN 类型是否符合方法要求

3. **Aspect 不存在**:
   ```
   RuntimeException: Failed to update chart lineage for urn ... as chart info doesn't exist
   ```
   **解决方法**: 确保目标实体的相应 Aspect 已经初始化

### 异常处理建议

```java
try {
    lineageService.updateDatasetLineage(opContext, downstream, upstreams, removes, actor);
} catch (IllegalArgumentException e) {
    log.error("Invalid URN or URN does not exist: {}", e.getMessage());
    // 处理验证错误
} catch (RuntimeException e) {
    log.error("Failed to update lineage: {}", e.getMessage());
    // 处理运行时错误
}
```

---

## 性能考虑

### 批量操作

LineageService 支持一次调用添加/删除多个血缘关系:

```java
// 高效: 一次调用更新多个血缘
List<Urn> multipleUpstreams = List.of(upstream1, upstream2, upstream3);
lineageService.updateDatasetLineage(opContext, downstream, multipleUpstreams, List.of(), actor);

// 低效: 多次调用
lineageService.updateDatasetLineage(opContext, downstream, List.of(upstream1), List.of(), actor);
lineageService.updateDatasetLineage(opContext, downstream, List.of(upstream2), List.of(), actor);
lineageService.updateDatasetLineage(opContext, downstream, List.of(upstream3), List.of(), actor);
```

### 缓存策略

- LineageService 本身不缓存,每次都读取最新 Aspect
- 如需频繁查询,考虑在应用层实现缓存
- EntityClient 可能有缓存,取决于配置

---

## 依赖项

```java
@Slf4j
@RequiredArgsConstructor
public class LineageService {
  private final SystemEntityClient _entityClient;
}
```

### 注入方式

```java
@Configuration
public class ServiceConfig {

  @Bean
  public LineageService lineageService(SystemEntityClient entityClient) {
    return new LineageService(entityClient);
  }
}
```

---

## 相关 Aspect 定义

### UpstreamLineage (Dataset)

**PDL 文件**: `metadata-models/src/main/pegasus/com/linkedin/dataset/UpstreamLineage.pdl`

```pdl
record UpstreamLineage {
  upstreams: array[Upstream]
}

record Upstream {
  dataset: DatasetUrn
  type: DatasetLineageType
  auditStamp: AuditStamp
  created: optional AuditStamp
  properties: optional map[string, string]
}
```

### ChartInfo (Chart)

**PDL 文件**: `metadata-models/src/main/pegasus/com/linkedin/chart/ChartInfo.pdl`

```pdl
record ChartInfo {
  inputEdges: optional array[Edge]
  inputs: optional array[ChartDataSourceType]  // 已废弃
  // ... 其他字段
}
```

### DashboardInfo (Dashboard)

**PDL 文件**: `metadata-models/src/main/pegasus/com/linkedin/dashboard/DashboardInfo.pdl`

```pdl
record DashboardInfo {
  chartEdges: optional array[Edge]
  charts: optional array[ChartUrn]
  datasetEdges: optional array[Edge]
  datasets: optional array[DatasetUrn]
  // ... 其他字段
}
```

### DataJobInputOutput (DataJob)

**PDL 文件**: `metadata-models/src/main/pegasus/com/linkedin/datajob/DataJobInputOutput.pdl`

```pdl
record DataJobInputOutput {
  inputDatasetEdges: optional array[Edge]
  inputDatasets: optional array[DatasetUrn]
  inputDatajobEdges: optional array[Edge]
  inputDatajobs: optional array[DataJobUrn]
  outputDatasetEdges: optional array[Edge]
  outputDatasets: optional array[DatasetUrn]
}
```

---

## 最佳实践

### 1. 使用新版 Edge 字段

始终使用 `*Edges` 字段而不是已废弃的 URN 数组字段。

### 2. 提供有意义的 Actor

```java
// 好的做法
Urn actor = UrnUtils.getUrn("urn:li:corpuser:etl_pipeline");

// 不好的做法
Urn actor = UrnUtils.getUrn("urn:li:corpuser:unknown");
```

### 3. 批量更新

尽可能将多个血缘更新合并为一次调用。

### 4. 错误处理

始终捕获和处理异常,避免血缘更新失败影响主流程。

### 5. 验证顺序

在调用服务前先验证 URN 的存在性和类型,避免不必要的网络调用。

---

## 扩展阅读

- [GraphQL Lineage API](../api/graphql-api.md#血缘查询)
- [血缘模型设计](https://datahubproject.io/docs/modeling/lineage/)
- [UpstreamLineage Aspect 文档](https://datahubproject.io/docs/generated/metamodel/entities/dataset/#upstreamlineage)
- [DataJobInputOutput Aspect 文档](https://datahubproject.io/docs/generated/metamodel/entities/dataJob/#datajobinputoutput)
