# CorpUser 和 CorpGroup Entity 文档

## 概述

DataHub 使用两个实体来建模企业身份和组织结构：

- **CorpUser**：企业用户（个人账户）
- **CorpGroup**：企业组/团队

这些实体用于：
- 身份验证和授权
- 所有权管理
- 访问控制
- 协作和通知

## CorpUser Entity

### URN 格式

```
urn:li:corpuser:<username>
```

### URN 示例

```
urn:li:corpuser:john.doe
urn:li:corpuser:jane.smith
urn:li:corpuser:datahub
```

### Key Aspect: CorpUserKey

```pdl
@Aspect = {
  "name": "corpUserKey"
}
record CorpUserKey {
  /**
   * Username of the user
   */
  username: string
}
```

### 核心 Aspects

#### 1. corpUserInfo

**定义文件**：`com/linkedin/identity/CorpUserInfo.pdl`

用户的基本信息。

```pdl
record CorpUserInfo {
  /**
   * Whether the user is active
   */
  active: boolean

  /**
   * Display name
   */
  displayName: optional string

  /**
   * Email address
   */
  email: optional EmailAddress

  /**
   * Title
   */
  title: optional string

  /**
   * Direct manager
   */
  managerUrn: optional CorpuserUrn

  /**
   * Department ID
   */
  departmentId: optional long

  /**
   * Department name
   */
  departmentName: optional string

  /**
   * First name
   */
  firstName: optional string

  /**
   * Last name
   */
  lastName: optional string

  /**
   * Full name
   */
  fullName: optional string

  /**
   * Country code
   */
  countryCode: optional string

  /**
   * Whether the user is a system user
   */
  system: optional boolean = false

  /**
   * Custom properties
   */
  customProperties: map[string, string]
}
```

#### 使用示例

```json
{
  "active": true,
  "displayName": "John Doe",
  "email": "john.doe@company.com",
  "title": "Senior Data Engineer",
  "managerUrn": "urn:li:corpuser:jane.smith",
  "departmentId": 1001,
  "departmentName": "Data Engineering",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "countryCode": "US",
  "system": false,
  "customProperties": {
    "employee_id": "E12345",
    "location": "San Francisco",
    "hire_date": "2020-01-15"
  }
}
```

#### 2. corpUserEditableInfo

用户可编辑的信息（通过 UI）。

```json
{
  "aboutMe": "Passionate about building scalable data pipelines and democratizing data access.",
  "teams": ["Data Platform", "Analytics"],
  "skills": ["Python", "SQL", "Airflow", "Spark"],
  "pictureLink": "https://company.com/photos/john.doe.jpg",
  "slack": "@johndoe"
}
```

#### 3. groupMembership

用户所属的组。

```json
{
  "groups": [
    {
      "groupUrn": "urn:li:corpGroup:data-engineering",
      "membershipType": "MEMBER"
    },
    {
      "groupUrn": "urn:li:corpGroup:platform-team",
      "membershipType": "ADMIN"
    }
  ]
}
```

#### 4. roleMembership

用户的角色分配。

```json
{
  "roles": [
    {
      "role": "urn:li:dataHubRole:Admin"
    },
    {
      "role": "urn:li:dataHubRole:DataSteward"
    }
  ]
}
```

#### 5. corpUserSettings

用户的个人设置。

```json
{
  "appearance": {
    "theme": "DARK"
  },
  "views": {
    "defaultView": "urn:li:dataHubView:my-datasets"
  }
}
```

## CorpGroup Entity

### URN 格式

```
urn:li:corpGroup:<group_name>
```

### URN 示例

```
urn:li:corpGroup:data-engineering
urn:li:corpGroup:analytics-team
urn:li:corpGroup:admins
```

### Key Aspect: CorpGroupKey

```pdl
@Aspect = {
  "name": "corpGroupKey"
}
record CorpGroupKey {
  /**
   * Name of the group
   */
  name: string
}
```

### 核心 Aspects

#### 1. corpGroupInfo

**定义文件**：`com/linkedin/identity/CorpGroupInfo.pdl`

组的基本信息。

```pdl
record CorpGroupInfo {
  /**
   * Display name
   */
  displayName: optional string

  /**
   * Email
   */
  email: optional EmailAddress

  /**
   * Description
   */
  description: optional string

  /**
   * Slack channel
   */
  slack: optional string

  /**
   * Created timestamp
   */
  created: optional AuditStamp
}
```

#### 使用示例

```json
{
  "displayName": "Data Engineering Team",
  "email": "data-engineering@company.com",
  "description": "Responsible for building and maintaining data pipelines, ETL processes, and data infrastructure.",
  "slack": "#data-engineering",
  "created": {
    "time": 1609459200000,
    "actor": "urn:li:corpuser:admin"
  }
}
```

#### 2. corpGroupEditableInfo

组的可编辑信息。

```json
{
  "description": "Updated description for the team",
  "slack": "#data-eng-updates",
  "email": "data-eng-new@company.com"
}
```

## 关系图

```
CorpUser (John Doe)
   ├── MemberOf ────────→ CorpGroup (Data Engineering)
   ├── ReportsTo ───────→ CorpUser (Manager)
   ├── Owns ────────────→ Dataset
   ├── Owns ────────────→ Dashboard
   ├── HasRole ─────────→ DataHubRole (Admin)
   └── HasSettings ─────→ UserSettings

CorpGroup (Data Engineering)
   ├── OwnedBy ─────────→ CorpUser (Group Admin)
   ├── Owns ────────────→ Dataset
   ├── Owns ────────────→ DataFlow
   └── InDomain ────────→ Domain
```

## 实际使用场景

### 场景 1：从 LDAP/Active Directory 同步用户

```yaml
# ldap_recipe.yml
source:
  type: ldap
  config:
    ldap_server: ldap://ldap.company.com
    ldap_user: cn=datahub,ou=service-accounts,dc=company,dc=com
    ldap_password: ${LDAP_PASSWORD}
    base_dn: ou=users,dc=company,dc=com
    user_filter: "(objectClass=person)"
    group_filter: "(objectClass=groupOfNames)"
    attrs_mapping:
      username: uid
      display_name: displayName
      email: mail
      title: title
      department: departmentNumber

sink:
  type: datahub-rest
  config:
    server: http://localhost:8080
```

### 场景 2：通过 GraphQL 查询用户

```graphql
query GetCorpUser {
  corpUser(urn: "urn:li:corpuser:john.doe") {
    urn
    username
    info {
      displayName
      email
      title
      departmentName
      manager {
        username
        info {
          displayName
        }
      }
    }
    editableInfo {
      aboutMe
      teams
      skills
      pictureLink
    }
    groupMembership {
      groups {
        name
        info {
          displayName
        }
      }
    }
    ownerships {
      total
      ownerships {
        entity {
          ... on Dataset {
            name
          }
        }
      }
    }
  }
}
```

### 场景 3：通过 Python SDK 创建用户

```python
from datahub.emitter.mcp import MetadataChangeProposalWrapper
from datahub.emitter.rest_emitter import DatahubRestEmitter
from datahub.metadata.schema_classes import (
    CorpUserInfoClass,
    GroupMembershipClass
)

user_urn = "urn:li:corpuser:john.doe"

# 创建用户信息
user_info = CorpUserInfoClass(
    active=True,
    displayName="John Doe",
    email="john.doe@company.com",
    title="Senior Data Engineer",
    firstName="John",
    lastName="Doe",
    fullName="John Doe",
    departmentName="Data Engineering",
    managerUrn="urn:li:corpuser:jane.smith",
    customProperties={
        "employee_id": "E12345",
        "location": "San Francisco"
    }
)

# 创建组成员关系
group_membership = GroupMembershipClass(
    groups=[
        "urn:li:corpGroup:data-engineering",
        "urn:li:corpGroup:platform-team"
    ]
)

# 发送到 DataHub
emitter = DatahubRestEmitter("http://localhost:8080")

emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn=user_urn,
        aspect=user_info
    )
)

emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn=user_urn,
        aspect=group_membership
    )
)
```

### 场景 4：创建组并分配成员

```python
from datahub.metadata.schema_classes import (
    CorpGroupInfoClass,
    AuditStampClass
)

group_urn = "urn:li:corpGroup:data-engineering"

# 创建组信息
group_info = CorpGroupInfoClass(
    displayName="Data Engineering Team",
    email="data-engineering@company.com",
    description="Responsible for data infrastructure",
    slack="#data-engineering",
    created=AuditStampClass(
        time=1640995200000,
        actor="urn:li:corpuser:admin"
    )
)

emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn=group_urn,
        aspect=group_info
    )
)
```

## 身份同步策略

### 1. LDAP/Active Directory

- 使用 LDAP 连接器定期同步
- 映射 LDAP 属性到 DataHub 字段
- 同步组成员关系和层级结构

### 2. SSO 集成

- 支持 OIDC、SAML
- JIT (Just-In-Time) 用户创建
- 自动同步基本属性

### 3. 自定义同步

- 使用 Python SDK 或 REST API
- 从 HR 系统或其他源同步
- 定期更新用户状态

## 权限和角色

### DataHub 内置角色

| 角色 | 权限 |
|-----|------|
| Admin | 完全控制权限 |
| Editor | 编辑元数据 |
| Reader | 只读访问 |
| DataSteward | 管理标签、术语、域 |

### 分配角色示例

```python
from datahub.metadata.schema_classes import RoleMembershipClass

role_membership = RoleMembershipClass(
    roles=[
        "urn:li:dataHubRole:Admin",
        "urn:li:dataHubRole:DataSteward"
    ]
)

emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn="urn:li:corpuser:john.doe",
        aspect=role_membership
    )
)
```

## 最佳实践

### 1. 用户命名

- 使用企业标准用户名格式
- 保持与 SSO 一致
- 避免特殊字符

### 2. 组织结构

- 使用组反映团队结构
- 为每个部门创建组
- 使用组进行权限管理

### 3. 属性维护

- 保持邮箱、职位等信息最新
- 定期同步身份源
- 及时停用离职用户

### 4. 隐私和安全

- 不存储敏感的个人信息
- 遵守 GDPR/隐私法规
- 使用 `system: true` 标记服务账户

### 5. 图片和头像

- 使用公司统一的头像服务
- 提供默认头像
- 确保图片 URL 可访问

## 用户状态管理

### 激活用户

```python
user_info.active = True
```

### 停用用户

```python
user_info.active = False
```

### 软删除

```python
from datahub.metadata.schema_classes import StatusClass

status = StatusClass(removed=True)

emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn="urn:li:corpuser:john.doe",
        aspect=status
    )
)
```

## 相关文档

- [Ownership Aspect](../aspects/ownership.md)
- [Entity Registry](../entity-registry.md)
- [开发指南](../development.md)

## 外部资源

- [DataHub CorpUser 官方文档](https://datahubproject.io/docs/generated/metamodel/entities/corpuser/)
- [DataHub CorpGroup 官方文档](https://datahubproject.io/docs/generated/metamodel/entities/corpgroup/)
- [LDAP Integration](https://datahubproject.io/docs/generated/ingestion/sources/ldap/)
- [Authentication](https://datahubproject.io/docs/authentication/authentication/)
