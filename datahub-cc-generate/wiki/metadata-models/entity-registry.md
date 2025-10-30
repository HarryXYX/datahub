# Entity Registry 配置详解

## 概述

`entity-registry.yml` 是 DataHub 元数据模型的核心配置文件，位于 `metadata-models/src/main/resources/entity-registry.yml`。它定义了：

1. **所有实体类型**及其元数据
2. **实体与 Aspect 的关联关系**
3. **实体的搜索和分类配置**
4. **插件和扩展点配置**

这个文件是 DataHub 的"元数据的元数据"，在系统启动时被加载，用于：

- **路由请求**：根据实体类型路由 API 请求
- **验证数据**：确保只有注册的 Aspect 可以关联到实体
- **搜索索引**：配置搜索引擎的索引策略
- **代码生成**：生成 GraphQL Schema、OpenAPI 规范等

## 文件位置

```
metadata-models/src/main/resources/entity-registry.yml
```

## 整体结构

```yaml
entities:              # 实体列表（主要部分）
  - name: ...
    keyAspect: ...
    aspects: [...]
    # ... 更多配置

events:               # 事件配置（可选）

plugins:              # 插件配置
  aspectPayloadValidators: [...]
  mcpSideEffects: [...]
  mutationHooks: [...]
```

## 实体配置详解

### 基本实体定义

```yaml
entities:
  - name: dataset                    # 实体名称（必需）
    doc: |                          # 实体文档说明（可选）
      Datasets represent logical or physical data assets stored
      or represented in various data platforms.
    category: core                  # 实体分类（可选）
    keyAspect: datasetKey          # Key Aspect（必需）
    searchGroup: primary           # 搜索分组（可选）
    aspects:                       # 关联的 Aspect 列表（必需）
      - datasetProperties
      - schemaMetadata
      - ownership
      # ... 更多 aspects
```

### 字段说明

#### name（必需）

实体的唯一标识符。

- **格式**：camelCase
- **示例**：`dataset`, `dashboard`, `corpUser`, `dataJob`
- **用途**：
  - 构建 URN：`urn:li:{name}:...`
  - GraphQL 类型名称
  - REST API 路径

#### doc（可选）

实体的文档说明，支持多行文本。

```yaml
doc: |
  Datasets represent logical or physical data assets.
  Tables, Views, Streams are all instances of datasets.
```

#### category（可选）

实体分类，用于组织和权限控制。

**可选值**：

- `core`：核心业务实体（如 Dataset、Dashboard）
- `internal`：内部系统实体（如 DataHubPolicy、DataHubSecret）
- 不指定：默认为通用实体

**示例**：

```yaml
# 核心实体
- name: dataset
  category: core

# 内部实体
- name: dataHubPolicy
  category: internal
```

#### keyAspect（必需）

定义实体的 Key Aspect，用于唯一标识实体。

- **格式**：与 PDL 文件中定义的 Aspect 名称一致
- **特点**：
  - 每个实体必须有且仅有一个 keyAspect
  - keyAspect 包含构建 URN 所需的字段
  - keyAspect 不需要在 `aspects` 列表中重复声明

**示例**：

```yaml
- name: dataset
  keyAspect: datasetKey      # 对应 DatasetKey.pdl

- name: dashboard
  keyAspect: dashboardKey    # 对应 DashboardKey.pdl

- name: corpuser
  keyAspect: corpUserKey     # 对应 CorpUserKey.pdl
```

**DatasetKey 定义示例**（PDL）：

```pdl
// metadata-models/src/main/pegasus/com/linkedin/metadata/key/DatasetKey.pdl
@Aspect = {
  "name": "datasetKey"
}
record DatasetKey {
  platform: Urn      // 数据平台 URN
  name: string       // Dataset 名称
  origin: FabricType // 环境（PROD、DEV 等）
}
```

构建的 URN：

```
urn:li:dataset:(urn:li:dataPlatform:mysql,db.table,PROD)
                 ^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^  ^^^^
                        platform             name    origin
```

#### searchGroup（可选）

搜索索引分组，用于优化搜索性能和分类。

**可选值**：

- `primary`：主要可搜索实体（用户直接搜索的对象）
- `timeseries`：时间序列数据（如 DataProcessInstance）
- `schemaField`：Schema 字段级别搜索
- `query`：查询级别搜索
- 不指定：不参与主搜索索引

**示例**：

```yaml
# 主搜索实体
- name: dataset
  searchGroup: primary

# 时间序列实体
- name: dataProcessInstance
  searchGroup: timeseries

# Schema 字段搜索
- name: schemaField
  searchGroup: schemaField
```

#### aspects（必需）

实体关联的 Aspect 列表。

- **格式**：YAML 数组，按字母顺序排列（推荐）
- **要求**：
  - 每个 Aspect 必须在 PDL 文件中定义
  - keyAspect 不需要包含在此列表中
  - 可以包含多个实体共享的 Aspect

**示例**：

```yaml
- name: dataset
  keyAspect: datasetKey
  aspects:
    - access                          # 访问权限
    - applications                    # 关联的应用
    - browsePaths                     # 浏览路径
    - browsePathsV2                   # 浏览路径 V2
    - container                       # 容器关系
    - datasetDeprecation              # 弃用信息
    - datasetProfile                  # 数据剖析
    - datasetProperties               # 基本属性
    - datasetUpstreamLineage          # 上游血缘
    - dataPlatformInstance            # 平台实例
    - deprecation                     # 通用弃用
    - domains                         # 域归属
    - editableDatasetProperties       # 可编辑属性
    - editableSchemaMetadata          # 可编辑 Schema
    - embed                           # 嵌入配置
    - forms                           # 表单关联
    - globalTags                      # 全局标签
    - glossaryTerms                   # 术语关联
    - incidentsSummary                # 事件摘要
    - institutionalMemory             # 文档链接
    - operation                       # 操作记录
    - ownership                       # 所有权
    - schemaMetadata                  # Schema 元数据
    - siblings                        # 兄弟关系
    - status                          # 状态
    - structuredProperties            # 结构化属性
    - subTypes                        # 子类型
    - testResults                     # 测试结果
    - upstreamLineage                 # 上游血缘
    - viewProperties                  # 视图属性
```

## 实体示例详解

### 示例 1：Dataset（复杂实体）

```yaml
- name: dataset
  doc: |
    Datasets represent logical or physical data assets stored or
    represented in various data platforms. Tables, Views, Streams
    are all instances of datasets.
  category: core
  keyAspect: datasetKey
  searchGroup: primary
  aspects:
    - viewProperties              # 视图特有属性
    - subTypes                    # 子类型（Table、View 等）
    - datasetProfile              # 数据质量剖析
    - datasetUsageStatistics      # 使用统计
    - operation                   # 操作历史
    - domains                     # 所属域
    - applications                # 关联应用
    - schemaMetadata              # Schema 定义
    - status                      # 状态（已删除等）
    - container                   # 容器（Database、Schema）
    - deprecation                 # 弃用标记
    - testResults                 # 测试结果
    - siblings                    # 兄弟数据集
    - embed                       # 嵌入配置
    - incidentsSummary            # 事件汇总
    - datasetProperties           # 基本属性（名称、描述）
    - editableDatasetProperties   # 用户可编辑属性
    - datasetDeprecation          # Dataset 特定弃用
    - datasetUpstreamLineage      # Dataset 特定血缘
    - upstreamLineage             # 通用血缘
    - institutionalMemory         # 文档和链接
    - ownership                   # 所有者
    - editableSchemaMetadata      # 可编辑 Schema
    - globalTags                  # 标签
    - glossaryTerms               # 术语
    - browsePaths                 # 浏览路径
    - dataPlatformInstance        # 平台实例
    - browsePathsV2               # 浏览路径 V2
    - access                      # 访问级别
    - structuredProperties        # 结构化扩展属性
    - forms                       # 表单关联
    - partitionsSummary           # 分区汇总
    - versionProperties           # 版本属性
    - icebergCatalogInfo          # Iceberg 目录信息
    - logicalParent               # 逻辑父级
```

### 示例 2：CorpUser（用户实体）

```yaml
- name: corpuser
  doc: |
    CorpUser represents an identity of a person (or an account)
    in the enterprise.
  keyAspect: corpUserKey
  searchGroup: primary
  aspects:
    - corpUserInfo                # 用户基本信息（姓名、邮箱）
    - corpUserEditableInfo        # 可编辑信息
    - corpUserStatus              # 用户状态（激活、停用）
    - groupMembership             # 组成员关系
    - globalTags                  # 标签
    - status                      # 通用状态
    - corpUserCredentials         # 凭证信息
    - nativeGroupMembership       # 原生组成员
    - corpUserSettings            # 用户设置
    - origin                      # 来源系统
    - roleMembership              # 角色成员
    - structuredProperties        # 结构化属性
    - forms                       # 表单
    - testResults                 # 测试结果
    - subTypes                    # 子类型
    - slackUserInfo               # Slack 集成信息
```

### 示例 3：DataJob（作业实体）

```yaml
- name: dataJob
  keyAspect: dataJobKey
  searchGroup: primary
  aspects:
    - datahubIngestionRunSummary  # Ingestion 运行摘要
    - datahubIngestionCheckpoint  # Ingestion 检查点
    - domains                     # 所属域
    - applications                # 关联应用
    - deprecation                 # 弃用
    - versionInfo                 # 版本信息
    - dataJobInfo                 # 作业基本信息
    - dataJobInputOutput          # 输入输出
    - editableDataJobProperties   # 可编辑属性
    - ownership                   # 所有权
    - status                      # 状态
    - globalTags                  # 标签
    - browsePaths                 # 浏览路径
    - glossaryTerms               # 术语
    - institutionalMemory         # 文档
    - dataPlatformInstance        # 平台实例
    - container                   # 容器
    - browsePathsV2               # 浏览路径 V2
    - structuredProperties        # 结构化属性
    - forms                       # 表单
    - subTypes                    # 子类型
    - incidentsSummary            # 事件摘要
    - testResults                 # 测试结果
    - dataTransformLogic          # 转换逻辑
```

### 示例 4：GlossaryTerm（术语实体）

```yaml
- name: glossaryTerm
  category: core
  keyAspect: glossaryTermKey
  searchGroup: primary
  aspects:
    - glossaryTermInfo            # 术语基本信息
    - glossaryRelatedTerms        # 相关术语
    - institutionalMemory         # 文档
    - schemaMetadata              # Schema（如果术语有结构）
    - ownership                   # 所有者
    - deprecation                 # 弃用
    - domains                     # 所属域
    - applications                # 关联应用
    - status                      # 状态
    - browsePaths                 # 浏览路径
    - structuredProperties        # 结构化属性
    - forms                       # 表单
    - testResults                 # 测试结果
    - subTypes                    # 子类型
    - assetSettings               # 资产设置
```

### 示例 5：DataHubPolicy（内部实体）

```yaml
- name: dataHubPolicy
  doc: |
    DataHub Policies represent access policies granted to users or
    groups on metadata operations like edit, view etc.
  category: internal         # 内部实体
  keyAspect: dataHubPolicyKey
  aspects:
    - dataHubPolicyInfo      # 策略信息
```

## 常见 Aspect 说明

### 通用 Aspect

这些 Aspect 可以被多个实体共享：

| Aspect 名称 | 描述 | 适用实体 |
|------------|------|---------|
| `ownership` | 所有权信息（Owner、Ownership Type） | 大部分实体 |
| `globalTags` | 全局标签 | 大部分实体 |
| `glossaryTerms` | 术语关联 | 大部分实体 |
| `domains` | 域归属 | 大部分实体 |
| `applications` | 应用关联 | 大部分实体 |
| `institutionalMemory` | 文档链接 | 大部分实体 |
| `deprecation` | 弃用标记 | 大部分实体 |
| `status` | 实体状态（软删除） | 大部分实体 |
| `browsePaths` | 浏览路径 | 大部分实体 |
| `browsePathsV2` | 浏览路径 V2 | 大部分实体 |
| `dataPlatformInstance` | 平台实例 | 大部分数据资产 |
| `structuredProperties` | 结构化扩展属性 | 大部分实体 |
| `forms` | 表单关联 | 大部分实体 |
| `testResults` | 测试结果 | 大部分实体 |
| `subTypes` | 子类型 | 大部分实体 |
| `container` | 容器关系 | 大部分数据资产 |

### 实体特定 Aspect

| Aspect 名称 | 描述 | 适用实体 |
|------------|------|---------|
| `datasetProperties` | Dataset 属性 | Dataset |
| `schemaMetadata` | Schema 元数据 | Dataset, GlossaryTerm |
| `upstreamLineage` | 上游血缘 | Dataset, Dashboard, Chart |
| `dataJobInfo` | DataJob 信息 | DataJob |
| `dataJobInputOutput` | DataJob 输入输出 | DataJob |
| `dashboardInfo` | Dashboard 信息 | Dashboard |
| `chartInfo` | Chart 信息 | Chart |
| `corpUserInfo` | 用户信息 | CorpUser |
| `corpGroupInfo` | 组信息 | CorpGroup |
| `glossaryTermInfo` | 术语信息 | GlossaryTerm |
| `domainProperties` | 域属性 | Domain |

### 可编辑 Aspect

这些 Aspect 允许用户通过 UI 编辑：

| Aspect 名称 | 描述 |
|------------|------|
| `editableDatasetProperties` | 可编辑的 Dataset 属性 |
| `editableSchemaMetadata` | 可编辑的 Schema 元数据 |
| `editableDataJobProperties` | 可编辑的 DataJob 属性 |
| `editableDashboardProperties` | 可编辑的 Dashboard 属性 |
| `editableChartProperties` | 可编辑的 Chart 属性 |
| `corpUserEditableInfo` | 可编辑的用户信息 |
| `corpGroupEditableInfo` | 可编辑的组信息 |

## 插件配置

Entity Registry 还支持配置插件和扩展点。

### 插件类型

```yaml
plugins:
  aspectPayloadValidators:    # Aspect 验证器
  mcpSideEffects:            # MCP 副作用处理
  mutationHooks:             # 变更钩子
```

### Aspect Payload Validators

验证 Aspect 数据的有效性：

```yaml
plugins:
  aspectPayloadValidators:
    - className: 'com.linkedin.metadata.aspect.plugins.validation.AspectPayloadValidator'
      enabled: true
      spring:
        enabled: true
      packageScan:
        - com.linkedin.gms.factory.plugins
```

**用途**：

- 验证 Aspect 数据结构
- 检查业务规则
- 防止无效数据写入

**示例验证器**：

- `SystemPolicyValidator`：验证策略配置
- `PolicyFieldTypeValidator`：验证策略字段类型

### MCP Side Effects

Metadata Change Proposal（MCP）副作用处理：

```yaml
plugins:
  mcpSideEffects:
    - className: 'com.linkedin.metadata.aspect.plugins.hooks.MCPSideEffect'
      enabled: true
      spring:
        enabled: true
      packageScan:
        - com.linkedin.gms.factory.plugins
```

**用途**：

- 在元数据变更后执行额外操作
- 触发其他系统的更新
- 维护派生数据

### Mutation Hooks

变更前后的钩子：

```yaml
plugins:
  mutationHooks:
    - className: 'com.linkedin.metadata.aspect.plugins.hooks.MutationHook'
      enabled: true
      spring:
        enabled: true
      packageScan:
        - com.linkedin.gms.factory.plugins
```

**用途**：

- 变更前验证
- 变更后通知
- 审计日志

## 如何注册新实体

### 步骤 1：定义 Key Aspect

创建 PDL 文件定义实体的 Key：

```pdl
// src/main/pegasus/com/linkedin/metadata/key/MyEntityKey.pdl
namespace com.linkedin.metadata.key

@Aspect = {
  "name": "myEntityKey"
}
record MyEntityKey {
  /**
   * 唯一标识符
   */
  id: string

  /**
   * 可选的第二个 Key 字段
   */
  type: optional string
}
```

### 步骤 2：定义实体的 Aspects

创建实体特定的 Aspect：

```pdl
// src/main/pegasus/com/linkedin/myentity/MyEntityProperties.pdl
namespace com.linkedin.myentity

import com.linkedin.common.CustomProperties

@Aspect = {
  "name": "myEntityProperties"
}
record MyEntityProperties includes CustomProperties {
  /**
   * 显示名称
   */
  @Searchable = {
    "fieldType": "WORD_GRAM",
    "enableAutocomplete": true,
    "boostScore": 10.0
  }
  name: string

  /**
   * 描述
   */
  @Searchable = {
    "fieldType": "TEXT",
    "hasValuesFieldName": "hasDescription"
  }
  description: optional string
}
```

### 步骤 3：在 Entity Registry 中注册

编辑 `entity-registry.yml`：

```yaml
entities:
  # ... 现有实体 ...

  - name: myEntity              # 新实体
    doc: |
      MyEntity 代表...
    category: core              # 或 internal
    keyAspect: myEntityKey      # 步骤 1 定义的 Key
    searchGroup: primary        # 如果需要搜索
    aspects:
      - myEntityProperties      # 步骤 2 定义的 Aspect
      - ownership               # 复用通用 Aspect
      - globalTags
      - glossaryTerms
      - domains
      - applications
      - institutionalMemory
      - status
      - deprecation
      - structuredProperties
      - forms
      # ... 根据需要添加更多 aspects
```

### 步骤 4：重新构建

```bash
./gradlew :metadata-models:build
```

### 步骤 5：更新 GraphQL Schema（如果需要）

在 `datahub-graphql-core` 模块中添加 GraphQL 类型定义。

## 如何添加新 Aspect 到现有实体

### 步骤 1：定义 Aspect

创建 PDL 文件：

```pdl
// src/main/pegasus/com/linkedin/myentity/MyNewAspect.pdl
namespace com.linkedin.myentity

@Aspect = {
  "name": "myNewAspect"
}
record MyNewAspect {
  field1: string
  field2: optional int
}
```

### 步骤 2：在 Entity Registry 中添加

```yaml
- name: dataset
  keyAspect: datasetKey
  aspects:
    # ... 现有 aspects ...
    - myNewAspect          # 添加新 Aspect
```

### 步骤 3：重新构建

```bash
./gradlew :metadata-models:build
```

## 验证配置

### 检查 Entity Registry 语法

```bash
# 使用 YAML 验证工具
yamllint src/main/resources/entity-registry.yml

# 或使用 Python
python3 -c "import yaml; yaml.safe_load(open('src/main/resources/entity-registry.yml'))"
```

### 测试构建

```bash
# 完整构建（包含验证）
./gradlew :metadata-models:build

# 检查生成的文件
ls -la src/mainGeneratedDataTemplate/java/
```

## 常见错误

### 错误 1：Aspect 未在 PDL 中定义

**错误信息**：

```
Aspect 'unknownAspect' is not defined in any PDL file
```

**解决方法**：

确保 Aspect 在 PDL 文件中定义，并标记了 `@Aspect` 注解。

### 错误 2：keyAspect 不存在

**错误信息**：

```
Key aspect 'unknownKey' for entity 'myEntity' not found
```

**解决方法**：

确保 keyAspect 引用的 Aspect 存在，并且在 PDL 文件中正确定义。

### 错误 3：重复的实体名称

**错误信息**：

```
Duplicate entity name 'dataset'
```

**解决方法**：

确保每个实体名称在 entity-registry.yml 中是唯一的。

### 错误 4：Aspect 名称不匹配

**错误信息**：

```
Aspect name mismatch: PDL defines 'datasetProperties' but registry uses 'DatasetProperties'
```

**解决方法**：

确保 entity-registry.yml 中的 Aspect 名称与 PDL 文件中 `@Aspect.name` 完全一致（区分大小写）。

## 最佳实践

### 1. 按字母顺序组织 Aspects

便于维护和查找：

```yaml
aspects:
  - access
  - applications
  - browsePaths
  - container
  - datasetProperties
  - domains
  - ownership
  # ...
```

### 2. 为实体添加文档

使用 `doc` 字段提供清晰的说明：

```yaml
- name: myEntity
  doc: |
    MyEntity 代表...

    用于场景：
    - 场景 1
    - 场景 2
```

### 3. 合理使用 category

- 业务实体使用 `core`
- 系统内部实体使用 `internal`
- 不确定时不指定

### 4. 复用通用 Aspects

大部分实体应该包含以下通用 Aspects：

```yaml
aspects:
  - ownership
  - globalTags
  - glossaryTerms
  - domains
  - applications
  - institutionalMemory
  - status
  - deprecation
  - structuredProperties
  - forms
  - testResults
```

### 5. 谨慎使用 searchGroup

只有需要在全局搜索中直接展示的实体才应该设置 `searchGroup: primary`。

## 查询和分析工具

### 列出所有实体

```bash
grep -E "^  - name:" src/main/resources/entity-registry.yml | sed 's/.*name: //'
```

### 统计实体数量

```bash
grep -c "^  - name:" src/main/resources/entity-registry.yml
```

### 查找使用特定 Aspect 的实体

```bash
# 查找使用 ownership Aspect 的实体
awk '/^  - name:/ {entity=$3} /^      - ownership$/ {print entity}' \
  src/main/resources/entity-registry.yml
```

### 列出实体的所有 Aspects

```bash
# 列出 dataset 实体的所有 aspects
awk '/^  - name: dataset$/,/^  - name:/ {print}' \
  src/main/resources/entity-registry.yml | \
  grep "^      -" | sed 's/.*- //'
```

## 相关文档

- [模块总览](README.md)
- [PDL 语法参考](pdl-reference.md)
- [开发指南](development.md)
- [核心实体文档](entities/)

## 外部资源

- [DataHub Entity Model 官方文档](https://datahubproject.io/docs/metadata-modeling/metadata-model/)
- [Entity Registry 源码](https://github.com/datahub-project/datahub/blob/master/entity-registry/src/main/java/com/linkedin/metadata/models/registry/EntityRegistry.java)
