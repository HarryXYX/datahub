# Metadata Models 模块文档

## 模块概述

`metadata-models` 模块是 DataHub 元数据平台的核心，定义了所有元数据的结构和关系。这是一个 **Schema First（模式优先）** 的模块，使用 **PDL (Pegasus Data Language)** 定义元数据模型，然后自动生成多种语言的代码（Java、Python、Avro Schema 等）。

### 核心特性

- **统一的元数据模型定义**：使用 PDL 定义所有实体和 Aspect
- **多语言代码生成**：自动生成 Java、Avro、JSON Schema、OpenAPI 规范
- **强类型系统**：确保元数据的类型安全和一致性
- **可扩展架构**：轻松添加新的实体和 Aspect
- **版本化设计**：支持元数据模型的演进和向后兼容

### 模块职责

1. **定义元数据模型**：所有实体（Entity）和方面（Aspect）的结构定义
2. **代码生成**：生成 Java 数据模型类、Avro Schema、JSON Schema
3. **注册管理**：通过 entity-registry.yml 管理实体-Aspect 映射关系
4. **类型系统**：提供强类型的元数据操作接口

## 目录结构

```
metadata-models/
├── build.gradle                                  # Gradle 构建脚本
├── docs/                                         # 模块相关文档
├── src/
│   ├── main/
│   │   ├── pegasus/                             # PDL Schema 定义目录
│   │   │   └── com/linkedin/
│   │   │       ├── common/                      # 通用类型和 Aspect
│   │   │       │   ├── Ownership.pdl           # 所有权 Aspect
│   │   │       │   ├── GlobalTags.pdl          # 标签 Aspect
│   │   │       │   ├── GlossaryTerms.pdl       # 术语 Aspect
│   │   │       │   └── ...
│   │   │       ├── dataset/                     # Dataset 相关定义
│   │   │       │   ├── DatasetProperties.pdl   # Dataset 属性
│   │   │       │   └── ...
│   │   │       ├── schema/                      # Schema 元数据
│   │   │       │   ├── SchemaMetadata.pdl      # Schema 定义
│   │   │       │   └── SchemaField.pdl         # 字段定义
│   │   │       ├── metadata/key/                # 实体 Key 定义
│   │   │       │   ├── DatasetKey.pdl          # Dataset Key
│   │   │       │   ├── DashboardKey.pdl        # Dashboard Key
│   │   │       │   └── ...
│   │   │       ├── datajob/                     # DataJob 定义
│   │   │       ├── dataflow/                    # DataFlow 定义
│   │   │       ├── dashboard/                   # Dashboard 定义
│   │   │       ├── chart/                       # Chart 定义
│   │   │       ├── glossary/                    # 术语表定义
│   │   │       ├── tag/                         # 标签定义
│   │   │       └── ...
│   │   ├── resources/
│   │   │   ├── entity-registry.yml              # 实体注册表（核心配置）
│   │   │   └── JavaSpring/                      # OpenAPI 代码生成模板
│   │   └── snapshot/                            # Pegasus 快照文件
│   └── test/                                     # 测试代码
│       └── java/
├── src/mainGeneratedAvroSchema/                 # 生成的 Avro Schema（构建时）
├── src/mainGeneratedDataTemplate/               # 生成的 Java 类（构建时）
└── src/generatedJsonSchema/                     # 生成的 JSON Schema（构建时）
```

## PDL Schema 概述

### 什么是 PDL？

PDL (Pegasus Data Language) 是 LinkedIn 开发的数据模式定义语言，类似于 Protocol Buffers 或 Avro IDL。DataHub 使用 PDL 定义所有元数据结构。

### PDL 基本语法

```pdl
namespace com.linkedin.example

/**
 * 文档注释会被包含在生成的代码中
 */
record ExampleRecord {
  /**
   * 字段文档
   */
  fieldName: string

  /**
   * 可选字段
   */
  optionalField: optional int

  /**
   * 带默认值的字段
   */
  defaultField: string = "default_value"

  /**
   * 数组字段
   */
  arrayField: array[string]

  /**
   * Map 字段
   */
  mapField: map[string, int]

  /**
   * Union 类型（多选一）
   */
  unionField: union[string, int, record CustomType {}]
}
```

### 核心注解

#### @Aspect 注解

标记一个 record 为 Aspect（元数据方面）：

```pdl
@Aspect = {
  "name": "datasetProperties"
}
record DatasetProperties {
  // ...
}
```

#### @Searchable 注解

配置字段的搜索行为：

```pdl
record DatasetProperties {
  @Searchable = {
    "fieldType": "WORD_GRAM",
    "enableAutocomplete": true,
    "boostScore": 10.0,
    "searchTier": 1
  }
  name: optional string
}
```

#### @Relationship 注解

定义实体之间的关系：

```pdl
record Ownership {
  @Relationship = {
    "/*": {
      "name": "OwnedBy",
      "entityTypes": [ "corpuser", "corpGroup" ]
    }
  }
  owners: array[Owner]
}
```

## 代码生成流程

### 构建流程图

```
PDL Schema Files (.pdl)
         ↓
    [Pegasus Plugin]
         ↓
    ┌────────────────────────────────┐
    │                                │
    ↓                                ↓
Java Data Templates         Avro Schema (.avsc)
(Java Classes)                      ↓
    ↓                      [GenerateJsonSchemaTask]
    │                               ↓
    │                      JSON Schema + OpenAPI
    │                               ↓
    │                      [GenerateSwaggerCode]
    │                               ↓
    └──────────→  OpenAPI Models (Java Classes)
```

### Gradle 任务说明

#### 1. generateDataTemplate

由 Pegasus Gradle 插件提供，从 PDL 生成 Java 数据类：

```bash
./gradlew :metadata-models:generateDataTemplate
```

生成位置：`src/mainGeneratedDataTemplate/java/`

#### 2. generateAvroSchema

生成 Avro Schema 文件：

```bash
./gradlew :metadata-models:generateAvroSchema
```

生成位置：`src/mainGeneratedAvroSchema/`

#### 3. generateJsonSchema

自定义任务，从 Avro Schema 生成 JSON Schema 和 OpenAPI 规范：

```bash
./gradlew :metadata-models:generateJsonSchema
```

生成位置：`src/generatedJsonSchema/`

配置代码（build.gradle）：

```groovy
task generateJsonSchema(type: GenerateJsonSchemaTask, dependsOn: 'generateAvroSchema') {
  it.setInputDirectory("$projectDir/src/mainGeneratedAvroSchema")
  it.setOutputDirectory("$projectDir/src/generatedJsonSchema")
  it.setEntityRegistryYaml("${project(':metadata-models').projectDir}/src/main/resources/entity-registry.yml")
}
```

#### 4. openApiGenerate

使用 Swagger Generator 从 OpenAPI 规范生成 Spring Models：

```bash
./gradlew :metadata-models:openApiGenerate
```

生成位置：`build/openapi/generated/`

配置代码（build.gradle）：

```groovy
task openApiGenerate(type: GenerateSwaggerCode, dependsOn: 'generateJsonSchema') {
  inputFile = file("$projectDir/src/generatedJsonSchema/combined/open-api.yaml")
  outputDir = file("$buildDir/openapi/generated")
  language = "spring"
  components = ["models"]
  templateDir = file("$projectDir/src/main/resources/JavaSpring")
  additionalProperties = [
    'group-id'           : "io.datahubproject",
    'dateLibrary'        : "java8",
    'java11'             : "true",
    'modelPropertyNaming': "original",
    'modelPackage'       : "io.datahubproject.openapi.generated"
  ]
}
```

### 构建整个模块

```bash
# 完整构建（包含所有代码生成）
./gradlew :metadata-models:build

# 仅编译（会触发必要的代码生成）
./gradlew :metadata-models:compileJava
```

## 核心概念

### Entity（实体）

实体是 DataHub 中的顶级元数据对象，例如：

- **Dataset**：数据集（表、视图、流等）
- **Dashboard**：仪表板
- **Chart**：图表
- **DataJob**：数据作业
- **DataFlow**：数据流程（Pipeline）
- **CorpUser**：企业用户
- **CorpGroup**：企业组织
- **GlossaryTerm**：术语表术语
- **Tag**：标签

每个实体必须有一个 **Key Aspect**，用于唯一标识实体。

### Aspect（方面）

Aspect 是描述实体某一方面的元数据片段。同一个 Aspect 可以被多个实体复用。

常见 Aspect：

- **Ownership**：所有权信息
- **GlobalTags**：标签
- **GlossaryTerms**：关联的术语
- **Deprecation**：弃用信息
- **InstitutionalMemory**：文档链接
- **SchemaMetadata**：Schema 定义

### URN（统一资源名称）

DataHub 使用 URN 作为实体的全局唯一标识符。

URN 格式：

```
urn:li:<entity_type>:(<key_field_1>,<key_field_2>,...)
```

示例：

```
# Dataset URN
urn:li:dataset:(urn:li:dataPlatform:mysql,my_db.users_table,PROD)

# Dashboard URN
urn:li:dashboard:(looker,dashboard_123)

# User URN
urn:li:corpuser:john.doe
```

## Entity Registry 核心作用

`entity-registry.yml` 是 DataHub 元数据模型的注册中心，定义了：

1. **所有实体及其类型**
2. **每个实体关联的 Aspects**
3. **实体的搜索分组**
4. **实体的分类（core、internal 等）**

示例配置：

```yaml
entities:
  - name: dataset
    doc: Datasets represent logical or physical data assets
    category: core
    keyAspect: datasetKey
    searchGroup: primary
    aspects:
      - datasetProperties
      - schemaMetadata
      - ownership
      - globalTags
      - glossaryTerms
      - upstreamLineage
      # ... 更多 aspects
```

详细配置说明请参考 [Entity Registry 文档](entity-registry.md)。

## 使用场景

### 1. 查询元数据模型定义

开发人员可以查看 PDL 文件了解元数据结构：

```bash
# 查看 Dataset 属性定义
cat src/main/pegasus/com/linkedin/dataset/DatasetProperties.pdl

# 查看 Ownership Aspect 定义
cat src/main/pegasus/com/linkedin/common/Ownership.pdl
```

### 2. 扩展元数据模型

添加新的自定义字段或 Aspect（详见[开发指南](development.md)）。

### 3. API 集成

生成的 Java 类和 JSON Schema 用于：

- **GMS (Generalized Metadata Service)**: 后端服务使用 Java 类
- **GraphQL API**: 使用生成的类型定义
- **REST API**: 使用 OpenAPI 规范
- **Python Ingestion**: 使用 Avro Schema

### 4. 数据验证

生成的 Schema 用于验证元数据的完整性和正确性。

## 常用命令速查

```bash
# 查看所有实体定义
grep -r "^  - name:" src/main/resources/entity-registry.yml

# 查看所有 Aspect 定义
find src/main/pegasus -name "*.pdl" -exec grep -l "@Aspect" {} \;

# 生成代码（完整流程）
./gradlew :metadata-models:build

# 清理生成的代码
./gradlew :metadata-models:clean

# 查看生成的 Java 类
ls -la build/classes/java/main/com/linkedin/

# 查看生成的 Avro Schema
ls -la src/mainGeneratedAvroSchema/
```

## 最佳实践

### 1. 只修改 PDL 文件

**永远不要手动修改生成的代码**。所有更改都应该在 PDL 文件中完成，然后重新生成代码。

### 2. 向后兼容性

在修改现有 PDL Schema 时，遵循以下规则确保向后兼容：

- ✅ 添加新的 optional 字段
- ✅ 添加新的 Aspect
- ✅ 扩展 enum 值
- ❌ 删除字段
- ❌ 更改字段类型
- ❌ 将 optional 字段改为 required

### 3. 命名规范

- **实体名称**：使用 PascalCase（如 `DataProduct`）
- **Aspect 名称**：使用 camelCase（如 `datasetProperties`）
- **字段名称**：使用 camelCase（如 `displayName`）

### 4. 文档注释

为所有 record、字段添加清晰的文档注释：

```pdl
/**
 * Dataset 的基本属性信息
 *
 * 包含名称、描述、创建时间等核心属性
 */
@Aspect = {
  "name": "datasetProperties"
}
record DatasetProperties {
  /**
   * Dataset 的显示名称
   *
   * 用于 UI 展示，支持全文搜索
   */
  @Searchable = {
    "fieldType": "WORD_GRAM",
    "enableAutocomplete": true
  }
  name: optional string
}
```

## 相关文档

- [Entity Registry 配置详解](entity-registry.md)
- [PDL 语法参考](pdl-reference.md)
- [开发指南：添加自定义 Entity 和 Aspect](development.md)
- [核心实体文档](entities/)
  - [Dataset Entity](entities/dataset.md)
  - [Dashboard Entity](entities/dashboard.md)
  - [DataJob/DataFlow](entities/data-jobs.md)
  - [User/Group](entities/users-groups.md)
- [核心 Aspect 文档](aspects/)
  - [Ownership Aspect](aspects/ownership.md)
  - [Schema Metadata Aspect](aspects/schema-metadata.md)
  - [Lineage Aspect](aspects/lineage.md)
  - [Tags/Terms Aspect](aspects/tags-terms.md)

## 外部资源

- [Pegasus 官方文档](https://linkedin.github.io/rest.li/pdl_schema)
- [DataHub 官方文档 - 元数据建模](https://datahubproject.io/docs/modeling/metadata-model)
- [Rest.li Pegasus 数据格式](https://linkedin.github.io/rest.li/DATA-Data-Schema-and-Templates)
