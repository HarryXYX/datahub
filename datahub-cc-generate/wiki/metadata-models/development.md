# 开发指南：扩展 Metadata Models

## 概述

本指南介绍如何扩展 DataHub 的元数据模型，包括：

1. 添加自定义 Entity
2. 添加自定义 Aspect
3. 修改现有 Aspect
4. 最佳实践和常见问题

## 前置准备

### 开发环境

```bash
# 克隆 DataHub 仓库
git clone https://github.com/datahub-project/datahub.git
cd datahub

# 构建 metadata-models 模块
./gradlew :metadata-models:build
```

### 目录结构

```
metadata-models/
├── src/main/pegasus/com/linkedin/
│   ├── metadata/key/           # Key Aspect 定义
│   ├── <entity_name>/          # 实体特定 Aspect
│   └── common/                 # 通用 Aspect
└── src/main/resources/
    └── entity-registry.yml     # 实体注册表
```

## 添加自定义 Entity

### 步骤概览

1. 定义 Key Aspect
2. 定义实体特定的 Aspects
3. 在 Entity Registry 中注册
4. 生成代码并测试
5. 更新 GraphQL Schema（可选）
6. 更新前端（可选）

### 步骤 1：定义 Key Aspect

创建文件：`src/main/pegasus/com/linkedin/metadata/key/MyEntityKey.pdl`

```pdl
namespace com.linkedin.metadata.key

/**
 * Key for MyEntity
 */
@Aspect = {
  "name": "myEntityKey"
}
record MyEntityKey {
  /**
   * Unique identifier
   */
  @Searchable = {
    "fieldType": "TEXT_PARTIAL",
    "enableAutocomplete": true,
    "boostScore": 10.0
  }
  id: string

  /**
   * Optional secondary key component
   */
  @Searchable = {
    "fieldType": "KEYWORD"
  }
  type: optional string
}
```

#### Key Aspect 最佳实践

- ✅ 使用简单、稳定的字段作为 Key
- ✅ Key 字段应该是不可变的
- ✅ 添加 @Searchable 注解以支持搜索
- ❌ 避免使用复杂对象作为 Key
- ❌ 不要使用可能变化的业务数据

### 步骤 2：定义实体特定的 Aspects

创建文件：`src/main/pegasus/com/linkedin/myentity/MyEntityProperties.pdl`

```pdl
namespace com.linkedin.myentity

import com.linkedin.common.CustomProperties
import com.linkedin.common.ExternalReference
import com.linkedin.common.TimeStamp

/**
 * Properties of MyEntity
 */
@Aspect = {
  "name": "myEntityProperties"
}
record MyEntityProperties includes CustomProperties, ExternalReference {
  /**
   * Display name
   */
  @Searchable = {
    "fieldType": "WORD_GRAM",
    "enableAutocomplete": true,
    "boostScore": 10.0,
    "fieldNameAliases": [ "_entityName" ],
    "searchTier": 1,
    "searchLabel": "entityName"
  }
  name: string

  /**
   * Description
   */
  @Searchable = {
    "fieldType": "TEXT",
    "hasValuesFieldName": "hasDescription",
    "searchTier": 2
  }
  description: optional string

  /**
   * Created timestamp
   */
  @Searchable = {
    "/time": {
      "fieldName": "createdAt",
      "fieldType": "DATETIME",
      "searchLabel": "createdAt"
    }
  }
  created: optional TimeStamp

  /**
   * Last modified timestamp
   */
  @Searchable = {
    "/time": {
      "fieldName": "lastModifiedAt",
      "fieldType": "DATETIME",
      "searchLabel": "lastModifiedAt"
    }
  }
  lastModified: optional TimeStamp
}
```

#### Aspect 设计最佳实践

**✅ 推荐**：

- 继承 `CustomProperties` 和 `ExternalReference`
- 为关键字段添加 @Searchable 注解
- 使用 `optional` 使字段可选
- 提供清晰的文档注释
- 为 name 字段使用 `fieldNameAliases: ["_entityName"]`

**❌ 避免**：

- 在单个 Aspect 中放置过多字段（考虑拆分）
- 使用 required 字段（除非绝对必要）
- 跨 Aspect 重复数据

### 步骤 3：在 Entity Registry 中注册

编辑 `src/main/resources/entity-registry.yml`：

```yaml
entities:
  # ... 现有实体 ...

  - name: myEntity
    doc: |
      MyEntity represents...
    category: core
    keyAspect: myEntityKey
    searchGroup: primary
    aspects:
      - myEntityProperties      # 实体特定 Aspect
      - ownership               # 复用通用 Aspect
      - globalTags
      - glossaryTerms
      - domains
      - applications
      - institutionalMemory
      - status
      - deprecation
      - browsePaths
      - browsePathsV2
      - dataPlatformInstance
      - structuredProperties
      - forms
      - testResults
      - subTypes
```

#### 选择适用的 Aspects

根据实体类型选择合适的 Aspects：

**数据资产类实体**（Dataset、Dashboard 等）：
- ownership
- globalTags
- glossaryTerms
- domains
- applications
- container
- browsePaths
- browsePathsV2
- dataPlatformInstance
- structuredProperties
- forms
- testResults
- access
- incidentsSummary

**组织类实体**（CorpUser、CorpGroup 等）：
- status
- globalTags
- structuredProperties
- forms

**内部实体**（DataHubPolicy 等）：
- status（通常只需要很少的 Aspects）

### 步骤 4：生成代码并测试

```bash
# 生成代码
./gradlew :metadata-models:build

# 查看生成的 Java 类
ls -la metadata-models/build/classes/java/main/com/linkedin/myentity/

# 运行测试
./gradlew :metadata-models:test
```

#### 验证生成的代码

检查生成的文件：

```bash
# Java 类
metadata-models/src/mainGeneratedDataTemplate/java/com/linkedin/myentity/MyEntityProperties.java

# Avro Schema
metadata-models/src/mainGeneratedAvroSchema/com/linkedin/myentity/MyEntityProperties.avsc

# JSON Schema
metadata-models/src/generatedJsonSchema/com/linkedin/myentity/MyEntityProperties.json
```

### 步骤 5：更新 GraphQL Schema（可选）

如果需要通过 GraphQL 访问新实体，需要更新 GraphQL Schema。

编辑 `datahub-graphql-core/src/main/resources/entity.graphql`：

```graphql
type MyEntity implements Entity {
  """
  The primary key of the entity
  """
  urn: String!

  """
  The type of the entity
  """
  type: EntityType!

  """
  Properties of the entity
  """
  properties: MyEntityProperties

  """
  Ownership information
  """
  ownership: Ownership

  """
  Tags associated with the entity
  """
  tags: GlobalTags

  # ... 其他 aspects
}

type MyEntityProperties {
  name: String!
  description: String
  created: AuditStamp
  lastModified: AuditStamp
}
```

并添加对应的 Resolver：

```java
// datahub-graphql-core/src/main/java/com/linkedin/datahub/graphql/resolvers/entity/
public class MyEntityType implements EntityType<MyEntity, String> {
    // 实现 EntityType 接口...
}
```

### 步骤 6：更新前端（可选）

如果需要在 UI 中显示新实体，需要更新前端代码。

创建实体页面组件：

```typescript
// datahub-web-react/src/app/entity/myEntity/
export const MyEntityEntity = {
    type: EntityType.MyEntity,
    icon: MyEntityIcon,
    isSearchEnabled: () => true,
    isBrowseEnabled: () => true,
    getDisplayName: (data) => data?.properties?.name,
    // ... 其他配置
};
```

## 添加自定义 Aspect

### 何时添加新 Aspect

- 当信息不适合现有 Aspect 时
- 当需要独立更新某部分元数据时
- 当信息可以被多个实体复用时

### 步骤 1：定义 Aspect PDL

创建文件：`src/main/pegasus/com/linkedin/common/MyCustomAspect.pdl`

```pdl
namespace com.linkedin.common

import com.linkedin.common.Urn

/**
 * My custom aspect description
 */
@Aspect = {
  "name": "myCustomAspect"
}
record MyCustomAspect {
  /**
   * Field 1
   */
  @Searchable = {
    "fieldType": "KEYWORD"
  }
  field1: string

  /**
   * Field 2 (optional)
   */
  field2: optional int

  /**
   * Related entity
   */
  @Relationship = {
    "name": "RelatedTo",
    "entityTypes": [ "dataset" ]
  }
  @Searchable = {
    "fieldType": "URN"
  }
  relatedEntity: optional Urn

  /**
   * Audit stamp
   */
  lastModified: AuditStamp
}
```

### 步骤 2：在 Entity Registry 中添加

```yaml
- name: dataset
  keyAspect: datasetKey
  aspects:
    # ... 现有 aspects ...
    - myCustomAspect      # 添加新 Aspect
```

### 步骤 3：生成代码

```bash
./gradlew :metadata-models:build
```

## 修改现有 Aspect

### 向后兼容的修改

✅ **安全的修改**：

1. 添加新的 optional 字段
2. 为 optional 字段添加默认值
3. 将 required 字段改为 optional（谨慎）
4. 添加新的 enum 值

```pdl
record DatasetProperties {
  name: optional string
  description: optional string

  // ✅ 添加新的 optional 字段
  category: optional string

  // ✅ 添加默认值
  isPublic: optional boolean = false
}
```

❌ **不兼容的修改**：

1. 删除字段
2. 更改字段类型
3. 将 optional 字段改为 required
4. 删除 enum 值
5. 重命名字段

### 迁移策略

如果必须进行不兼容的修改：

1. **添加新字段，保留旧字段**：

```pdl
record DatasetProperties {
  // 旧字段（标记为 deprecated）
  @deprecated
  oldField: optional string

  // 新字段
  newField: optional string
}
```

2. **创建新 Aspect 版本**：

```pdl
// V1
@Aspect = {
  "name": "datasetProperties"
}
record DatasetProperties { ... }

// V2（新 Aspect）
@Aspect = {
  "name": "datasetPropertiesV2"
}
record DatasetPropertiesV2 { ... }
```

3. **使用 Mutation Hook 进行数据迁移**

## 使用自定义 Entity 和 Aspect

### 通过 Python SDK

```python
from datahub.emitter.mcp import MetadataChangeProposalWrapper
from datahub.emitter.rest_emitter import DatahubRestEmitter
from datahub.metadata.schema_classes import (
    MyEntityPropertiesClass,
    MyCustomAspectClass,
    AuditStampClass
)

# 创建 URN
my_entity_urn = "urn:li:myEntity:(unique_id,optional_type)"

# 创建 MyEntityProperties
properties = MyEntityPropertiesClass(
    name="My Entity Name",
    description="Description of my entity",
    created=AuditStampClass(
        time=1640995200000,
        actor="urn:li:corpuser:datahub"
    )
)

# 创建自定义 Aspect
custom_aspect = MyCustomAspectClass(
    field1="value1",
    field2=42,
    relatedEntity="urn:li:dataset:(...)",
    lastModified=AuditStampClass(
        time=1640995200000,
        actor="urn:li:corpuser:datahub"
    )
)

# 发送到 DataHub
emitter = DatahubRestEmitter("http://localhost:8080")

emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn=my_entity_urn,
        aspect=properties
    )
)

emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn=my_entity_urn,
        aspect=custom_aspect
    )
)
```

## 测试和验证

### 单元测试

创建测试文件：`src/test/java/com/linkedin/myentity/MyEntityPropertiesTest.java`

```java
package com.linkedin.myentity;

import com.linkedin.data.template.RecordTemplate;
import org.testng.annotations.Test;

import static org.testng.Assert.*;

public class MyEntityPropertiesTest {

  @Test
  public void testMyEntityProperties() {
    MyEntityProperties props = new MyEntityProperties();
    props.setName("Test Entity");
    props.setDescription("Test Description");

    assertEquals(props.getName(), "Test Entity");
    assertEquals(props.getDescription(), "Test Description");
  }
}
```

### 集成测试

```bash
# 启动本地 DataHub
./gradlew quickstartDebug

# 发送测试数据
python test_my_entity.py

# 通过 GraphQL 验证
curl -X POST http://localhost:8080/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ myEntity(urn: \"...\") { properties { name } } }"}'
```

## 常见问题

### 问题 1：构建失败

**错误**：`Aspect 'myAspect' not found`

**解决方法**：
1. 检查 PDL 文件中的 `@Aspect.name` 与 entity-registry.yml 中的名称一致
2. 确保文件在正确的位置
3. 运行 `./gradlew clean build`

### 问题 2：搜索不工作

**错误**：字段无法搜索

**解决方法**：
1. 添加 `@Searchable` 注解
2. 重新索引：删除 Elasticsearch 索引并重启
3. 检查 `searchGroup` 配置

### 问题 3：字段不显示在 UI

**解决方法**：
1. 更新 GraphQL Schema
2. 更新前端组件
3. 重新构建前端：`cd datahub-web-react && yarn build`

### 问题 4：版本冲突

**错误**：Pegasus schema 冲突

**解决方法**：
```bash
# 清理生成的代码
./gradlew :metadata-models:clean

# 重新生成
./gradlew :metadata-models:build
```

## 最佳实践总结

### PDL 设计

1. **模块化**：按领域组织 Aspects
2. **可选字段**：默认使用 optional
3. **文档完整**：为所有字段添加注释
4. **搜索优化**：为关键字段添加 @Searchable
5. **关系明确**：使用 @Relationship 定义关系

### Entity Registry

1. **完整配置**：包含所有适用的通用 Aspects
2. **分类清晰**：使用 category 标记实体类型
3. **搜索配置**：正确设置 searchGroup
4. **文档说明**：使用 doc 字段

### 开发流程

1. **小步迭代**：一次添加一个 Entity/Aspect
2. **测试验证**：每次修改后运行测试
3. **向后兼容**：避免破坏性变更
4. **代码审查**：提交 PR 前进行 review

## 下一步

- 阅读 [PDL 语法参考](pdl-reference.md)
- 查看 [Entity Registry 详解](entity-registry.md)
- 参考现有实体的实现

## 相关资源

- [Pegasus 官方文档](https://linkedin.github.io/rest.li/pdl_schema)
- [DataHub 贡献指南](https://github.com/datahub-project/datahub/blob/master/CONTRIBUTING.md)
- [DataHub 元数据建模指南](https://datahubproject.io/docs/modeling/metadata-model)
