# OwnerService - 所有权管理服务

## 概述

`OwnerService` 是 DataHub 中负责管理实体所有权(Ownership)的核心服务。它提供批量添加和删除所有者的能力,支持所有实体类型。

**源文件位置**: `/metadata-service/services/src/main/java/com/linkedin/metadata/service/OwnerService.java`

---

## 核心功能

### 1. 批量添加所有者

为一组资源批量添加指定的所有者。

**方法签名**:
```java
public void batchAddOwners(
    @Nonnull OperationContext opContext,
    @Nonnull List<Urn> ownerUrns,           // 所有者 URN 列表
    @Nonnull List<ResourceReference> resources, // 资源引用列表
    @Nonnull OwnershipType ownershipType,    // 所有权类型
    @Nullable Urn ownershipTypeUrn           // 自定义所有权类型 URN (可选)
)
```

**参数说明**:
- `ownerUrns`: 要添加的所有者 URN 列表(通常是 `corpuser` 或 `corpGroup`)
- `resources`: 目标资源引用,包含实体 URN 和可选的子资源信息
- `ownershipType`: 所有权类型枚举,如 `TECHNICAL_OWNER`, `BUSINESS_OWNER`, `DATA_STEWARD` 等
- `ownershipTypeUrn`: 自定义所有权类型的 URN(如果使用自定义类型)

**使用示例**:
```java
// 准备所有者
List<Urn> owners = List.of(
    UrnUtils.getUrn("urn:li:corpuser:john_doe"),
    UrnUtils.getUrn("urn:li:corpGroup:data_team")
);

// 准备资源
List<ResourceReference> resources = List.of(
    new ResourceReference().setUrn(UrnUtils.getUrn("urn:li:dataset:(...)")),
    new ResourceReference().setUrn(UrnUtils.getUrn("urn:li:dashboard:(...)"))
);

// 批量添加所有者
ownerService.batchAddOwners(
    opContext,
    owners,
    resources,
    OwnershipType.TECHNICAL_OWNER,
    null  // 使用标准类型,不需要自定义 URN
);
```

---

### 2. 批量删除所有者

从一组资源中批量删除指定的所有者。

**方法签名**:
```java
public void batchRemoveOwners(
    @Nonnull OperationContext opContext,
    @Nonnull List<Urn> ownerUrns,
    @Nonnull List<ResourceReference> resources
)
```

**功能说明**:
- 从指定资源的 `Ownership` Aspect 中删除匹配的所有者
- 如果所有者不存在,操作会被安全跳过
- 支持同时删除多个所有者

**使用示例**:
```java
List<Urn> ownersToRemove = List.of(
    UrnUtils.getUrn("urn:li:corpuser:former_owner")
);

List<ResourceReference> resources = List.of(
    new ResourceReference().setUrn(dataset1),
    new ResourceReference().setUrn(dataset2)
);

ownerService.batchRemoveOwners(opContext, ownersToRemove, resources);
```

---

## 核心设计

### Ownership Aspect 结构

```java
record Ownership {
  owners: array[Owner]
  lastModified: AuditStamp
}

record Owner {
  owner: Urn                         // 所有者 URN (corpuser 或 corpGroup)
  type: OwnershipType                // 所有权类型
  typeUrn: optional Urn              // 自定义所有权类型 URN
  source: optional OwnershipSource   // 所有权来源
}
```

### 所有权类型 (OwnershipType)

DataHub 内置的所有权类型:

```java
enum OwnershipType {
  TECHNICAL_OWNER       // 技术负责人
  BUSINESS_OWNER        // 业务负责人
  DATA_STEWARD          // 数据管理员
  DATAOWNER             // 数据所有者 (已废弃,使用 TECHNICAL_OWNER)
  DELEGATE              // 委托
  PRODUCER              // 生产者
  CONSUMER              // 消费者
  STAKEHOLDER           // 利益相关者
  CUSTOM                // 自定义类型 (需要提供 typeUrn)
}
```

### 自定义所有权类型

如果内置类型不满足需求,可以创建自定义所有权类型:

```java
// 1. 创建 OwnershipType 实体
Urn customTypeUrn = UrnUtils.getUrn("urn:li:ownershipType:DataQualityChampion");

// 2. 使用自定义类型
ownerService.batchAddOwners(
    opContext,
    owners,
    resources,
    OwnershipType.CUSTOM,
    customTypeUrn  // 提供自定义类型 URN
);
```

---

## 实现细节

### 去重机制

添加所有者时会自动检测重复:

```java
private void addOwnerIfNotExists(Owner ownerToAdd, OwnerArray existingOwners) {
    // 检查所有者是否已存在
    boolean exists = existingOwners.stream()
        .anyMatch(existing ->
            existing.getOwner().equals(ownerToAdd.getOwner()) &&
            existing.getType().equals(ownerToAdd.getType())
        );

    if (!exists) {
        existingOwners.add(ownerToAdd);
    }
}
```

### Proposal 构建流程

```
1. 获取现有 Ownership Aspect
   ↓
2. 如果不存在,创建空 Ownership
   ↓
3. 修改 owners 数组 (添加/删除)
   ↓
4. 更新 lastModified 时间戳
   ↓
5. 构建 MetadataChangeProposal
   ↓
6. 批量提交所有 Proposal
```

### BaseService 继承

`OwnerService` 继承自 `BaseService`,获得以下能力:

```java
public abstract class BaseService {
    protected final SystemEntityClient _entityClient;

    // 获取 Aspect 的通用方法
    protected <T> Map<Urn, T> getAspects(
        OperationContext opContext,
        Set<Urn> urns,
        String aspectName,
        T defaultValue
    );

    // 批量提交 MCP
    protected void ingestChangeProposals(
        OperationContext opContext,
        List<MetadataChangeProposal> proposals
    );
}
```

特定于 Ownership 的辅助方法:

```java
protected Map<Urn, Ownership> getOwnershipAspects(
    OperationContext opContext,
    Set<Urn> urns,
    Ownership defaultValue
) {
    return getAspects(opContext, urns, Constants.OWNERSHIP_ASPECT_NAME, defaultValue);
}
```

---

## 使用场景

### 场景 1: 数据资产交接

当团队成员离职或角色变更时,批量转移数据资产所有权:

```java
Urn formerOwner = UrnUtils.getUrn("urn:li:corpuser:alice");
Urn newOwner = UrnUtils.getUrn("urn:li:corpuser:bob");

// 获取 Alice 拥有的所有 Dataset (通过搜索或 GraphQL)
List<ResourceReference> aliceDatasets = getDatasetsByOwner(formerOwner);

// 步骤 1: 移除 Alice
ownerService.batchRemoveOwners(opContext, List.of(formerOwner), aliceDatasets);

// 步骤 2: 添加 Bob
ownerService.batchAddOwners(
    opContext,
    List.of(newOwner),
    aliceDatasets,
    OwnershipType.TECHNICAL_OWNER,
    null
);
```

### 场景 2: 批量指定数据管理员

为特定域的所有数据资产指定数据管理员:

```java
Urn dataSteward = UrnUtils.getUrn("urn:li:corpuser:data_steward");
List<ResourceReference> financeDatasets = getDatasetsByDomain("Finance");

ownerService.batchAddOwners(
    opContext,
    List.of(dataSteward),
    financeDatasets,
    OwnershipType.DATA_STEWARD,
    null
);
```

### 场景 3: 团队所有权

将整个团队设置为数据资产的所有者:

```java
Urn dataTeam = UrnUtils.getUrn("urn:li:corpGroup:data_engineering");
List<ResourceReference> pipelineAssets = List.of(
    new ResourceReference().setUrn(dataJob1),
    new ResourceReference().setUrn(dataJob2),
    new ResourceReference().setUrn(dataset1)
);

ownerService.batchAddOwners(
    opContext,
    List.of(dataTeam),
    pipelineAssets,
    OwnershipType.TECHNICAL_OWNER,
    null
);
```

### 场景 4: 多角色所有权

同一资源可以有多个不同角色的所有者:

```java
Urn dataset = UrnUtils.getUrn("urn:li:dataset:(...)");
ResourceReference resource = new ResourceReference().setUrn(dataset);

// 技术负责人
ownerService.batchAddOwners(
    opContext,
    List.of(UrnUtils.getUrn("urn:li:corpuser:tech_lead")),
    List.of(resource),
    OwnershipType.TECHNICAL_OWNER,
    null
);

// 业务负责人
ownerService.batchAddOwners(
    opContext,
    List.of(UrnUtils.getUrn("urn:li:corpuser:product_manager")),
    List.of(resource),
    OwnershipType.BUSINESS_OWNER,
    null
);

// 数据管理员
ownerService.batchAddOwners(
    opContext,
    List.of(UrnUtils.getUrn("urn:li:corpuser:data_steward")),
    List.of(resource),
    OwnershipType.DATA_STEWARD,
    null
);
```

---

## ResourceReference 说明

`ResourceReference` 用于引用资源及其子资源:

```java
public class ResourceReference {
    private Urn urn;                    // 实体 URN (必需)
    private String subResource;         // 子资源标识符 (可选)
    private SubResourceType subResourceType;  // 子资源类型 (可选)
}
```

### 实体级别所有权

```java
ResourceReference entityRef = new ResourceReference()
    .setUrn(datasetUrn);  // 仅设置 URN
```

### 子资源级别所有权

虽然 `OwnerService` 主要用于实体级别,但框架支持子资源(如 Dataset 字段):

```java
ResourceReference fieldRef = new ResourceReference()
    .setUrn(datasetUrn)
    .setSubResource("field_name")
    .setSubResourceType(SubResourceType.DATASET_FIELD);
```

**注意**: 当前 OwnerService 实现主要处理实体级别所有权。字段级别所有权通过 `EditableSchemaMetadata` Aspect 管理,不使用此服务。

---

## 错误处理

### 常见错误

1. **所有者 URN 不存在**:
   - 系统会尝试添加,但 UI 可能无法正确显示
   - 建议先验证所有者存在性

2. **资源不存在**:
   - 如果 `getOwnershipAspects()` 返回 null,操作会被跳过
   - 建议先确保实体已创建

3. **权限不足**:
   - 如果当前用户无权修改所有权,调用会失败
   - 确保 `OperationContext` 包含适当的权限

### 异常处理示例

```java
try {
    ownerService.batchAddOwners(opContext, owners, resources, type, null);
} catch (RuntimeException e) {
    log.error("Failed to add owners {} to resources {}: {}",
        owners, resources, e.getMessage());
    // 处理错误或重试
}
```

---

## 性能优化

### 1. 批量操作

**高效**:
```java
// 一次调用处理 100 个资源
ownerService.batchAddOwners(opContext, owners, allResources, type, null);
```

**低效**:
```java
// 100 次网络调用
for (ResourceReference resource : allResources) {
    ownerService.batchAddOwners(opContext, owners, List.of(resource), type, null);
}
```

### 2. 减少 Aspect 读取

`OwnerService` 内部会批量读取所有资源的 Ownership Aspect:

```java
Map<Urn, Ownership> aspects = getOwnershipAspects(
    opContext,
    resources.stream().map(ResourceReference::getUrn).collect(Collectors.toSet()),
    new Ownership()
);
```

传入的资源越多,批量读取的效率越高。

### 3. 避免重复操作

在大规模操作前,可以先查询现有所有权:

```java
// 查询现有所有者
Set<Urn> existingOwners = getExistingOwners(dataset);

// 过滤出需要添加的
List<Urn> ownersToAdd = allOwners.stream()
    .filter(owner -> !existingOwners.contains(owner))
    .collect(Collectors.toList());

// 仅添加新所有者
if (!ownersToAdd.isEmpty()) {
    ownerService.batchAddOwners(opContext, ownersToAdd, resources, type, null);
}
```

---

## 辅助工具类

### OwnerServiceUtils

**文件位置**: `/metadata-service/services/src/main/java/com/linkedin/metadata/service/util/OwnerServiceUtils.java`

提供所有权操作的辅助方法:

```java
public class OwnerServiceUtils {

    // 添加所有者到 Ownership Aspect
    public static void addOwnerToAspect(
        Ownership ownership,
        Urn ownerUrn,
        OwnershipType ownershipType,
        Urn ownershipTypeUrn
    ) {
        Owner newOwner = new Owner();
        newOwner.setOwner(ownerUrn);
        newOwner.setType(ownershipType);
        if (ownershipTypeUrn != null) {
            newOwner.setTypeUrn(ownershipTypeUrn);
        }

        // 去重检查
        if (!ownership.getOwners().contains(newOwner)) {
            ownership.getOwners().add(newOwner);
        }
    }

    // 其他辅助方法...
}
```

---

## 与 GraphQL API 集成

OwnerService 是 GraphQL Mutation 的底层实现:

### GraphQL Mutation 示例

```graphql
mutation addOwners {
  addOwners(
    input: {
      ownerUrns: ["urn:li:corpuser:john_doe"]
      resourceUrn: "urn:li:dataset:(...)"
      ownershipTypeUrn: "urn:li:ownershipType:TechnicalOwner"
    }
  )
}

mutation removeOwners {
  removeOwners(
    input: {
      ownerUrns: ["urn:li:corpuser:former_owner"]
      resourceUrn: "urn:li:dataset:(...)"
    }
  )
}

mutation batchAddOwners {
  batchAddOwners(
    input: {
      ownerUrns: ["urn:li:corpuser:alice", "urn:li:corpGroup:data_team"]
      resources: [
        { resourceUrn: "urn:li:dataset:(...)" }
        { resourceUrn: "urn:li:dashboard:(...)" }
      ]
      ownershipTypeUrn: "urn:li:ownershipType:TechnicalOwner"
    }
  )
}
```

### GraphQL Resolver 实现

```java
@Component
public class OwnerMutationResolver implements DataFetcher {

    private final OwnerService ownerService;

    @Override
    public Object get(DataFetchingEnvironment environment) {
        List<String> ownerUrnStrs = environment.getArgument("ownerUrns");
        List<Urn> ownerUrns = ownerUrnStrs.stream()
            .map(UrnUtils::getUrn)
            .collect(Collectors.toList());

        // 调用 OwnerService
        ownerService.batchAddOwners(
            context,
            ownerUrns,
            resources,
            ownershipType,
            ownershipTypeUrn
        );

        return true;
    }
}
```

---

## 测试

### 单元测试示例

```java
@Test
public void testBatchAddOwners() {
    // Mock
    SystemEntityClient mockClient = mock(SystemEntityClient.class);
    OwnerService ownerService = new OwnerService(mockClient);

    // 准备数据
    Urn owner = UrnUtils.getUrn("urn:li:corpuser:test");
    Urn dataset = UrnUtils.getUrn("urn:li:dataset:(...)");
    ResourceReference resource = new ResourceReference().setUrn(dataset);

    // Mock 返回空 Ownership
    when(mockClient.getV2(any(), any(), any(), any()))
        .thenReturn(null);

    // 执行
    ownerService.batchAddOwners(
        opContext,
        List.of(owner),
        List.of(resource),
        OwnershipType.TECHNICAL_OWNER,
        null
    );

    // 验证
    verify(mockClient).ingestProposal(any(), any(), anyBoolean());
}
```

---

## 最佳实践

### 1. 使用批量操作

始终使用批量方法,即使只有一个资源:

```java
// 推荐
ownerService.batchAddOwners(opContext, owners, List.of(resource), type, null);
```

### 2. 提供完整的审计信息

确保 `OperationContext` 包含正确的 actor 信息:

```java
OperationContext opContext = OperationContext.builder()
    .sessionAuthentication(authentication)  // 包含当前用户信息
    .build();
```

### 3. 使用标准所有权类型

优先使用内置的 `OwnershipType`,仅在必要时创建自定义类型。

### 4. 验证输入

在调用服务前验证 URN 的有效性:

```java
// 验证所有者存在
for (Urn ownerUrn : owners) {
    if (!entityClient.exists(opContext, ownerUrn)) {
        throw new IllegalArgumentException("Owner does not exist: " + ownerUrn);
    }
}
```

### 5. 处理部分失败

在大规模操作中考虑将资源分批处理,避免单个失败影响全部:

```java
List<List<ResourceReference>> batches = Lists.partition(allResources, 100);
for (List<ResourceReference> batch : batches) {
    try {
        ownerService.batchAddOwners(opContext, owners, batch, type, null);
    } catch (Exception e) {
        log.error("Failed to process batch: {}", e.getMessage());
        // 记录失败的批次,继续处理其他批次
    }
}
```

---

## 相关资源

- [Ownership Aspect 定义](https://datahubproject.io/docs/generated/metamodel/aspects/ownership/)
- [所有权管理最佳实践](https://datahubproject.io/docs/features/governance/ownership/)
- [GraphQL API 文档](../api/graphql-api.md)
- [TagService](tag-service.md) - 类似的批量操作服务
