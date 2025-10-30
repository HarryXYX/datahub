# TagService - 标签管理服务

## 概述

`TagService` 是 DataHub 中负责管理标签(Tags)的核心服务。它提供批量添加和删除标签的能力,支持实体级别和字段级别(sub-resource)的标签管理。

**源文件位置**: `/metadata-service/services/src/main/java/com/linkedin/metadata/service/TagService.java`

---

## 核心功能

### 1. 批量添加标签

为一组资源批量添加指定的标签。

**方法签名**:
```java
public void batchAddTags(
    @Nonnull OperationContext opContext,
    @Nonnull List<Urn> tagUrns,                // 标签 URN 列表
    @Nonnull List<ResourceReference> resources  // 资源引用列表
)
```

**参数说明**:
- `tagUrns`: 要添加的标签 URN 列表,格式为 `urn:li:tag:TagName`
- `resources`: 目标资源引用,可以是实体本身或实体的子资源(如 Dataset 字段)

**使用示例**:
```java
// 准备标签
List<Urn> tags = List.of(
    UrnUtils.getUrn("urn:li:tag:PII"),
    UrnUtils.getUrn("urn:li:tag:Sensitive")
);

// 准备资源(实体级别)
List<ResourceReference> resources = List.of(
    new ResourceReference().setUrn(dataset1),
    new ResourceReference().setUrn(dataset2)
);

// 批量添加标签
tagService.batchAddTags(opContext, tags, resources);
```

---

### 2. 批量删除标签

从一组资源中批量删除指定的标签。

**方法签名**:
```java
public void batchRemoveTags(
    @Nonnull OperationContext opContext,
    @Nonnull List<Urn> tagUrns,
    @Nonnull List<ResourceReference> resources
)
```

**功能说明**:
- 从指定资源的 `GlobalTags` Aspect 中删除匹配的标签
- 如果标签不存在,操作会被安全跳过
- 支持同时删除多个标签

**使用示例**:
```java
List<Urn> tagsToRemove = List.of(
    UrnUtils.getUrn("urn:li:tag:Deprecated")
);

tagService.batchRemoveTags(opContext, tagsToRemove, resources);
```

---

## 两级标签系统

TagService 支持两个级别的标签管理:

### 1. 实体级别标签 (Entity-Level Tags)

应用于整个实体(如 Dataset、Dashboard、Chart 等)。

**Aspect**: `GlobalTags`

**示例**:
```java
// 为 Dataset 添加标签
ResourceReference datasetRef = new ResourceReference()
    .setUrn(datasetUrn);

tagService.batchAddTags(
    opContext,
    List.of(UrnUtils.getUrn("urn:li:tag:HighValue")),
    List.of(datasetRef)
);
```

### 2. 字段级别标签 (Field-Level Tags)

应用于 Dataset 的特定字段。

**Aspect**: `EditableSchemaMetadata`

**示例**:
```java
// 为 Dataset 的字段添加标签
ResourceReference fieldRef = new ResourceReference()
    .setUrn(datasetUrn)
    .setSubResource("customer_email")          // 字段路径
    .setSubResourceType(SubResourceType.DATASET_FIELD);

tagService.batchAddTags(
    opContext,
    List.of(UrnUtils.getUrn("urn:li:tag:PII")),
    List.of(fieldRef)
);
```

---

## 核心设计

### GlobalTags Aspect 结构

实体级别标签存储在 `GlobalTags` Aspect 中:

```java
record GlobalTags {
  tags: array[TagAssociation]
}

record TagAssociation {
  tag: TagUrn                    // 标签 URN
  context: optional string       // 上下文信息 (可选)
  attribution: optional AuditStamp  // 归因信息 (可选)
}
```

### EditableSchemaMetadata Aspect 结构

字段级别标签存储在 `EditableSchemaMetadata` Aspect 中:

```java
record EditableSchemaMetadata {
  editableSchemaFieldInfo: array[EditableSchemaFieldInfo]
}

record EditableSchemaFieldInfo {
  fieldPath: string              // 字段路径
  globalTags: optional GlobalTags // 该字段的标签
  glossaryTerms: optional GlossaryTerms  // 该字段的术语
  description: optional string   // 字段描述
}
```

### 去重机制

添加标签时会自动检测重复:

```java
private void addTagsIfNotExists(GlobalTags tags, List<Urn> tagUrns) {
    TagAssociationArray tagArray = tags.getTags();

    for (Urn tagUrn : tagUrns) {
        // 检查标签是否已存在
        boolean exists = tagArray.stream()
            .anyMatch(association -> association.getTag().equals(tagUrn));

        if (!exists) {
            TagAssociation newAssociation = new TagAssociation();
            newAssociation.setTag(TagUrn.createFromUrn(tagUrn));
            tagArray.add(newAssociation);
        }
    }
}
```

---

## 使用场景

### 场景 1: 标记敏感数据

为包含 PII 的数据集及其字段添加敏感标签:

```java
Urn piiTag = UrnUtils.getUrn("urn:li:tag:PII");
Urn dataset = UrnUtils.getUrn("urn:li:dataset:(urn:li:dataPlatform:hive,users,PROD)");

// 1. 为整个 Dataset 添加 PII 标签
ResourceReference datasetRef = new ResourceReference().setUrn(dataset);
tagService.batchAddTags(opContext, List.of(piiTag), List.of(datasetRef));

// 2. 为敏感字段添加 PII 标签
List<ResourceReference> sensitiveFields = List.of(
    new ResourceReference()
        .setUrn(dataset)
        .setSubResource("email")
        .setSubResourceType(SubResourceType.DATASET_FIELD),
    new ResourceReference()
        .setUrn(dataset)
        .setSubResource("phone_number")
        .setSubResourceType(SubResourceType.DATASET_FIELD),
    new ResourceReference()
        .setUrn(dataset)
        .setSubResource("ssn")
        .setSubResourceType(SubResourceType.DATASET_FIELD)
);

tagService.batchAddTags(opContext, List.of(piiTag), sensitiveFields);
```

### 场景 2: 数据生命周期管理

使用标签标记数据的生命周期阶段:

```java
Urn deprecatedTag = UrnUtils.getUrn("urn:li:tag:Deprecated");
Urn archiveScheduledTag = UrnUtils.getUrn("urn:li:tag:ArchiveScheduled");

// 标记即将废弃的表
List<ResourceReference> oldTables = getOldTables();
tagService.batchAddTags(opContext, List.of(deprecatedTag), oldTables);

// 标记需要归档的表
List<ResourceReference> tablesToArchive = getTablesToArchive();
tagService.batchAddTags(opContext, List.of(archiveScheduledTag), tablesToArchive);
```

### 场景 3: 数据质量标记

为数据质量检查结果添加标签:

```java
// 数据质量标签
Urn highQualityTag = UrnUtils.getUrn("urn:li:tag:HighQuality");
Urn needsReviewTag = UrnUtils.getUrn("urn:li:tag:NeedsReview");

// 运行数据质量检查
Map<Urn, Boolean> qualityResults = runDataQualityChecks(datasets);

// 根据结果添加标签
List<ResourceReference> highQualityDatasets = new ArrayList<>();
List<ResourceReference> lowQualityDatasets = new ArrayList<>();

for (Map.Entry<Urn, Boolean> entry : qualityResults.entrySet()) {
    ResourceReference ref = new ResourceReference().setUrn(entry.getKey());
    if (entry.getValue()) {
        highQualityDatasets.add(ref);
    } else {
        lowQualityDatasets.add(ref);
    }
}

tagService.batchAddTags(opContext, List.of(highQualityTag), highQualityDatasets);
tagService.batchAddTags(opContext, List.of(needsReviewTag), lowQualityDatasets);
```

### 场景 4: 合规性标记

根据数据内容和使用情况添加合规相关标签:

```java
Urn gdprTag = UrnUtils.getUrn("urn:li:tag:GDPR");
Urn hipaaTag = UrnUtils.getUrn("urn:li:tag:HIPAA");
Urn pciTag = UrnUtils.getUrn("urn:li:tag:PCI");

// 为欧洲用户数据添加 GDPR 标签
List<ResourceReference> euDatasets = getEuropeanDatasets();
tagService.batchAddTags(opContext, List.of(gdprTag), euDatasets);

// 为医疗数据添加 HIPAA 标签
List<ResourceReference> healthDatasets = getHealthcareDatasets();
tagService.batchAddTags(opContext, List.of(hipaaTag), healthDatasets);

// 为支付数据添加 PCI 标签
List<ResourceReference> paymentDatasets = getPaymentDatasets();
tagService.batchAddTags(opContext, List.of(pciTag), paymentDatasets);
```

### 场景 5: 批量清理过时标签

定期清理不再使用的标签:

```java
// 查找所有带 "Deprecated" 标签的 Dataset
List<ResourceReference> deprecatedDatasets = findDatasetsByTag("Deprecated");

// 如果数据已经下线超过 6 个月,移除 Deprecated 标签
List<ResourceReference> readyToRemoveTag = deprecatedDatasets.stream()
    .filter(ref -> isOlderThan6Months(ref.getUrn()))
    .collect(Collectors.toList());

Urn deprecatedTag = UrnUtils.getUrn("urn:li:tag:Deprecated");
tagService.batchRemoveTags(opContext, List.of(deprecatedTag), readyToRemoveTag);
```

---

## 实现细节

### Proposal 构建流程

TagService 根据资源类型分别构建 Proposal:

```
1. 将资源分类
   ├─ 实体级别资源 (无 subResource)
   └─ 字段级别资源 (subResourceType == DATASET_FIELD)
   ↓
2. 实体级别:
   ├─ 获取 GlobalTags Aspect
   ├─ 添加/删除标签
   └─ 构建 MCP
   ↓
3. 字段级别:
   ├─ 获取 EditableSchemaMetadata Aspect
   ├─ 找到或创建 EditableSchemaFieldInfo
   ├─ 修改字段的 GlobalTags
   └─ 构建 MCP
   ↓
4. 批量提交所有 MCP
```

### BaseService 继承

`TagService` 继承自 `BaseService`,获得通用能力:

```java
public abstract class BaseService {
    protected final SystemEntityClient _entityClient;

    // 获取 GlobalTags Aspect
    protected Map<Urn, GlobalTags> getTagsAspects(
        OperationContext opContext,
        Set<Urn> urns,
        GlobalTags defaultValue
    );

    // 获取 EditableSchemaMetadata Aspect
    protected Map<Urn, EditableSchemaMetadata> getEditableSchemaMetadataAspects(
        OperationContext opContext,
        Set<Urn> urns,
        EditableSchemaMetadata defaultValue
    );

    // 批量提交 MCP
    protected void ingestChangeProposals(
        OperationContext opContext,
        List<MetadataChangeProposal> proposals
    );
}
```

---

## 字段级别标签的特殊处理

### 自动创建字段信息

如果字段的 `EditableSchemaFieldInfo` 不存在,会自动创建:

```java
private static EditableSchemaFieldInfo getFieldInfoFromSchema(
    EditableSchemaMetadata editableSchemaMetadata,
    String fieldPath
) {
    EditableSchemaFieldInfoArray fields = editableSchemaMetadata.getEditableSchemaFieldInfo();

    // 查找现有字段信息
    Optional<EditableSchemaFieldInfo> existing = fields.stream()
        .filter(fieldInfo -> fieldInfo.getFieldPath().equals(fieldPath))
        .findFirst();

    if (existing.isPresent()) {
        return existing.get();
    }

    // 创建新的字段信息
    EditableSchemaFieldInfo newFieldInfo = new EditableSchemaFieldInfo();
    newFieldInfo.setFieldPath(fieldPath);
    fields.add(newFieldInfo);
    return newFieldInfo;
}
```

### 初始化 GlobalTags

如果字段没有 GlobalTags,会自动初始化:

```java
if (!editableFieldInfo.hasGlobalTags()) {
    editableFieldInfo.setGlobalTags(new GlobalTags());
}
if (!editableFieldInfo.getGlobalTags().hasTags()) {
    editableFieldInfo.getGlobalTags().setTags(new TagAssociationArray());
}
```

---

## 与 GraphQL API 集成

TagService 是 GraphQL Mutation 的底层实现:

### GraphQL Mutation 示例

```graphql
mutation addTags {
  addTags(
    input: {
      tagUrns: ["urn:li:tag:PII", "urn:li:tag:Sensitive"]
      resourceUrn: "urn:li:dataset:(...)"
    }
  )
}

mutation addTagsToField {
  addTags(
    input: {
      tagUrns: ["urn:li:tag:PII"]
      resourceUrn: "urn:li:dataset:(...)"
      subResource: "email"
      subResourceType: DATASET_FIELD
    }
  )
}

mutation removeTags {
  removeTags(
    input: {
      tagUrns: ["urn:li:tag:Deprecated"]
      resourceUrn: "urn:li:dataset:(...)"
    }
  )
}

mutation batchAddTags {
  batchAddTags(
    input: {
      tagUrns: ["urn:li:tag:HighValue"]
      resources: [
        { resourceUrn: "urn:li:dataset:(...)" }
        { resourceUrn: "urn:li:dashboard:(...)" }
      ]
    }
  )
}
```

---

## 错误处理

### 常见错误

1. **标签不存在**:
   - TagService 不会验证标签是否存在
   - 建议先创建标签实体,然后再使用

2. **字段路径错误**:
   - 如果提供的 fieldPath 不存在于 SchemaMetadata,仍会创建
   - 这可能导致"孤立"的字段标签

3. **资源不存在**:
   - 如果 URN 指向不存在的实体,`getTagsAspects()` 返回 null
   - 操作会被跳过

### 异常处理示例

```java
try {
    tagService.batchAddTags(opContext, tags, resources);
} catch (RuntimeException e) {
    log.error("Failed to add tags {} to resources {}: {}",
        tags, resources, e.getMessage());
    // 处理错误
}
```

---

## 性能优化

### 1. 批量操作

**高效**:
```java
// 一次调用处理所有资源
tagService.batchAddTags(opContext, tags, allResources);
```

**低效**:
```java
// 多次调用
for (ResourceReference resource : allResources) {
    tagService.batchAddTags(opContext, tags, List.of(resource));
}
```

### 2. 分类处理

如果有大量资源,可以按实体类型分批处理:

```java
// 按实体类型分组
Map<String, List<ResourceReference>> byType = resources.stream()
    .collect(Collectors.groupingBy(ref -> ref.getUrn().getEntityType()));

// 分批处理
for (Map.Entry<String, List<ResourceReference>> entry : byType.entrySet()) {
    tagService.batchAddTags(opContext, tags, entry.getValue());
}
```

### 3. 避免重复查询

如果需要多次操作同一组资源,考虑缓存 Aspect:

```java
// 不推荐:每次都查询
tagService.batchAddTags(opContext, tags1, resources);
tagService.batchAddTags(opContext, tags2, resources);  // 重复查询

// 推荐:合并标签
List<Urn> allTags = new ArrayList<>();
allTags.addAll(tags1);
allTags.addAll(tags2);
tagService.batchAddTags(opContext, allTags, resources);  // 一次查询
```

---

## 标签管理最佳实践

### 1. 标准化标签命名

建立标签命名规范:

```
# 分类前缀
PII:*          # 个人信息: PII:Email, PII:Phone
Compliance:*   # 合规: Compliance:GDPR, Compliance:HIPAA
Quality:*      # 质量: Quality:High, Quality:NeedsReview
Lifecycle:*    # 生命周期: Lifecycle:Deprecated, Lifecycle:Active
```

### 2. 使用标签层次

创建父子标签关系:

```
Sensitive
├── PII
│   ├── PII:Email
│   ├── PII:Phone
│   └── PII:SSN
└── Financial
    ├── Financial:CreditCard
    └── Financial:BankAccount
```

### 3. 定期审计标签使用

```java
// 查找未使用的标签
Map<String, Long> tagCounts = searchService.aggregateByValue(
    opContext,
    null,  // 所有实体类型
    "tags",
    null,
    Integer.MAX_VALUE
);

List<String> unusedTags = allTags.stream()
    .filter(tag -> !tagCounts.containsKey(tag))
    .collect(Collectors.toList());
```

### 4. 自动化标签管理

使用脚本或工作流自动添加标签:

```java
// 示例:根据表名自动添加标签
for (ResourceReference dataset : allDatasets) {
    String tableName = extractTableName(dataset.getUrn());

    List<Urn> autoTags = new ArrayList<>();

    if (tableName.contains("_pii_")) {
        autoTags.add(UrnUtils.getUrn("urn:li:tag:PII"));
    }
    if (tableName.startsWith("temp_")) {
        autoTags.add(UrnUtils.getUrn("urn:li:tag:Temporary"));
    }

    if (!autoTags.isEmpty()) {
        tagService.batchAddTags(opContext, autoTags, List.of(dataset));
    }
}
```

---

## 测试

### 单元测试示例

```java
@Test
public void testBatchAddTags() {
    // Mock
    SystemEntityClient mockClient = mock(SystemEntityClient.class);
    TagService tagService = new TagService(mockClient);

    // 准备数据
    Urn tag = UrnUtils.getUrn("urn:li:tag:Test");
    Urn dataset = UrnUtils.getUrn("urn:li:dataset:(...)");
    ResourceReference resource = new ResourceReference().setUrn(dataset);

    // Mock 返回空 GlobalTags
    when(mockClient.getV2(any(), any(), any(), any()))
        .thenReturn(createEmptyAspectResponse());

    // 执行
    tagService.batchAddTags(opContext, List.of(tag), List.of(resource));

    // 验证
    verify(mockClient).ingestProposal(any(), any(), anyBoolean());
}

@Test
public void testBatchAddTagsToField() {
    // 测试字段级别标签
    ResourceReference fieldRef = new ResourceReference()
        .setUrn(datasetUrn)
        .setSubResource("email")
        .setSubResourceType(SubResourceType.DATASET_FIELD);

    tagService.batchAddTags(opContext, List.of(piiTag), List.of(fieldRef));

    // 验证调用了正确的 Aspect
    verify(mockClient).getV2(
        any(),
        eq(Constants.DATASET_ENTITY_NAME),
        eq(datasetUrn),
        argThat(aspects -> aspects.contains(Constants.EDITABLE_SCHEMA_METADATA_ASPECT_NAME))
    );
}
```

---

## 相关资源

- [GlobalTags Aspect 定义](https://datahubproject.io/docs/generated/metamodel/aspects/globalTags/)
- [标签管理最佳实践](https://datahubproject.io/docs/features/governance/tags/)
- [GraphQL API 文档](../api/graphql-api.md)
- [OwnerService](ownership-service.md) - 类似的批量操作服务
