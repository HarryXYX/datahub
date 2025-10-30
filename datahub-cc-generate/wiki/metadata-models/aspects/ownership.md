# Ownership Aspect 文档

## 概述

**Ownership** Aspect 定义实体的所有权信息，包括所有者（个人或团队）和所有权类型（如数据所有者、技术所有者）。这是 DataHub 中最重要的治理 Aspect 之一。

## 定义文件

- **Aspect**: `com/linkedin/common/Ownership.pdl`
- **Record**: `com/linkedin/common/Owner.pdl`
- **Type**: `com/linkedin/common/OwnershipType.pdl`

## Aspect 名称

```
ownership
```

## 适用实体

几乎所有核心实体都支持 Ownership Aspect：

- Dataset
- Dashboard
- Chart
- DataJob
- DataFlow
- GlossaryTerm
- Domain
- MLModel
- Container
- CorpGroup

## PDL 定义

### Ownership Record

```pdl
@Aspect = {
  "name": "ownership"
}
record Ownership {
  /**
   * List of owners of the entity
   */
  owners: array[Owner]

  /**
   * Ownership type to Owners map (populated via mutation hook)
   */
  ownerTypes: optional map[string, array[Urn]] = {}

  /**
   * Audit stamp
   */
  lastModified: AuditStamp = {
    "time": 0,
    "actor": "urn:li:corpuser:unknown"
  }
}
```

### Owner Record

```pdl
record Owner {
  /**
   * Owner URN (corpuser or corpGroup)
   */
  @Relationship = {
    "name": "OwnedBy",
    "entityTypes": [ "corpuser", "corpGroup" ]
  }
  owner: Urn

  /**
   * Ownership type URN
   */
  typeUrn: optional Urn

  /**
   * Source information
   */
  source: optional OwnershipSource

  /**
   * Metadata attribution
   */
  attribution: optional MetadataAttribution
}
```

### OwnershipSource

```pdl
record OwnershipSource {
  /**
   * Source type
   */
  type: OwnershipSourceType

  /**
   * Source URL (optional)
   */
  url: optional string
}

enum OwnershipSourceType {
  AUDIT      // 来自审计日志
  DATABASE   // 来自数据库元数据
  FILE_SYSTEM // 来自文件系统
  ISSUE_TRACKING_SYSTEM // 来自问题跟踪系统
  MANUAL     // 手动添加
  SERVICE    // 来自服务
  SOURCE_CONTROL // 来自源代码控制系统
  OTHER      // 其他
}
```

## 所有权类型

DataHub 支持自定义所有权类型，常见类型包括：

### 内置类型

| 类型 URN | 显示名称 | 描述 |
|---------|---------|------|
| `urn:li:ownershipType:__system__technical_owner` | Technical Owner | 技术负责人（开发、维护） |
| `urn:li:ownershipType:__system__business_owner` | Business Owner | 业务负责人 |
| `urn:li:ownershipType:__system__data_steward` | Data Steward | 数据管理员 |

### 自定义类型

可以创建自定义所有权类型：

```python
from datahub.metadata.schema_classes import OwnershipTypeInfoClass

ownership_type_info = OwnershipTypeInfoClass(
    name="Product Owner",
    description="Product manager responsible for the data product"
)
```

## 使用示例

### 示例 1：基本所有权

```json
{
  "owners": [
    {
      "owner": "urn:li:corpuser:john.doe",
      "typeUrn": "urn:li:ownershipType:__system__technical_owner",
      "source": {
        "type": "MANUAL"
      }
    },
    {
      "owner": "urn:li:corpGroup:data-engineering",
      "typeUrn": "urn:li:ownershipType:__system__technical_owner",
      "source": {
        "type": "SERVICE"
      }
    }
  ],
  "lastModified": {
    "time": 1640995200000,
    "actor": "urn:li:corpuser:admin"
  }
}
```

### 示例 2：多种所有权类型

```json
{
  "owners": [
    {
      "owner": "urn:li:corpuser:jane.smith",
      "typeUrn": "urn:li:ownershipType:__system__business_owner",
      "source": {
        "type": "MANUAL"
      }
    },
    {
      "owner": "urn:li:corpuser:john.doe",
      "typeUrn": "urn:li:ownershipType:__system__technical_owner",
      "source": {
        "type": "MANUAL"
      }
    },
    {
      "owner": "urn:li:corpuser:alice.wilson",
      "typeUrn": "urn:li:ownershipType:__system__data_steward",
      "source": {
        "type": "MANUAL"
      }
    }
  ],
  "lastModified": {
    "time": 1640995200000,
    "actor": "urn:li:corpuser:data_governance"
  }
}
```

### 示例 3：来自不同源的所有权

```json
{
  "owners": [
    {
      "owner": "urn:li:corpuser:etl_service",
      "typeUrn": "urn:li:ownershipType:__system__technical_owner",
      "source": {
        "type": "SOURCE_CONTROL",
        "url": "https://github.com/company/data-pipelines/blob/main/CODEOWNERS"
      }
    },
    {
      "owner": "urn:li:corpGroup:analytics-team",
      "typeUrn": "urn:li:ownershipType:__system__business_owner",
      "source": {
        "type": "ISSUE_TRACKING_SYSTEM",
        "url": "https://jira.company.com/browse/DATA-123"
      }
    }
  ],
  "lastModified": {
    "time": 1640995200000,
    "actor": "urn:li:corpuser:metadata_sync_bot"
  }
}
```

## 实际使用场景

### 场景 1：通过 UI 添加所有者

用户可以通过 DataHub UI 直接添加所有者：

1. 导航到实体页面
2. 点击"Add Owners"
3. 搜索并选择用户或组
4. 选择所有权类型
5. 保存

### 场景 2：通过 Python SDK 添加所有权

```python
from datahub.emitter.mcp import MetadataChangeProposalWrapper
from datahub.emitter.rest_emitter import DatahubRestEmitter
from datahub.metadata.schema_classes import (
    OwnershipClass,
    OwnerClass,
    OwnershipTypeClass,
    OwnershipSourceClass,
    OwnershipSourceTypeClass,
    AuditStampClass
)

# 创建 Ownership
ownership = OwnershipClass(
    owners=[
        OwnerClass(
            owner="urn:li:corpuser:john.doe",
            type=OwnershipTypeClass.TECHNICAL_OWNER,
            typeUrn="urn:li:ownershipType:__system__technical_owner",
            source=OwnershipSourceClass(type=OwnershipSourceTypeClass.MANUAL)
        ),
        OwnerClass(
            owner="urn:li:corpGroup:data-engineering",
            type=OwnershipTypeClass.TECHNICAL_OWNER,
            typeUrn="urn:li:ownershipType:__system__technical_owner",
            source=OwnershipSourceClass(type=OwnershipSourceTypeClass.SERVICE)
        )
    ],
    lastModified=AuditStampClass(
        time=1640995200000,
        actor="urn:li:corpuser:datahub"
    )
)

# 发送到 DataHub
dataset_urn = "urn:li:dataset:(urn:li:dataPlatform:snowflake,sales_db.orders,PROD)"

emitter = DatahubRestEmitter("http://localhost:8080")
emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn=dataset_urn,
        aspect=ownership
    )
)
```

### 场景 3：从 CODEOWNERS 文件同步所有权

```python
import re
from pathlib import Path

# 读取 CODEOWNERS 文件
codeowners_path = Path("./CODEOWNERS")
content = codeowners_path.read_text()

# 解析所有者
# 格式: /path/to/code @username @team
owners_map = {}
for line in content.splitlines():
    if line.strip() and not line.startswith("#"):
        parts = line.split()
        path_pattern = parts[0]
        owners = [o.lstrip("@") for o in parts[1:]]
        owners_map[path_pattern] = owners

# 为相关的 DataJob 添加所有权
for path, owners in owners_map.items():
    if "data_pipelines" in path:
        ownership = OwnershipClass(
            owners=[
                OwnerClass(
                    owner=f"urn:li:corpuser:{owner}",
                    typeUrn="urn:li:ownershipType:__system__technical_owner",
                    source=OwnershipSourceClass(
                        type=OwnershipSourceTypeClass.SOURCE_CONTROL,
                        url=f"https://github.com/company/repo/blob/main/CODEOWNERS"
                    )
                )
                for owner in owners
            ]
        )
        # 发送 ownership...
```

### 场景 4：批量更新所有权

```python
# 批量为所有销售团队的 Dataset 添加业务所有者
from datahub.ingestion.graph.client import DatahubClientConfig, DataHubGraph

client = DataHubGraph(DatahubClientConfig(server="http://localhost:8080"))

# 搜索所有销售相关的 Dataset
search_results = client.get_search_results(
    entity_types=["dataset"],
    query="sales",
    start=0,
    count=100
)

# 为每个 Dataset 添加所有权
for result in search_results:
    dataset_urn = result.entity.urn

    ownership = OwnershipClass(
        owners=[
            OwnerClass(
                owner="urn:li:corpGroup:sales-analytics",
                typeUrn="urn:li:ownershipType:__system__business_owner",
                source=OwnershipSourceClass(type=OwnershipSourceTypeClass.SERVICE)
            )
        ]
    )

    emitter.emit_mcp(
        MetadataChangeProposalWrapper(
            entityUrn=dataset_urn,
            aspect=ownership
        )
    )
```

## 查询所有权

### GraphQL 查询

```graphql
query GetOwnership {
  dataset(urn: "urn:li:dataset:(urn:li:dataPlatform:snowflake,db.table,PROD)") {
    ownership {
      owners {
        owner {
          ... on CorpUser {
            urn
            username
            info {
              displayName
              email
            }
          }
          ... on CorpGroup {
            urn
            name
            info {
              displayName
            }
          }
        }
        type
        typeInfo {
          name
          description
        }
        source {
          type
          url
        }
      }
      lastModified {
        time
        actor
      }
    }
  }
}
```

### Python SDK 查询

```python
from datahub.ingestion.graph.client import DataHubGraph

client = DataHubGraph(DatahubClientConfig(server="http://localhost:8080"))

# 获取实体的所有权信息
ownership = client.get_aspect(
    entity_urn="urn:li:dataset:(urn:li:dataPlatform:snowflake,db.table,PROD)",
    aspect_type=OwnershipClass
)

if ownership:
    for owner in ownership.owners:
        print(f"Owner: {owner.owner}")
        print(f"Type: {owner.typeUrn}")
        print(f"Source: {owner.source.type if owner.source else 'N/A'}")
```

## 最佳实践

### 1. 明确所有权类型

- **Technical Owner**: 负责技术实现和维护的工程师
- **Business Owner**: 负责业务决策和需求的业务人员
- **Data Steward**: 负责数据质量和治理的数据管理员

### 2. 团队所有权

- 优先使用 CorpGroup 而不是个人
- 确保团队成员变化时不需要更新所有权
- 使用团队邮箱或 Slack 频道

### 3. 自动化同步

- 从 CODEOWNERS、JIRA、Confluence 自动同步
- 定期验证所有权信息的准确性
- 监控无主资产

### 4. 多级所有权

为复杂资产设置多个所有者：

```json
{
  "owners": [
    {
      "owner": "urn:li:corpGroup:data-platform",
      "typeUrn": "urn:li:ownershipType:__system__technical_owner"
    },
    {
      "owner": "urn:li:corpuser:data_engineer",
      "typeUrn": "urn:li:ownershipType:__system__technical_owner"
    },
    {
      "owner": "urn:li:corpGroup:sales-analytics",
      "typeUrn": "urn:li:ownershipType:__system__business_owner"
    },
    {
      "owner": "urn:li:corpuser:data_steward",
      "typeUrn": "urn:li:ownershipType:__system__data_steward"
    }
  ]
}
```

### 5. 所有权验证

定期审计所有权信息：

```python
# 查找无所有者的 Dataset
search_results = client.get_search_results(
    entity_types=["dataset"],
    query="*",
    filters=[{"field": "hasOwners", "values": ["false"]}]
)

for result in search_results:
    print(f"Dataset without owner: {result.entity.urn}")
```

## 权限和访问控制

所有权与 DataHub 的访问控制集成：

- **Policy 配置**: 基于所有权授予权限
- **通知**: 自动通知所有者关于数据变更
- **审批流程**: 所有者审批元数据变更

示例 Policy：

```json
{
  "type": "METADATA",
  "actors": {
    "resourceOwners": true
  },
  "privileges": ["EDIT_ENTITY"],
  "resources": {
    "allResources": true
  }
}
```

## 相关文档

- [CorpUser Entity](../entities/users-groups.md)
- [CorpGroup Entity](../entities/users-groups.md)
- [Entity Registry](../entity-registry.md)

## 外部资源

- [DataHub Ownership 官方文档](https://datahubproject.io/docs/api/graphql/ownership/)
- [Access Control](https://datahubproject.io/docs/authorization/access-policies-guide/)
