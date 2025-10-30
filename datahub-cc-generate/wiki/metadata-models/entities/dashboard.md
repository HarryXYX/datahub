# Dashboard Entity 文档

## 概述

**Dashboard** 实体代表数据可视化仪表板，通常包含多个图表（Chart）和数据可视化组件。Dashboard 可以来自各种 BI 工具：

- **Tableau**
- **Looker**
- **PowerBI**
- **Superset**
- **Metabase**
- **Mode Analytics**

## URN 格式

```
urn:li:dashboard:(<platform>,<dashboard_id>)
```

### URN 示例

```
# Looker Dashboard
urn:li:dashboard:(looker,sales_overview_dashboard)

# Tableau Dashboard
urn:li:dashboard:(tableau,revenue_analytics)

# PowerBI Dashboard
urn:li:dashboard:(powerbi,customer_insights)
```

## Key Aspect: DashboardKey

```pdl
@Aspect = {
  "name": "dashboardKey"
}
record DashboardKey {
  /**
   * Dashboard tool such as looker, redash, tableau, etc.
   */
  dashboardTool: string

  /**
   * Unique id for the dashboard
   */
  dashboardId: string
}
```

## 核心 Aspects

### 1. dashboardInfo

**定义文件**：`com/linkedin/dashboard/DashboardInfo.pdl`

Dashboard 的基本信息和关系。

#### 关键字段

```pdl
record DashboardInfo {
  /**
   * Title of the dashboard
   */
  title: string

  /**
   * Detailed description
   */
  description: string

  /**
   * Charts in the dashboard (使用 Edge 结构)
   */
  chartEdges: optional array[Edge]

  /**
   * Datasets consumed by the dashboard
   */
  datasetEdges: optional array[Edge]

  /**
   * URL for the dashboard
   */
  dashboardUrl: optional Url

  /**
   * Access level
   */
  access: optional AccessLevel

  /**
   * Last refresh time
   */
  lastRefreshed: optional Time

  /**
   * Audit stamps
   */
  lastModified: ChangeAuditStamps
}
```

#### 使用示例

```json
{
  "title": "Sales Performance Dashboard",
  "description": "Comprehensive sales analytics including revenue, customer acquisition, and regional performance",
  "chartEdges": [
    {
      "destinationUrn": "urn:li:chart:(looker,revenue_chart)",
      "created": {
        "time": 1640995200000,
        "actor": "urn:li:corpuser:analyst"
      }
    },
    {
      "destinationUrn": "urn:li:chart:(looker,customer_chart)",
      "created": {
        "time": 1640995200000,
        "actor": "urn:li:corpuser:analyst"
      }
    }
  ],
  "datasetEdges": [
    {
      "destinationUrn": "urn:li:dataset:(urn:li:dataPlatform:snowflake,sales_db.orders,PROD)",
      "created": {
        "time": 1640995200000,
        "actor": "urn:li:corpuser:etl_pipeline"
      }
    }
  ],
  "dashboardUrl": "https://company.looker.com/dashboards/123",
  "access": "PUBLIC",
  "lastRefreshed": 1641081600000
}
```

### 2. dashboardUsageStatistics

**定义文件**：`com/linkedin/dashboard/DashboardUsageStatistics.pdl`

Dashboard 的使用统计信息。

#### 使用示例

```json
{
  "timestampMillis": 1640995200000,
  "eventGranularity": {
    "unit": "DAY",
    "multiple": 1
  },
  "uniqueUserCount": 25,
  "totalViewsCount": 500,
  "topViewedByUsers": [
    {
      "user": "urn:li:corpuser:sales_director",
      "viewsCount": 150
    },
    {
      "user": "urn:li:corpuser:analyst1",
      "viewsCount": 100
    }
  ]
}
```

### 3. editableDashboardProperties

用户可以通过 UI 编辑的属性。

```json
{
  "description": "User-provided description override",
  "created": {
    "time": 1640995200000,
    "actor": "urn:li:corpuser:dashboard_owner"
  }
}
```

## 关系图

```
Dashboard
   ├── Contains ─────→ Chart (多个)
   ├── Consumes ─────→ Dataset (多个)
   ├── OwnedBy ──────→ CorpUser / CorpGroup
   ├── HasTags ──────→ Tag
   ├── HasTerms ─────→ GlossaryTerm
   └── InDomain ─────→ Domain
```

## 实际使用场景

### 场景 1：摄取 Looker Dashboard 元数据

```yaml
# looker_recipe.yml
source:
  type: looker
  config:
    base_url: https://company.looker.com
    client_id: ${LOOKER_CLIENT_ID}
    client_secret: ${LOOKER_CLIENT_SECRET}
    include_dashboard_metadata: true
    include_usage_statistics: true

sink:
  type: datahub-rest
  config:
    server: http://localhost:8080
```

### 场景 2：通过 GraphQL 查询 Dashboard

```graphql
query GetDashboard {
  dashboard(urn: "urn:li:dashboard:(looker,sales_dashboard)") {
    urn
    dashboardId
    info {
      title
      description
      dashboardUrl
      charts {
        urn
        info {
          title
        }
      }
      datasets {
        urn
        name
      }
    }
    ownership {
      owners {
        owner {
          ... on CorpUser {
            username
          }
        }
      }
    }
    usageStats {
      uniqueUserCount
      totalViewsCount
    }
  }
}
```

### 场景 3：通过 Python SDK 创建 Dashboard

```python
from datahub.emitter.mcp import MetadataChangeProposalWrapper
from datahub.emitter.rest_emitter import DatahubRestEmitter
from datahub.metadata.schema_classes import (
    DashboardInfoClass,
    EdgeClass,
    ChangeAuditStampsClass,
    AuditStampClass
)

dashboard_urn = "urn:li:dashboard:(tableau,revenue_dashboard)"

dashboard_info = DashboardInfoClass(
    title="Revenue Analytics Dashboard",
    description="Real-time revenue tracking and forecasting",
    chartEdges=[
        EdgeClass(
            destinationUrn="urn:li:chart:(tableau,revenue_chart)",
            created=AuditStampClass(
                time=1640995200000,
                actor="urn:li:corpuser:analyst"
            )
        )
    ],
    datasetEdges=[
        EdgeClass(
            destinationUrn="urn:li:dataset:(urn:li:dataPlatform:snowflake,revenue.orders,PROD)",
            created=AuditStampClass(
                time=1640995200000,
                actor="urn:li:corpuser:etl"
            )
        )
    ],
    dashboardUrl="https://tableau.company.com/views/revenue",
    lastModified=ChangeAuditStampsClass(
        created=AuditStampClass(
            time=1640995200000,
            actor="urn:li:corpuser:analyst"
        ),
        lastModified=AuditStampClass(
            time=1641081600000,
            actor="urn:li:corpuser:analyst"
        )
    )
)

emitter = DatahubRestEmitter("http://localhost:8080")
emitter.emit_mcp(
    MetadataChangeProposalWrapper(
        entityUrn=dashboard_urn,
        aspect=dashboard_info
    )
)
```

## 支持的 BI 工具

| BI 工具 | Platform ID | 摄取支持 |
|---------|------------|---------|
| Tableau | `tableau` | ✅ Full |
| Looker | `looker` | ✅ Full |
| PowerBI | `powerbi` | ✅ Full |
| Superset | `superset` | ✅ Full |
| Mode Analytics | `mode` | ✅ Full |
| Metabase | `metabase` | ✅ Full |
| Redash | `redash` | ✅ Partial |

## 最佳实践

### 1. Dashboard 命名

- 使用清晰描述性的标题
- 包含业务上下文（部门、用途）
- 避免使用"Dashboard 1"等泛化名称

### 2. 描述信息

- 说明 Dashboard 的业务用途
- 列出关键指标和 KPI
- 注明数据刷新频率
- 提供联系人信息

### 3. 访问级别

- 正确设置 `access` 字段（PUBLIC/PRIVATE）
- 通过 Ownership 管理权限
- 使用 Domain 进行组织隔离

### 4. 使用统计

- 定期收集使用统计
- 识别未使用的 Dashboard
- 监控高频用户以了解关键用例

## 相关文档

- [Chart Entity](chart.md)
- [Dataset Entity](dataset.md)
- [Entity Registry](../entity-registry.md)

## 外部资源

- [DataHub Dashboard 官方文档](https://datahubproject.io/docs/generated/metamodel/entities/dashboard/)
- [Looker Integration](https://datahubproject.io/docs/generated/ingestion/sources/looker/)
- [Tableau Integration](https://datahubproject.io/docs/generated/ingestion/sources/tableau/)
