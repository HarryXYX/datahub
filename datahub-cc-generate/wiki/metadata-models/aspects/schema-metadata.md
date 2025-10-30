# Schema Metadata Aspect 文档

## 概述

**SchemaMetadata** Aspect 定义数据集的 Schema 结构，包括字段列表、数据类型、主键、外键等信息。这是理解数据集结构的核心 Aspect。

## 定义文件

`com/linkedin/schema/SchemaMetadata.pdl`

## Aspect 名称

```
schemaMetadata
```

## 适用实体

- Dataset（主要）
- GlossaryTerm（可选，用于定义术语的结构）

## PDL 定义

```pdl
@Aspect = {
  "name": "schemaMetadata"
}
record SchemaMetadata {
  /**
   * SHA1 hash of the schema content
   */
  hash: string

  /**
   * Native schema in the dataset's platform
   */
  platformSchema: union[
    EspressoSchema,
    OracleDDL,
    MySqlDDL,
    PrestoDDL,
    KafkaSchema,
    BinaryJsonSchema,
    OrcSchema,
    Schemaless,
    KeyValueSchema,
    OtherSchema
  ]

  /**
   * List of fields
   */
  fields: array[SchemaField]

  /**
   * Primary keys
   */
  primaryKeys: optional array[string]

  /**
   * Foreign key constraints
   */
  foreignKeys: optional array[ForeignKeyConstraint]
}
```

## SchemaField 结构

```pdl
record SchemaField {
  /**
   * Field path (e.g., "user.address.city" for nested fields)
   */
  fieldPath: string

  /**
   * Native data type (platform-specific)
   */
  nativeDataType: string

  /**
   * DataHub type system type
   */
  type: SchemaFieldDataType

  /**
   * Description
   */
  description: optional string

  /**
   * Nullable flag
   */
  nullable: boolean = true

  /**
   * Is part of primary key
   */
  isPartOfKey: boolean = false

  /**
   * Is recursive reference
   */
  isPartitioningKey: optional boolean

  /**
   * JSON path for nested documents
   */
  jsonPath: optional string

  /**
   * Global tags on this field
   */
  globalTags: optional GlobalTags

  /**
   * Glossary terms on this field
   */
  glossaryTerms: optional GlossaryTerms
}
```

## DataHub 类型系统

SchemaMetadata 使用统一的类型系统映射所有平台的数据类型：

### 基本类型

| DataHub Type | 描述 | 平台示例 |
|-------------|------|---------|
| `BOOLEAN` | 布尔值 | MySQL: BOOLEAN, PostgreSQL: BOOL |
| `BYTES` | 字节数组 | MySQL: BLOB, PostgreSQL: BYTEA |
| `NUMBER` | 数值类型 | INT, BIGINT, FLOAT, DECIMAL |
| `STRING` | 字符串 | VARCHAR, TEXT, CHAR |
| `DATE` | 日期 | DATE |
| `TIME` | 时间 | TIME |
| `ENUM` | 枚举 | ENUM |
| `NULL` | 空值 | NULL |

### 复杂类型

| DataHub Type | 描述 | 平台示例 |
|-------------|------|---------|
| `ARRAY` | 数组 | PostgreSQL: ARRAY, Snowflake: ARRAY |
| `MAP` | 键值对 | Hive: MAP |
| `STRUCT` | 结构体 | Hive: STRUCT, BigQuery: STRUCT |
| `UNION` | 联合类型 | Avro: UNION |

## 使用示例

### 示例 1：简单表 Schema

```json
{
  "schemaName": "users",
  "platform": "urn:li:dataPlatform:mysql",
  "version": 0,
  "hash": "abc123def456",
  "platformSchema": {
    "com.linkedin.schema.MySqlDDL": {
      "tableSchema": "CREATE TABLE users (\n  user_id INT PRIMARY KEY,\n  email VARCHAR(255) NOT NULL,\n  created_at TIMESTAMP\n);"
    }
  },
  "fields": [
    {
      "fieldPath": "user_id",
      "nativeDataType": "INT",
      "type": {
        "type": {
          "com.linkedin.schema.NumberType": {}
        }
      },
      "description": "Unique user identifier",
      "nullable": false,
      "isPartOfKey": true
    },
    {
      "fieldPath": "email",
      "nativeDataType": "VARCHAR(255)",
      "type": {
        "type": {
          "com.linkedin.schema.StringType": {}
        }
      },
      "description": "User email address",
      "nullable": false,
      "globalTags": {
        "tags": [
          {"tag": "urn:li:tag:pii"}
        ]
      }
    },
    {
      "fieldPath": "created_at",
      "nativeDataType": "TIMESTAMP",
      "type": {
        "type": {
          "com.linkedin.schema.TimeType": {}
        }
      },
      "description": "Account creation timestamp",
      "nullable": true
    }
  ],
  "primaryKeys": ["user_id"]
}
```

### 示例 2：嵌套结构（JSON/STRUCT）

```json
{
  "fields": [
    {
      "fieldPath": "[version=2.0].[type=struct].[type=address]",
      "nativeDataType": "STRUCT",
      "type": {
        "type": {
          "com.linkedin.schema.RecordType": {}
        }
      },
      "description": "User address information"
    },
    {
      "fieldPath": "[version=2.0].[type=struct].[type=address].street",
      "nativeDataType": "STRING",
      "type": {
        "type": {
          "com.linkedin.schema.StringType": {}
        }
      },
      "description": "Street address"
    },
    {
      "fieldPath": "[version=2.0].[type=struct].[type=address].city",
      "nativeDataType": "STRING",
      "type": {
        "type": {
          "com.linkedin.schema.StringType": {}
        }
      },
      "description": "City name"
    }
  ]
}
```

### 示例 3：数组字段

```json
{
  "fields": [
    {
      "fieldPath": "tags",
      "nativeDataType": "ARRAY<STRING>",
      "type": {
        "type": {
          "com.linkedin.schema.ArrayType": {
            "nestedType": ["string"]
          }
        }
      },
      "description": "List of tags associated with the record",
      "nullable": true
    }
  ]
}
```

### 示例 4：外键约束

```json
{
  "primaryKeys": ["order_id"],
  "foreignKeys": [
    {
      "name": "fk_user",
      "foreignFields": [
        "urn:li:schemaField:(urn:li:dataset:(urn:li:dataPlatform:mysql,ecommerce.orders,PROD),user_id)"
      ],
      "sourceFields": [
        "urn:li:schemaField:(urn:li:dataset:(urn:li:dataPlatform:mysql,ecommerce.users,PROD),user_id)"
      ],
      "foreignDataset": "urn:li:dataset:(urn:li:dataPlatform:mysql,ecommerce.users,PROD)"
    }
  ]
}
```

## 实际使用场景

### 场景 1：通过 Python SDK 创建 Schema

```python
from datahub.metadata.schema_classes import (
    SchemaMetadataClass,
    SchemaFieldClass,
    SchemaFieldDataTypeClass,
    NumberTypeClass,
    StringTypeClass,
    TimeTypeClass,
    MySqlDDL
)

schema_metadata = SchemaMetadataClass(
    schemaName="orders",
    platform="urn:li:dataPlatform:mysql",
    version=0,
    hash="abc123",
    platformSchema=MySqlDDL(
        tableSchema="CREATE TABLE orders (order_id INT PRIMARY KEY, ...)"
    ),
    fields=[
        SchemaFieldClass(
            fieldPath="order_id",
            nativeDataType="INT",
            type=SchemaFieldDataTypeClass(type=NumberTypeClass()),
            description="Order ID",
            nullable=False,
            isPartOfKey=True
        ),
        SchemaFieldClass(
            fieldPath="customer_email",
            nativeDataType="VARCHAR(255)",
            type=SchemaFieldDataTypeClass(type=StringTypeClass()),
            description="Customer email",
            nullable=False
        ),
        SchemaFieldClass(
            fieldPath="order_date",
            nativeDataType="TIMESTAMP",
            type=SchemaFieldDataTypeClass(type=TimeTypeClass()),
            description="Order timestamp",
            nullable=False
        )
    ],
    primaryKeys=["order_id"]
)

emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn=dataset_urn,
        aspect=schema_metadata
    )
)
```

### 场景 2：从数据库自动提取 Schema

```python
import sqlalchemy as db

# 连接数据库
engine = db.create_engine("mysql://user:pass@host/database")
metadata = db.MetaData()
metadata.reflect(bind=engine)

# 为每个表生成 SchemaMetadata
for table_name, table in metadata.tables.items():
    fields = []

    for column in table.columns:
        field = SchemaFieldClass(
            fieldPath=column.name,
            nativeDataType=str(column.type),
            type=map_sqlalchemy_type_to_datahub(column.type),
            description=column.comment or "",
            nullable=column.nullable,
            isPartOfKey=column.primary_key
        )
        fields.append(field)

    schema_metadata = SchemaMetadataClass(
        schemaName=table_name,
        platform="urn:li:dataPlatform:mysql",
        version=0,
        hash=compute_hash(fields),
        fields=fields,
        primaryKeys=[c.name for c in table.primary_key]
    )

    # 发送到 DataHub...
```

### 场景 3：比较 Schema 变更

```python
def compare_schemas(old_schema, new_schema):
    """比较两个 Schema 版本的差异"""
    old_fields = {f.fieldPath: f for f in old_schema.fields}
    new_fields = {f.fieldPath: f for f in new_schema.fields}

    # 找出新增的字段
    added = set(new_fields.keys()) - set(old_fields.keys())

    # 找出删除的字段
    removed = set(old_fields.keys()) - set(new_fields.keys())

    # 找出类型变更的字段
    changed = []
    for field_path in set(old_fields.keys()) & set(new_fields.keys()):
        if old_fields[field_path].type != new_fields[field_path].type:
            changed.append(field_path)

    return {
        "added": list(added),
        "removed": list(removed),
        "changed": changed
    }
```

## 字段级标签和术语

SchemaField 支持字段级别的标签和术语：

```python
field = SchemaFieldClass(
    fieldPath="user_email",
    nativeDataType="VARCHAR(255)",
    type=SchemaFieldDataTypeClass(type=StringTypeClass()),
    description="User email address",
    globalTags=GlobalTagsClass(
        tags=[
            TagAssociationClass(tag="urn:li:tag:pii"),
            TagAssociationClass(tag="urn:li:tag:sensitive")
        ]
    ),
    glossaryTerms=GlossaryTermsClass(
        terms=[
            GlossaryTermAssociationClass(
                urn="urn:li:glossaryTerm:Email"
            )
        ],
        auditStamp=AuditStampClass(
            time=1640995200000,
            actor="urn:li:corpuser:data_steward"
        )
    )
)
```

## 查询 Schema

### GraphQL 查询

```graphql
query GetSchema {
  dataset(urn: "urn:li:dataset:(urn:li:dataPlatform:mysql,db.table,PROD)") {
    schemaMetadata {
      hash
      platformSchema {
        ... on TableSchema {
          schema
        }
      }
      fields {
        fieldPath
        nativeDataType
        description
        nullable
        type
        globalTags {
          tags {
            tag {
              name
            }
          }
        }
        glossaryTerms {
          terms {
            term {
              name
            }
          }
        }
      }
      primaryKeys
      foreignKeys {
        name
        foreignDataset {
          name
        }
      }
    }
  }
}
```

## editableSchemaMetadata Aspect

用于存储用户可编辑的 Schema 信息（如字段描述）：

```json
{
  "editableSchemaFieldInfo": [
    {
      "fieldPath": "user_email",
      "description": "User-provided description override",
      "globalTags": {
        "tags": [
          {"tag": "urn:li:tag:verified"}
        ]
      }
    }
  ]
}
```

## 最佳实践

### 1. Schema Hash 计算

- 使用一致的哈希算法（如 SHA1）
- 包含字段名、类型、顺序
- 用于检测 Schema 变更

### 2. 字段路径规范

- 平面字段：直接使用字段名（如 `user_id`）
- 嵌套字段：使用点分隔（如 `address.city`）
- 数组元素：使用括号（如 `tags[0]`）

### 3. 类型映射

维护从原生类型到 DataHub 类型的映射表：

```python
TYPE_MAPPING = {
    # MySQL
    "INT": NumberType(),
    "VARCHAR": StringType(),
    "TIMESTAMP": TimeType(),
    "BOOLEAN": BooleanType(),
    # PostgreSQL
    "INTEGER": NumberType(),
    "TEXT": StringType(),
    "TIMESTAMPTZ": TimeType(),
    # ... 更多
}
```

### 4. Schema 版本控制

- 在 `version` 字段中递增版本号
- 保留历史 Schema 版本用于审计
- 监控 breaking changes

### 5. 文档完整性

- 为每个字段提供清晰的描述
- 标记 PII 字段
- 记录业务含义和约束

## 相关文档

- [Dataset Entity](../entities/dataset.md)
- [Tags/Terms Aspect](tags-terms.md)
- [Entity Registry](../entity-registry.md)

## 外部资源

- [DataHub Schema 官方文档](https://datahubproject.io/docs/generated/metamodel/entities/dataset/#schemaMetadata)
