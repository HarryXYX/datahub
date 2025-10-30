# DataHub Web React - 模块完整指南

## 目录

- [模块总览](#模块总览)
- [核心功能](./features/)
- [组件库](./components/)
- [GraphQL 集成](./graphql/)
- [状态管理](./state-management.md)
- [开发指南](./development/)

---

## 模块总览

DataHub Web React 是 DataHub 的前端应用程序，基于 React 和 TypeScript 构建，提供现代化的元数据管理界面。

### 技术栈

#### 核心技术

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | 17.0 | UI 框架 |
| **TypeScript** | 4.8.4 | 类型安全的 JavaScript |
| **Vite** | 6.x | 构建工具和开发服务器 |
| **Apollo Client** | 3.3.19 | GraphQL 客户端 |
| **Ant Design** | 4.24.7 | UI 组件库 |
| **Styled Components** | 5.2.1 | CSS-in-JS 样式方案 |
| **React Router** | 5.3 | 路由管理 |

#### 数据可视化

- **@visx/***: 数据可视化库（图表、图形）
- **reactflow**: 血缘图可视化（11.10.1）
- **@monaco-editor/react**: 代码编辑器（4.3.1）

#### 状态与数据管理

- **Apollo Client**: GraphQL 查询和缓存
- **React Context**: 全局状态管理
- **js-cookie**: Cookie 管理

#### 开发工具

- **Vitest**: 单元测试框架（3.2.2）
- **@testing-library/react**: React 组件测试
- **ESLint**: 代码检查
- **Prettier**: 代码格式化
- **GraphQL Code Generator**: TypeScript 类型生成
- **Storybook**: 组件开发和文档

---

## 架构概览

### 应用架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ApolloProvider (GraphQL Client)                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ CustomThemeProvider (主题管理)                  │  │  │
│  │  │  ┌───────────────────────────────────────────┐  │  │  │
│  │  │  │ Router (React Router)                     │  │  │  │
│  │  │  │  ┌─────────────────────────────────────┐  │  │  │  │
│  │  │  │  │ Routes (路由配置)                   │  │  │  │  │
│  │  │  │  │  - 搜索 (/search)                   │  │  │  │  │
│  │  │  │  │  - 实体详情 (/:entityType/:urn)    │  │  │  │  │
│  │  │  │  │  - 血缘图 (/lineage)                │  │  │  │  │
│  │  │  │  │  - 设置 (/settings)                 │  │  │  │  │
│  │  │  │  │  - 数据产品 (/dataProduct)          │  │  │  │  │
│  │  │  │  └─────────────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

                              │
                              ▼

        ┌───────────────────────────────────┐
        │     datahub-frontend (GMS)        │
        │   GraphQL API (/api/v2/graphql)   │
        └───────────────────────────────────┘
```

### 目录结构

```
datahub-web-react/
├── src/
│   ├── alchemy-components/      # Alchemy 设计系统组件库
│   │   ├── components/          # 可复用的 UI 组件
│   │   │   ├── Button/
│   │   │   ├── Card/
│   │   │   ├── Table/
│   │   │   ├── Avatar/
│   │   │   └── ...
│   │   └── theme/               # 主题配置
│   │       ├── foundations/     # 基础设计 tokens (颜色、字体、间距)
│   │       └── config/          # 主题配置
│   │
│   ├── app/                     # 应用核心功能
│   │   ├── entity/              # 实体系统
│   │   │   ├── EntityRegistry.tsx  # 实体注册中心
│   │   │   ├── dataset/         # Dataset 实体
│   │   │   ├── dashboard/       # Dashboard 实体
│   │   │   ├── chart/           # Chart 实体
│   │   │   ├── user/            # User 实体
│   │   │   └── shared/          # 实体共享组件
│   │   │
│   │   ├── search/              # 搜索功能
│   │   │   ├── SearchPage.tsx
│   │   │   ├── filters/         # 搜索过滤器
│   │   │   └── sidebar/         # 搜索侧边栏
│   │   │
│   │   ├── searchV2/            # 搜索 V2 版本
│   │   │
│   │   ├── lineageV3/           # 血缘图可视化 V3
│   │   │   ├── LineageVisualization.tsx
│   │   │   ├── LineageEntityNode/
│   │   │   ├── LineageEdge/
│   │   │   └── controls/        # 血缘图控制组件
│   │   │
│   │   ├── entityV2/            # 实体详情页 V2
│   │   │
│   │   ├── homeV3/              # 首页 V3
│   │   │
│   │   ├── settings/            # 设置页面
│   │   │   ├── AccessTokens/
│   │   │   ├── ManageIngestion/
│   │   │   └── ManageUsers/
│   │   │
│   │   ├── ingest/              # 数据摄取管理
│   │   │
│   │   ├── auth/                # 认证与授权
│   │   │   ├── LogIn.tsx
│   │   │   └── checkAuthStatus.ts
│   │   │
│   │   ├── context/             # 全局 Context
│   │   │   ├── AppContext.tsx
│   │   │   └── UserContext.tsx
│   │   │
│   │   └── shared/              # 共享组件和工具
│   │       ├── avatar/
│   │       ├── tags/
│   │       ├── health/
│   │       └── hooks/           # 共享 Hooks
│   │
│   ├── graphql/                 # GraphQL 定义
│   │   ├── search.graphql       # 搜索查询
│   │   ├── dataset.graphql      # Dataset 查询
│   │   ├── lineage.graphql      # 血缘查询
│   │   ├── user.graphql         # 用户查询
│   │   └── fragments.graphql    # 可复用片段
│   │
│   ├── conf/                    # 配置文件
│   │   ├── Global.ts            # 全局配置
│   │   └── theme/               # 主题配置
│   │
│   ├── images/                  # 静态图片资源
│   │
│   ├── App.tsx                  # 应用入口
│   ├── Routes.tsx               # 路由配置
│   ├── types.generated.ts       # GraphQL 生成的类型
│   └── possibleTypes.generated.ts
│
├── public/                      # 公共静态资源
│
├── functions/                   # Vercel Serverless Functions (可选)
│
├── .storybook/                  # Storybook 配置
│
├── codegen.yml                  # GraphQL Code Generator 配置
├── vite.config.ts               # Vite 构建配置
├── tsconfig.json                # TypeScript 配置
├── package.json                 # 依赖管理
└── README.md                    # 项目说明
```

---

## 核心概念

### 1. 实体系统 (Entity System)

DataHub 的实体系统是应用的核心架构模式，所有元数据对象都被建模为"实体"。

#### EntityRegistry

`EntityRegistry` 是实体系统的核心，它是一个单例注册中心，管理所有实体类型。

**文件位置**: `/src/app/entity/EntityRegistry.tsx`

**核心功能**:

```typescript
// 注册实体
registry.register(new DatasetEntity());
registry.register(new DashboardEntity());

// 获取实体配置
const entity = registry.getEntity(EntityType.Dataset);

// 获取实体图标
const icon = registry.getIcon(EntityType.Dataset, 20, IconStyleType.ACCENT);

// 获取实体显示名称
const collectionName = registry.getCollectionName(EntityType.Dataset); // "Datasets"
```

#### Entity 接口

每个实体必须实现 `Entity` 接口:

```typescript
interface Entity<T> {
    type: EntityType;

    // 图标渲染
    icon(fontSize: number, styleType: IconStyleType, color?: string): JSX.Element;

    // 实体名称
    getCollectionName(): string;  // 复数形式，如 "Datasets"
    getEntityName?(): string;      // 单数形式，如 "Dataset"
    getPathName(): string;         // URL 路径，如 "dataset"

    // 功能开关
    isSearchEnabled(): boolean;
    isBrowseEnabled(): boolean;
    isLineageEnabled(): boolean;

    // 渲染组件
    renderProfile(urn: string): JSX.Element;              // 实体详情页
    renderPreview(type: PreviewType, data: T): JSX.Element;  // 预览卡片
    renderSearch(query: string): JSX.Element;             // 搜索结果

    // 其他配置...
}
```

**实体类型示例**:

| 实体类型 | 说明 | 支持搜索 | 支持血缘 |
|---------|------|---------|---------|
| Dataset | 数据集 | ✅ | ✅ |
| Dashboard | 仪表板 | ✅ | ✅ |
| Chart | 图表 | ✅ | ✅ |
| DataJob | 数据任务 | ✅ | ✅ |
| DataFlow | 数据流 | ✅ | ✅ |
| CorpUser | 用户 | ✅ | ❌ |
| CorpGroup | 用户组 | ✅ | ❌ |
| GlossaryTerm | 术语 | ✅ | ❌ |
| Tag | 标签 | ✅ | ❌ |
| Domain | 域 | ✅ | ❌ |

### 2. Apollo Client (GraphQL)

Apollo Client 负责与后端 GraphQL API 通信。

**配置位置**: `/src/App.tsx`

```typescript
// Apollo Client 配置
const client = new ApolloClient({
    link: errorLink.concat(httpLink),
    cache: new InMemoryCache({
        typePolicies: {
            Query: {
                fields: {
                    dataset: {
                        merge: (oldObj, newObj) => ({ ...oldObj, ...newObj })
                    }
                }
            }
        },
        possibleTypes: possibleTypesResult.possibleTypes
    }),
    credentials: 'include',
    defaultOptions: {
        watchQuery: { fetchPolicy: 'no-cache' },
        query: { fetchPolicy: 'no-cache' }
    }
});
```

**关键特性**:

- **自动类型生成**: GraphQL queries 自动生成 TypeScript 类型
- **缓存策略**: 默认不使用缓存 (`no-cache`)
- **错误处理**: 401 错误自动重定向到登录页
- **Union Types 支持**: 通过 `possibleTypes` 支持 GraphQL union 类型

### 3. 路由系统

应用使用 React Router 进行路由管理。

**主要路由**:

```
/                           # 首页
/search                     # 搜索页面
/:entityType/:urn           # 实体详情页
  /dataset/:urn
  /dashboard/:urn
  /chart/:urn
  ...
/lineage/:entityType/:urn   # 血缘图页面
/settings                   # 设置页面
  /settings/tokens
  /settings/ingestion
  /settings/users
/domain/:urn                # 域详情页
/glossary/:urn              # 术语表详情页
/dataProduct/:urn           # 数据产品详情页
```

**运行时路径支持**: 应用支持部署在子路径下（如 `/datahub`），通过 `BASE_PATH` 环境变量配置。

### 4. 主题系统

应用支持自定义主题，主题配置基于 Styled Components。

**主题配置位置**:
- `/src/alchemy-components/theme/` - Alchemy 组件主题
- `/src/conf/theme/` - 应用主题配置

**主题结构**:

```typescript
interface Theme {
    colors: {
        // 语义化颜色 tokens
        primary: string;
        secondary: string;
        success: string;
        error: string;
        warning: string;
        // ... 更多颜色
    };

    styles: {
        // Ant Design 组件样式覆盖
        // ...
    };

    assets: {
        logoUrl?: string;
    };

    content: {
        title: string;
        // 可自定义文案
    };
}
```

**主题切换**:
- 通过 `REACT_APP_THEME` 环境变量选择主题
- 支持 V1 和 V2 主题
- 可通过 `REACT_APP_CUSTOM_THEME_ID` 加载自定义主题

---

## 数据流

### 典型数据流示例：加载 Dataset 详情页

```
1. 用户访问 /dataset/urn:li:dataset:123
           ↓
2. Router 匹配路由，渲染 EntityPage
           ↓
3. EntityPage 从 EntityRegistry 获取 Dataset Entity
           ↓
4. Dataset Entity 的 renderProfile() 被调用
           ↓
5. Dataset Profile 组件挂载
           ↓
6. 执行 GraphQL Query (useGetDatasetQuery)
           ↓
7. Apollo Client 发送请求到 /api/v2/graphql
           ↓
8. GMS 后端返回 Dataset 数据
           ↓
9. Apollo Client 更新缓存
           ↓
10. React 组件重新渲染，显示数据
```

### GraphQL Query 到 UI 的流程

```
1. 定义 GraphQL Query
   📄 src/graphql/dataset.graphql

   query getDataset($urn: String!) {
     dataset(urn: $urn) {
       urn
       name
       description
       properties {
         customProperties { key value }
       }
     }
   }

2. 运行代码生成
   $ yarn generate

   生成文件:
   - src/graphql/dataset.generated.ts (Hooks 和类型)

3. 在组件中使用
   import { useGetDatasetQuery } from '@graphql/dataset.generated';

   const { data, loading, error } = useGetDatasetQuery({
     variables: { urn }
   });

4. 渲染 UI
   {data?.dataset && (
     <div>
       <h1>{data.dataset.name}</h1>
       <p>{data.dataset.description}</p>
     </div>
   )}
```

---

## 开发环境设置

### 前置要求

- **Node.js**: 16.13.0 (推荐使用 nvm)
- **Yarn**: 最新版本
- **Java**: JDK 17+ (用于运行后端)
- **Docker**: 用于本地开发环境

### 快速启动

#### 方式一：完整 DataHub 栈 + 前端开发模式

```bash
# 1. 启动后端服务 (在项目根目录)
./gradlew quickstartDebug

# 2. 在新终端中启动前端开发服务器 (在 datahub-web-react 目录)
cd datahub-web-react
yarn install
yarn start

# 访问 http://localhost:3000 (前端开发服务器)
# API 请求会被代理到 http://localhost:9002 (后端)
```

#### 方式二：仅前端 + Mock 数据

```bash
cd datahub-web-react
yarn install
yarn start:mock

# 使用 Mock GraphQL 数据，无需后端
```

#### 方式三：前端 + 远程后端

```bash
# 修改 .env 文件
REACT_APP_PROXY_TARGET=https://your-datahub-instance.com

# 启动开发服务器
yarn start
```

### 常用命令

```bash
# 安装依赖
yarn install

# 启动开发服务器 (localhost:3000)
yarn start

# 生成 GraphQL TypeScript 类型
yarn generate

# 运行测试
yarn test

# 运行单个测试文件
yarn test path/to/file.test.tsx --run

# 代码检查
yarn lint

# 自动修复代码问题
yarn lint-fix

# 代码格式化
yarn format

# 类型检查
yarn type-check

# 构建生产版本
yarn build

# 启动 Storybook
yarn storybook

# 构建 Storybook
yarn build-storybook
```

---

## 性能优化

### 构建优化

1. **代码分割**: React.lazy() 和 Suspense 实现组件懒加载
2. **Tree Shaking**: Vite 自动移除未使用的代码
3. **资源压缩**: 生产构建自动压缩 JS/CSS
4. **Source Maps**: 可选生成 Source Maps (buildWithSourceMap)

### 运行时优化

1. **虚拟滚动**: 大列表使用 react-window 或 rc-table 的虚拟化
2. **React.memo**: 避免不必要的组件重渲染
3. **useMemo/useCallback**: 缓存计算结果和回调函数
4. **Intersection Observer**: 延迟加载可见区域外的内容

### GraphQL 优化

1. **Fragment 复用**: 使用 GraphQL fragments 避免重复字段定义
2. **查询合并**: Apollo Client 自动批量合并查询
3. **字段级缓存**: Apollo cache 的 typePolicies 配置

---

## 测试策略

### 测试框架

- **Vitest**: 单元测试和集成测试
- **React Testing Library**: React 组件测试
- **jsdom**: DOM 模拟环境
- **Cypress**: E2E 测试 (在 smoke-test 目录)

### 测试文件组织

```
src/
├── app/
│   ├── search/
│   │   ├── SearchPage.tsx
│   │   └── __tests__/
│   │       └── SearchPage.test.tsx
│   └── entity/
│       ├── dataset/
│       │   ├── DatasetEntity.tsx
│       │   └── __tests__/
│       │       └── DatasetEntity.test.tsx
```

### 测试最佳实践

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { TestPageContainer } from '@utils/test-utils/TestPageContainer';

describe('SearchPage', () => {
    it('should render search results', async () => {
        const mocks = [
            {
                request: {
                    query: SEARCH_QUERY,
                    variables: { input: { query: 'test' } }
                },
                result: {
                    data: { search: { entities: [...] } }
                }
            }
        ];

        render(
            <TestPageContainer>
                <MockedProvider mocks={mocks}>
                    <SearchPage />
                </MockedProvider>
            </TestPageContainer>
        );

        await waitFor(() => {
            expect(screen.getByText('Search Results')).toBeInTheDocument();
        });
    });
});
```

---

## 部署

### 构建生产版本

```bash
# 生成 GraphQL 类型 + 构建
yarn build

# 构建产物在 dist/ 目录
```

### 环境变量

| 变量名 | 说明 | 默认值 |
|-------|------|--------|
| `REACT_APP_PROXY_TARGET` | GraphQL API 地址 | - |
| `REACT_APP_THEME` | 主题 ID | `themeV2` |
| `REACT_APP_LOGO_URL` | 自定义 Logo URL | - |
| `REACT_APP_FAVICON_URL` | 自定义 Favicon URL | - |
| `BASE_PATH` | 应用部署子路径 | `/` |
| `ANT_THEME_CONFIG` | Ant Design 主题配置文件 | - |

### Docker 部署

前端应用会被打包进 `datahub-frontend-react` Docker 镜像中。

---

## 故障排查

### 常见问题

#### 1. Node 17+ 错误: `error:0308010C:digital envelope routines::unsupported`

**解决方案**: 降级到 Node 16 LTS

```bash
nvm install 16.13.0
nvm use 16.13.0
npm install --global yarn
```

#### 2. 内存不足错误

**解决方案**: 增加 Node.js 内存限制

```bash
NODE_OPTIONS='--max-old-space-size=5120' yarn build
```

#### 3. GraphQL 查询报 401 错误

**原因**: 未登录或 session 过期

**解决方案**:
- 确保后端服务运行在 http://localhost:9002
- 清除浏览器 Cookie，重新登录
- 检查 `CLIENT_AUTH_COOKIE` 是否存在

#### 4. 前端无法连接后端

**检查清单**:
- ✅ 后端是否启动 (`curl http://localhost:9002/api/health`)
- ✅ `.env` 文件中 `REACT_APP_PROXY_TARGET` 配置是否正确
- ✅ CORS 配置是否允许前端域名
- ✅ 防火墙是否阻止端口

---

## 相关资源

### 官方文档

- [DataHub 官方文档](https://docs.datahub.com/)
- [开发者指南](https://docs.datahub.com/docs/developers)
- [GraphQL API 文档](https://docs.datahub.com/docs/graphql/overview)

### 技术栈文档

- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Apollo Client 文档](https://www.apollographql.com/docs/react/)
- [Ant Design 文档](https://ant.design/)
- [Vite 文档](https://vite.dev/)
- [Vitest 文档](https://vitest.dev/)

### 社区

- [DataHub Slack](https://datahubspace.slack.com/) - #datahub-react 频道
- [GitHub Issues](https://github.com/datahub-project/datahub/issues)
- [GitHub Discussions](https://github.com/datahub-project/datahub/discussions)

---

## 贡献指南

### 代码风格

遵循项目的 ESLint 和 Prettier 配置：

```bash
# 自动修复代码风格问题
yarn lint-fix

# 格式化代码
yarn format
```

### Pull Request 流程

1. Fork 仓库并创建功能分支
2. 实现功能并添加测试
3. 确保所有测试通过: `yarn test`
4. 确保代码检查通过: `yarn lint`
5. 提交 PR 到 master 分支

### 提交信息规范

使用 Conventional Commits 格式：

```
feat(search): add advanced filter options
fix(lineage): resolve edge rendering issue
docs(readme): update installation steps
test(dataset): add unit tests for Dataset entity
```

---

## 下一步

- 📖 [核心功能文档](./features/) - 深入了解搜索、实体详情、血缘图等核心功能
- 🎨 [组件库文档](./components/) - Alchemy 组件库使用指南
- 🔌 [GraphQL 集成文档](./graphql/) - GraphQL 查询开发指南
- 🛠️ [开发指南](./development/) - 如何添加新功能和调试技巧

---

**文档版本**: 1.0
**最后更新**: 2025-10-30
**维护者**: DataHub Team
