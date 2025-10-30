# Tags 和 Glossary Terms Aspect 文档

## 概述

DataHub 提供两种语义标注机制：

- **GlobalTags（标签）**: 轻量级的分类和标记
- **GlossaryTerms（术语）**: 业务术语和词汇表管理

两者都用于增强元数据的可发现性和治理能力。

## GlobalTags Aspect

### 定义文件

`com/linkedin/common/GlobalTags.pdl`

### Aspect 名称

```
globalTags
```

### 适用实体

几乎所有实体：
- Dataset
- Dashboard
- Chart
- DataJob
- DataFlow
- SchemaField（字段级标签）
- CorpUser
- CorpGroup

### PDL 定义

```pdl
@Aspect = {
  "name": "globalTags"
}
record GlobalTags {
  /**
   * Tags associated with the entity
   */
  @Relationship = {
    "/*/tag": {
      "name": "TaggedWith",
      "entityTypes": [ "tag" ]
    }
  }
  tags: array[TagAssociation]
}
```

### TagAssociation 结构

```pdl
record TagAssociation {
  /**
   * Tag URN
   */
  tag: TagUrn

  /**
   * Optional context/description
   */
  context: optional string

  /**
   * Attribution information
   */
  attribution: optional MetadataAttribution
}
```

### 使用示例

#### 实体级标签

```json
{
  "tags": [
    {
      "tag": "urn:li:tag:pii",
      "context": "Contains personally identifiable information"
    },
    {
      "tag": "urn:li:tag:gdpr-compliant"
    },
    {
      "tag": "urn:li:tag:high-priority"
    },
    {
      "tag": "urn:li:tag:deprecated",
      "context": "Scheduled for removal in Q2 2024"
    }
  ]
}
```

#### 字段级标签

在 SchemaField 中：

```json
{
  "fieldPath": "customer_email",
  "nativeDataType": "VARCHAR",
  "globalTags": {
    "tags": [
      {
        "tag": "urn:li:tag:pii"
      },
      {
        "tag": "urn:li:tag:sensitive"
      }
    ]
  }
}
```

## GlossaryTerms Aspect

### 定义文件

`com/linkedin/common/GlossaryTerms.pdl`

### Aspect 名称

```
glossaryTerms
```

### 适用实体

- Dataset
- Dashboard
- Chart
- DataJob
- DataFlow
- SchemaField（字段级术语）
- MLModel

### PDL 定义

```pdl
@Aspect = {
  "name": "glossaryTerms"
}
record GlossaryTerms {
  /**
   * Related business terms
   */
  terms: array[GlossaryTermAssociation]

  /**
   * Audit stamp
   */
  auditStamp: AuditStamp
}
```

### GlossaryTermAssociation 结构

```pdl
record GlossaryTermAssociation {
  /**
   * Glossary term URN
   */
  @Relationship = {
    "name": "TermedWith",
    "entityTypes": [ "glossaryTerm" ]
  }
  urn: GlossaryTermUrn

  /**
   * Optional context
   */
  context: optional string

  /**
   * Attribution information
   */
  attribution: optional MetadataAttribution
}
```

### 使用示例

#### 实体级术语

```json
{
  "terms": [
    {
      "urn": "urn:li:glossaryTerm:CustomerData.CustomerEmail"
    },
    {
      "urn": "urn:li:glossaryTerm:SalesMetrics.Revenue",
      "context": "Represents total revenue including taxes"
    }
  ],
  "auditStamp": {
    "time": 1640995200000,
    "actor": "urn:li:corpuser:data_steward"
  }
}
```

#### 字段级术语

```json
{
  "fieldPath": "total_revenue",
  "nativeDataType": "DECIMAL",
  "glossaryTerms": {
    "terms": [
      {
        "urn": "urn:li:glossaryTerm:Finance.Revenue"
      },
      {
        "urn": "urn:li:glossaryTerm:Metrics.KPI"
      }
    ],
    "auditStamp": {
      "time": 1640995200000,
      "actor": "urn:li:corpuser:business_analyst"
    }
  }
}
```

## Tags vs Glossary Terms

### 对比表

| 特性 | Tags | Glossary Terms |
|-----|------|---------------|
| **用途** | 快速分类和标记 | 业务语义和定义 |
| **结构** | 扁平化 | 层次化（支持父子关系） |
| **创建** | 任何人可创建 | 通常由数据治理团队管理 |
| **文档** | 可选的简单描述 | 详细的定义和说明 |
| **关系** | 无层次关系 | 支持相关术语、同义词等 |
| **应用场景** | PII、敏感数据、环境标记 | 业务概念、KPI、数据域 |

### 何时使用 Tags

- 快速分类（如 `pii`, `deprecated`, `critical`）
- 技术标记（如 `partitioned`, `indexed`）
- 临时标记和实验
- 自动化标记（通过规则引擎）

### 何时使用 Glossary Terms

- 定义业务概念（如 `Customer`, `Revenue`）
- 建立企业词汇表
- 统一业务语言
- 关联相关概念

## 实际使用场景

### 场景 1：通过 Python SDK 添加标签

```python
from datahub.metadata.schema_classes import (
    GlobalTagsClass,
    TagAssociationClass
)

# 创建标签
global_tags = GlobalTagsClass(
    tags=[
        TagAssociationClass(
            tag="urn:li:tag:pii",
            context="Contains customer email and phone"
        ),
        TagAssociationClass(
            tag="urn:li:tag:gdpr-compliant"
        )
    ]
)

# 发送到 DataHub
emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn=dataset_urn,
        aspect=global_tags
    )
)
```

### 场景 2：添加术语

```python
from datahub.metadata.schema_classes import (
    GlossaryTermsClass,
    GlossaryTermAssociationClass,
    AuditStampClass
)

# 创建术语关联
glossary_terms = GlossaryTermsClass(
    terms=[
        GlossaryTermAssociationClass(
            urn="urn:li:glossaryTerm:CustomerData.Email"
        ),
        GlossaryTermAssociationClass(
            urn="urn:li:glossaryTerm:ContactInformation.PrimaryEmail",
            context="Primary email for customer communication"
        )
    ],
    auditStamp=AuditStampClass(
        time=1640995200000,
        actor="urn:li:corpuser:data_steward"
    )
)

emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn=dataset_urn,
        aspect=glossary_terms
    )
)
```

### 场景 3：创建标签

```python
from datahub.metadata.schema_classes import TagPropertiesClass

# 创建新标签
tag_properties = TagPropertiesClass(
    name="PII",
    description="Personally Identifiable Information that requires special handling",
    colorHex="#FF0000"
)

emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn="urn:li:tag:pii",
        aspect=tag_properties
    )
)
```

### 场景 4：创建术语表术语

```python
from datahub.metadata.schema_classes import (
    GlossaryTermInfoClass,
    GlossaryRelatedTermsClass
)

# 创建术语
term_info = GlossaryTermInfoClass(
    name="Customer",
    definition="An individual or organization that purchases products or services from the company",
    termSource="Business Glossary v2.0",
    sourceRef="https://wiki.company.com/glossary/customer",
    customProperties={
        "owner_team": "Data Governance",
        "review_date": "2024-12-31"
    }
)

# 创建相关术语
related_terms = GlossaryRelatedTermsClass(
    isRelatedTerms=[
        "urn:li:glossaryTerm:CustomerData.Prospect",  # 相关术语
        "urn:li:glossaryTerm:CustomerData.Client"
    ]
)

emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn="urn:li:glossaryTerm:CustomerData.Customer",
        aspect=term_info
    )
)

emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn="urn:li:glossaryTerm:CustomerData.Customer",
        aspect=related_terms
    )
)
```

### 场景 5：自动标记 PII 字段

```python
import re

# PII 检测规则
PII_PATTERNS = {
    "email": r"email|e_mail|mail",
    "phone": r"phone|telephone|mobile|cell",
    "ssn": r"ssn|social_security",
    "address": r"address|addr|street"
}

def auto_tag_pii_fields(dataset_urn, schema_metadata):
    """自动为 PII 字段添加标签"""
    for field in schema_metadata.fields:
        field_name_lower = field.fieldPath.lower()

        # 检测 PII 字段
        for pii_type, pattern in PII_PATTERNS.items():
            if re.search(pattern, field_name_lower):
                # 为字段添加 PII 标签
                field.globalTags = GlobalTagsClass(
                    tags=[
                        TagAssociationClass(
                            tag="urn:li:tag:pii",
                            context=f"Detected as {pii_type} field"
                        )
                    ]
                )
                break

    # 发送更新的 schema
    emitter.emit_mcp(
        MetadataChangeProposalWrapper(
            entityUrn=dataset_urn,
            aspect=schema_metadata
        )
    )
```

## 查询标签和术语

### GraphQL 查询标签

```graphql
query GetTags {
  dataset(urn: "urn:li:dataset:(...)") {
    tags {
      tags {
        tag {
          urn
          name
          properties {
            description
            colorHex
          }
        }
        context
      }
    }
    schemaMetadata {
      fields {
        fieldPath
        globalTags {
          tags {
            tag {
              name
            }
          }
        }
      }
    }
  }
}
```

### GraphQL 查询术语

```graphql
query GetGlossaryTerms {
  dataset(urn: "urn:li:dataset:(...)") {
    glossaryTerms {
      terms {
        term {
          urn
          name
          glossaryTermInfo {
            definition
            termSource
          }
        }
        context
      }
    }
  }
}
```

### 搜索带有特定标签的实体

```python
from datahub.ingestion.graph.client import DataHubGraph

client = DataHubGraph(DatahubClientConfig(server="http://localhost:8080"))

# 搜索带有 PII 标签的 Dataset
results = client.get_search_results(
    entity_types=["dataset"],
    query="*",
    filters=[
        {
            "field": "tags",
            "values": ["urn:li:tag:pii"]
        }
    ]
)

for result in results:
    print(f"PII Dataset: {result.entity.urn}")
```

## 术语表层次结构

### GlossaryNode（术语节点）

术语可以组织成层次结构：

```
Business Glossary (GlossaryNode)
  └── Customer Data (GlossaryNode)
        ├── Customer (GlossaryTerm)
        ├── Prospect (GlossaryTerm)
        └── Customer Email (GlossaryTerm)
  └── Sales Metrics (GlossaryNode)
        ├── Revenue (GlossaryTerm)
        └── Conversion Rate (GlossaryTerm)
```

### 创建术语节点

```python
from datahub.metadata.schema_classes import GlossaryNodeInfoClass

node_info = GlossaryNodeInfoClass(
    name="Customer Data",
    definition="Terms related to customer information and data"
)

emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn="urn:li:glossaryNode:CustomerData",
        aspect=node_info
    )
)
```

## 最佳实践

### 1. 标签规范

- 使用小写和连字符（如 `high-priority`）
- 建立标签分类体系（技术标签、业务标签、合规标签）
- 定期审查和清理未使用的标签

### 2. 术语管理

- 由数据治理团队统一管理
- 提供清晰的定义和示例
- 建立术语审批流程
- 定期更新和维护

### 3. 字段级标注

- 优先标注关键字段（PII、敏感数据）
- 保持一致性（相同字段使用相同术语）
- 自动化标注常见模式

### 4. 搜索优化

- 标签和术语会增强搜索结果
- 使用描述性的标签名称
- 在 context 字段中提供额外信息

## 合规和治理

### 自动化合规标记

```python
# GDPR 合规自动标记
GDPR_FIELDS = ["email", "phone", "address", "ip_address"]

def ensure_gdpr_compliance(dataset_urn, schema_metadata):
    """确保 GDPR 相关字段被正确标记"""
    for field in schema_metadata.fields:
        if any(gdpr_field in field.fieldPath.lower() for gdpr_field in GDPR_FIELDS):
            # 添加 GDPR 标签
            if not field.globalTags:
                field.globalTags = GlobalTagsClass(tags=[])

            field.globalTags.tags.append(
                TagAssociationClass(
                    tag="urn:li:tag:gdpr",
                    context="GDPR personal data"
                )
            )
```

## 相关文档

- [Dataset Entity](../entities/dataset.md)
- [Schema Metadata](schema-metadata.md)
- [Entity Registry](../entity-registry.md)

## 外部资源

- [DataHub Tags 官方文档](https://datahubproject.io/docs/tags/)
- [DataHub Glossary 官方文档](https://datahubproject.io/docs/glossary/business-glossary/)
