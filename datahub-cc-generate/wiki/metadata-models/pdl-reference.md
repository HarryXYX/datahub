# PDL (Pegasus Data Language) 语法参考

## 概述

PDL (Pegasus Data Language) 是 LinkedIn 开发的数据模式定义语言，用于定义强类型的数据结构。DataHub 使用 PDL 定义所有元数据模型。

## 基本结构

### Namespace

每个 PDL 文件必须以 namespace 声明开始：

```pdl
namespace com.linkedin.mypackage
```

**规则**：
- 必须是第一行（注释除外）
- 使用 Java 包命名约定
- 对应生成的 Java 类的包名

### Import

导入其他 PDL 文件中定义的类型：

```pdl
import com.linkedin.common.Urn
import com.linkedin.common.AuditStamp
```

**规则**：
- 在 namespace 之后，类型定义之前
- 每个 import 一行
- 只导入直接使用的类型

## 数据类型

### 基本类型（Primitive Types）

| 类型 | 描述 | 示例 |
|-----|------|------|
| `boolean` | 布尔值 | `true`, `false` |
| `int` | 32 位整数 | `42`, `-100` |
| `long` | 64 位整数 | `1234567890L` |
| `float` | 32 位浮点数 | `3.14f` |
| `double` | 64 位浮点数 | `3.14159` |
| `string` | 字符串 | `"hello"` |
| `bytes` | 字节数组 | 二进制数据 |

### 复杂类型

#### Record（记录）

定义结构化数据：

```pdl
/**
 * User information record
 */
record User {
  /**
   * User ID
   */
  id: long

  /**
   * User name
   */
  name: string

  /**
   * User email (optional)
   */
  email: optional string

  /**
   * User is active (with default value)
   */
  active: boolean = true
}
```

#### Enum（枚举）

定义一组固定的值：

```pdl
/**
 * User status enum
 */
enum UserStatus {
  /**
   * User is active
   */
  ACTIVE

  /**
   * User is inactive
   */
  INACTIVE

  /**
   * User is suspended
   */
  SUSPENDED
}
```

#### Array（数组）

定义列表类型：

```pdl
record Team {
  /**
   * List of team members
   */
  members: array[string]

  /**
   * List of projects
   */
  projects: array[Project]
}
```

#### Map（映射）

定义键值对：

```pdl
record Configuration {
  /**
   * Configuration properties
   */
  properties: map[string, string]

  /**
   * Complex configuration
   */
  settings: map[string, ConfigValue]
}
```

#### Union（联合类型）

定义多选一的类型：

```pdl
record Notification {
  /**
   * Notification content (can be string or structured)
   */
  content: union[string, StructuredContent]
}
```

**Union 使用示例**：

```pdl
// 简单 union
field: union[string, int]

// 复杂 union
platformSchema: union[
  MySqlDDL,
  OracleDDL,
  KafkaSchema
]
```

## 字段修饰符

### Optional 字段

字段可以不存在：

```pdl
record User {
  name: string           // required（必需）
  email: optional string // optional（可选）
}
```

### 默认值

为字段指定默认值：

```pdl
record Configuration {
  enabled: boolean = true
  timeout: int = 30
  mode: string = "production"
  tags: array[string] = []
  properties: map[string, string] = {}
}
```

**规则**：
- 默认值必须与字段类型匹配
- array 默认值：`[]`
- map 默认值：`{}`
- record 默认值：不推荐使用

## 注解（Annotations）

### @Aspect 注解

标记 record 为 Aspect：

```pdl
@Aspect = {
  "name": "datasetProperties"
}
record DatasetProperties {
  // fields...
}
```

**参数**：
- `name`: Aspect 名称（必需）

### @Searchable 注解

配置字段的搜索行为：

#### 基本搜索配置

```pdl
record Dataset {
  @Searchable = {
    "fieldType": "TEXT",
    "fieldName": "datasetName"
  }
  name: string
}
```

#### 完整搜索配置

```pdl
@Searchable = {
  // 字段类型（必需）
  "fieldType": "WORD_GRAM",

  // 字段名称（可选，默认使用字段名）
  "fieldName": "customName",

  // 启用自动补全
  "enableAutocomplete": true,

  // 搜索权重（越高越重要）
  "boostScore": 10.0,

  // 字段别名
  "fieldNameAliases": [ "_entityName", "title" ],

  // 搜索层级（1 最高）
  "searchTier": 1,

  // 搜索标签
  "searchLabel": "entityName",

  // 是否在默认查询中包含
  "queryByDefault": true,

  // 是否添加到过滤器
  "addToFilters": true,

  // 过滤器显示名称
  "filterNameOverride": "Dataset Name",

  // 是否有值字段名
  "hasValuesFieldName": "hasName"
}
name: string
```

#### fieldType 类型

| 类型 | 描述 | 适用场景 |
|-----|------|---------|
| `TEXT` | 全文搜索 | 描述、文档 |
| `TEXT_PARTIAL` | 部分匹配文本 | 名称、标题 |
| `WORD_GRAM` | N-gram 分词 | 自动补全 |
| `KEYWORD` | 精确匹配 | 标签、状态、枚举 |
| `URN` | URN 类型 | 实体引用 |
| `BOOLEAN` | 布尔值 | 标志位 |
| `COUNT` | 数值计数 | 统计数据 |
| `DATETIME` | 日期时间 | 时间戳 |
| `OBJECT` | 嵌套对象 | 复杂结构 |
| `MAP_ARRAY` | Map 数组 | 键值对列表 |

#### 嵌套字段搜索

```pdl
record User {
  @Searchable = {
    "/time": {
      "fieldName": "createdAt",
      "fieldType": "DATETIME"
    }
  }
  created: TimeStamp
}
```

### @Relationship 注解

定义实体之间的关系：

#### 简单关系

```pdl
record Ownership {
  @Relationship = {
    "name": "OwnedBy",
    "entityTypes": [ "corpuser", "corpGroup" ]
  }
  owner: Urn
}
```

#### 数组关系

```pdl
record Dashboard {
  @Relationship = {
    "/*": {
      "name": "Contains",
      "entityTypes": [ "chart" ],
      "isLineage": true
    }
  }
  charts: array[ChartUrn]
}
```

#### 嵌套关系

```pdl
record DashboardInfo {
  @Relationship = {
    "/*/destinationUrn": {
      "name": "Contains",
      "entityTypes": [ "chart" ],
      "isLineage": true,
      "createdOn": "chartEdges/*/created/time",
      "createdActor": "chartEdges/*/created/actor"
    }
  }
  chartEdges: array[Edge]
}
```

**参数**：
- `name`: 关系名称
- `entityTypes`: 目标实体类型列表
- `isLineage`: 是否为血缘关系
- `createdOn`: 创建时间字段路径
- `createdActor`: 创建者字段路径
- `updatedOn`: 更新时间字段路径
- `updatedActor`: 更新者字段路径

### @deprecated 注解

标记字段或类型为已弃用：

```pdl
record Dataset {
  /**
   * Old field (deprecated)
   */
  @deprecated
  oldField: optional string

  /**
   * Old field with reason
   */
  @deprecated = "Use newField instead"
  anotherOldField: optional string
}
```

### 自定义注解

```pdl
@validate.strlen = {
  "min": 1,
  "max": 100
}
name: string

@validate.regex = {
  "regex": "^[a-zA-Z0-9_]+$"
}
identifier: string
```

## 继承（Includes）

Record 可以继承其他 record 的字段：

```pdl
// Base record
record CustomProperties {
  customProperties: map[string, string] = {}
}

record ExternalReference {
  externalUrl: optional Url
}

// Inherited record
record DatasetProperties includes CustomProperties, ExternalReference {
  name: string
  description: optional string
  // 自动包含 customProperties 和 externalUrl
}
```

**规则**：
- 可以继承多个 record（多重继承）
- 继承的字段自动包含
- 不能覆盖继承的字段

## Typeref（类型引用）

定义类型别名：

```pdl
/**
 * Dataset URN
 */
typeref DatasetUrn = string

/**
 * Timestamp in milliseconds
 */
typeref TimeStamp = long
```

**用途**：
- 提供语义化的类型名称
- 便于类型约束和验证

## 文档注释

### 标准文档注释

```pdl
/**
 * User information record
 *
 * This record contains basic user information including
 * identity, contact details, and status.
 */
record User {
  /**
   * Unique user identifier
   *
   * This ID is assigned by the system and cannot be changed.
   */
  id: long
}
```

### 推荐格式

```pdl
/**
 * 简短描述（一句话）
 *
 * 详细描述（可选）
 * 可以包含多段文字
 *
 * @see RelatedType
 * @deprecated Use NewType instead
 */
```

## 完整示例

### 示例 1：简单 Aspect

```pdl
namespace com.linkedin.dataset

import com.linkedin.common.Urn
import com.linkedin.common.AuditStamp

/**
 * Dataset deprecation information
 */
@Aspect = {
  "name": "deprecation"
}
record Deprecation {
  /**
   * Whether the dataset is deprecated
   */
  @Searchable = {
    "fieldType": "BOOLEAN",
    "weightsPerFieldValue": { "true": 0.5 }
  }
  deprecated: boolean

  /**
   * Deprecation note
   */
  @Searchable = {
    "fieldType": "TEXT"
  }
  note: string

  /**
   * Deprecation timestamp
   */
  @Searchable = {
    "/time": {
      "fieldName": "deprecatedAt",
      "fieldType": "DATETIME"
    }
  }
  decommissionTime: optional AuditStamp

  /**
   * Actor who deprecated the dataset
   */
  @Relationship = {
    "name": "DeprecatedBy",
    "entityTypes": [ "corpuser" ]
  }
  actor: optional Urn
}
```

### 示例 2：复杂 Aspect

```pdl
namespace com.linkedin.schema

import com.linkedin.common.Urn
import com.linkedin.common.AuditStamp

/**
 * Schema metadata for a dataset
 */
@Aspect = {
  "name": "schemaMetadata"
}
record SchemaMetadata {
  /**
   * Schema name
   */
  schemaName: string

  /**
   * Platform URN
   */
  @Searchable = {
    "fieldType": "URN"
  }
  platform: Urn

  /**
   * Schema version
   */
  version: long

  /**
   * Schema hash (SHA1)
   */
  hash: string

  /**
   * Native schema representation
   */
  platformSchema: union[
    MySqlDDL,
    OracleDDL,
    KafkaSchema,
    OtherSchema
  ]

  /**
   * List of fields
   */
  fields: array[SchemaField]

  /**
   * Primary key fields
   */
  primaryKeys: optional array[string] = []

  /**
   * Foreign key constraints
   */
  foreignKeys: optional array[ForeignKeyConstraint] = []

  /**
   * Creation and modification timestamps
   */
  created: optional AuditStamp
  lastModified: optional AuditStamp
}

/**
 * Schema field definition
 */
record SchemaField {
  /**
   * Field path
   */
  @Searchable = {
    "fieldType": "KEYWORD"
  }
  fieldPath: string

  /**
   * Native data type
   */
  nativeDataType: string

  /**
   * DataHub type
   */
  type: SchemaFieldDataType

  /**
   * Field description
   */
  @Searchable = {
    "fieldType": "TEXT"
  }
  description: optional string

  /**
   * Nullable flag
   */
  nullable: boolean = true

  /**
   * Is part of primary key
   */
  isPartOfKey: boolean = false
}
```

## 常见模式

### 模式 1：可编辑 Aspect

为用户可编辑的元数据创建单独的 Aspect：

```pdl
// 系统生成的属性
@Aspect = {
  "name": "datasetProperties"
}
record DatasetProperties {
  name: string
  created: TimeStamp
}

// 用户可编辑的属性
@Aspect = {
  "name": "editableDatasetProperties"
}
record EditableDatasetProperties {
  description: optional string
  tags: array[string] = []
}
```

### 模式 2：审计信息

始终包含审计信息：

```pdl
import com.linkedin.common.AuditStamp

record MyAspect {
  // ... 其他字段 ...

  /**
   * Last modified audit stamp
   */
  lastModified: AuditStamp
}
```

### 模式 3：自定义属性

支持扩展性：

```pdl
record MyAspect {
  // 标准字段
  name: string
  description: optional string

  // 自定义属性（key-value）
  customProperties: map[string, string] = {}
}
```

## 最佳实践

### 命名约定

- **Record**: PascalCase（如 `DatasetProperties`）
- **Field**: camelCase（如 `datasetName`）
- **Enum**: UPPER_SNAKE_CASE（如 `FABRIC_TYPE`）
- **Namespace**: lowercase.with.dots（如 `com.linkedin.dataset`）

### 字段设计

✅ **推荐**：
- 优先使用 optional 字段
- 为 boolean 字段提供默认值
- 为 array 和 map 提供空默认值
- 添加完整的文档注释

❌ **避免**：
- 使用 required 字段（除非绝对必要）
- 嵌套过深（超过 3 层）
- 字段名称过长或含糊

### 注解使用

- 为关键字段添加 @Searchable
- 为实体引用添加 @Relationship
- 为弃用字段添加 @deprecated
- 使用正确的 fieldType

## 工具和调试

### 验证 PDL 语法

```bash
# 编译检查
./gradlew :metadata-models:build

# 查看生成的 Avro Schema
cat metadata-models/src/mainGeneratedAvroSchema/com/linkedin/mytype/MyType.avsc | jq
```

### 常见错误

#### 错误 1：Namespace 不匹配

```
Error: namespace 'com.linkedin.dataset' does not match file path
```

**解决**：确保 namespace 与文件路径一致。

#### 错误 2：类型未找到

```
Error: Unresolved type 'Urn'
```

**解决**：添加 import 语句。

#### 错误 3：循环依赖

```
Error: Circular dependency detected
```

**解决**：重构类型定义，避免循环引用。

## 相关文档

- [开发指南](development.md)
- [Entity Registry](entity-registry.md)
- [模块总览](README.md)

## 外部资源

- [Pegasus 官方文档](https://linkedin.github.io/rest.li/pdl_schema)
- [Rest.li Data Schema](https://linkedin.github.io/rest.li/DATA-Data-Schema-and-Templates)
- [Pegasus GitHub](https://github.com/linkedin/rest.li)
