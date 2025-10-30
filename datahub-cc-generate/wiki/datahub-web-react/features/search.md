# 搜索功能 (Search)

## 目录

- [概述](#概述)
- [架构设计](#架构设计)
- [核心组件](#核心组件)
- [搜索流程](#搜索流程)
- [过滤器系统](#过滤器系统)
- [自动补全](#自动补全)
- [高级搜索](#高级搜索)
- [开发指南](#开发指南)

---

## 概述

DataHub 的搜索功能是用户查找元数据实体的核心入口，支持全文搜索、多维度过滤、自动补全、高级查询等功能。

### 功能特性

- ✅ **全文搜索**: 支持跨所有实体类型的全文搜索
- ✅ **多维度过滤**: 支持平台、类型、标签、域、所有者等多种过滤条件
- ✅ **自动补全**: 实时搜索建议和最近搜索历史
- ✅ **高级搜索**: 支持复杂的过滤器组合和逻辑运算
- ✅ **搜索保存**: 可保存常用搜索为"视图"
- ✅ **搜索推荐**: 基于使用历史的智能推荐
- ✅ **快速切换**: Command+K 快捷键快速打开搜索

### 支持的实体类型

| 实体类型 | 显示名称 | 搜索字段 |
|---------|---------|---------|
| Dataset | 数据集 | 名称、描述、Schema 字段、标签 |
| Dashboard | 仪表板 | 名称、描述、图表 |
| Chart | 图表 | 名称、描述 |
| DataJob | 数据任务 | 名称、描述 |
| DataFlow | 数据流 | 名称、描述 |
| CorpUser | 用户 | 姓名、用户名、邮箱 |
| CorpGroup | 用户组 | 名称、描述 |
| GlossaryTerm | 术语 | 名称、描述、定义 |
| Tag | 标签 | 名称、描述 |
| Container | 容器 | 名称、描述 |

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      SearchPage                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ SearchHeader (搜索栏 + 过滤器)                        │  │
│  │  - SearchBar                                          │  │
│  │  - EntityTypeFilter                                   │  │
│  │  - SimpleSearchFilters                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────┬────────────────────────────────┐   │
│  │ Sidebar            │ SearchResults                  │   │
│  │ (左侧导航)         │                                │   │
│  │                    │  - SearchResultList            │   │
│  │ - Browse Tree      │  - EntityPreview Cards         │   │
│  │ - Filter Groups    │  - Pagination                  │   │
│  │   - Platform       │  - Sort Options                │   │
│  │   - Type           │                                │   │
│  │   - Tags           │                                │   │
│  │   - Domain         │                                │   │
│  │   - Owner          │                                │   │
│  └────────────────────┴────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    GraphQL Query: search
                              ↓
                    GMS Backend (Elasticsearch)
```

### 目录结构

```
src/app/searchV2/
├── SearchPage.tsx                 # 搜索页面主组件
├── SearchHeader.tsx               # 搜索头部 (搜索栏 + 过滤器)
├── SearchBar.tsx                  # 搜索输入框
├── SearchResults.tsx              # 搜索结果容器
├── SearchResultList.tsx           # 搜索结果列表
├── EmptySearchResults.tsx         # 空结果页面
│
├── autoComplete/                  # 自动补全
│   ├── AutoCompleteUser.tsx       # 用户自动补全
│   ├── AutoCompleteEntity.tsx     # 实体自动补全
│   └── RecentSearches.tsx         # 最近搜索
│
├── filters/                       # 过滤器系统
│   ├── SimpleSearchFilters.tsx    # 简单过滤器
│   ├── AdvancedSearchFilters.tsx  # 高级过滤器
│   ├── EntityTypeFilter.tsx       # 实体类型过滤
│   ├── PlatformFilter.tsx         # 平台过滤
│   ├── TagFilter.tsx              # 标签过滤
│   ├── DomainFilter.tsx           # 域过滤
│   └── OwnerFilter.tsx            # 所有者过滤
│
├── sidebar/                       # 侧边栏
│   ├── BrowseSidebar.tsx          # 浏览导航树
│   ├── EntityLink.tsx             # 实体链接
│   └── PlatformNode.tsx           # 平台节点
│
├── sorting/                       # 排序
│   └── SortDropdown.tsx           # 排序下拉框
│
├── utils/                         # 工具函数
│   ├── navigateToSearchUrl.ts     # 导航到搜索页
│   ├── generateOrFilters.ts       # 生成过滤器
│   └── constants.ts               # 常量定义
│
└── context/                       # Context
    └── SearchResultContext.tsx    # 搜索结果 Context
```

---

## 核心组件

### 1. SearchPage

搜索页面的主容器组件。

**文件位置**: `/src/app/searchV2/SearchPage.tsx`

**职责**:
- 管理搜索状态 (查询字符串、过滤器、分页)
- 执行 GraphQL 搜索查询
- 协调子组件 (Header、Sidebar、Results)

**关键代码**:

```typescript
export default function SearchPage() {
    const { query, filters, page } = useQueryParams();
    const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);

    // 执行搜索查询
    const { data, loading, error } = useSearchQuery({
        variables: {
            input: {
                type: entityTypes,
                query,
                start: (page - 1) * PAGE_SIZE,
                count: PAGE_SIZE,
                filters: filters,
            },
        },
    });

    return (
        <SearchContainer>
            <SearchHeader
                query={query}
                entityTypes={entityTypes}
                onSearch={handleSearch}
                onFilterChange={handleFilterChange}
            />

            <ContentContainer>
                <Sidebar filters={filters} onFilterChange={handleFilterChange} />
                <SearchResults
                    results={data?.search?.searchResults}
                    loading={loading}
                    total={data?.search?.total}
                />
            </ContentContainer>
        </SearchContainer>
    );
}
```

### 2. SearchBar

搜索输入框组件，支持自动补全和搜索建议。

**文件位置**: `/src/app/searchV2/SearchBar.tsx`

**功能**:
- 实时搜索建议
- 最近搜索历史
- 快捷键支持 (Command+K)
- 搜索上下文切换 (全局搜索 vs 当前页面搜索)

**代码示例**:

```typescript
interface SearchBarProps {
    initialQuery?: string;
    placeholderText?: string;
    suggestions?: boolean;
    autoCompleteStyle?: 'default' | 'homepage';
    onSearch: (query: string) => void;
}

export function SearchBar({
    initialQuery,
    placeholderText = 'Search DataHub...',
    onSearch
}: SearchBarProps) {
    const [query, setQuery] = useState(initialQuery || '');
    const [showAutoComplete, setShowAutoComplete] = useState(false);

    // 自动补全查询
    const { data: autoCompleteData } = useAutoCompleteQuery({
        variables: { input: { query, limit: 5 } },
        skip: query.length < 2,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(query);
        setShowAutoComplete(false);
    };

    return (
        <SearchBarContainer>
            <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowAutoComplete(true)}
                placeholder={placeholderText}
            />

            {showAutoComplete && (
                <AutoCompleteDropdown
                    suggestions={autoCompleteData?.autoComplete?.suggestions}
                    recentSearches={getRecentSearches()}
                    onSelect={(suggestion) => {
                        setQuery(suggestion.text);
                        onSearch(suggestion.text);
                    }}
                />
            )}
        </SearchBarContainer>
    );
}
```

### 3. SearchResults

搜索结果展示组件。

**文件位置**: `/src/app/searchV2/SearchResults.tsx`

**功能**:
- 渲染搜索结果列表
- 分页控制
- 排序选项
- 空结果处理

**代码示例**:

```typescript
interface SearchResultsProps {
    results?: SearchResult[];
    loading: boolean;
    total?: number;
    page: number;
    onPageChange: (page: number) => void;
}

export function SearchResults({
    results,
    loading,
    total,
    page,
    onPageChange
}: SearchResultsProps) {
    const entityRegistry = useEntityRegistry();

    if (loading) {
        return <LoadingSection />;
    }

    if (!results || results.length === 0) {
        return <EmptySearchResults />;
    }

    return (
        <ResultsContainer>
            <ResultsHeader>
                <ResultCount>{total} results</ResultCount>
                <SortDropdown />
            </ResultsHeader>

            <ResultsList>
                {results.map((result) => {
                    const entity = entityRegistry.getEntity(result.entity.type);
                    return (
                        <ResultItem key={result.entity.urn}>
                            {entity.renderPreview(PreviewType.SEARCH, result.entity)}
                        </ResultItem>
                    );
                })}
            </ResultsList>

            <Pagination
                current={page}
                total={total}
                pageSize={PAGE_SIZE}
                onChange={onPageChange}
            />
        </ResultsContainer>
    );
}
```

### 4. SearchResultList

搜索结果列表，负责渲染实体预览卡片。

**特性**:
- 使用 EntityRegistry 动态渲染不同类型的实体
- 支持虚拟滚动 (大量结果时)
- 高亮匹配文本
- 显示匹配的字段 (Schema 字段、标签等)

---

## 搜索流程

### 完整搜索流程

```
1. 用户输入搜索查询
   ↓
2. SearchBar 捕获输入
   ↓
3. 触发自动补全 (如果启用)
   - 查询: autoComplete(query: "sales")
   - 显示建议和历史记录
   ↓
4. 用户提交搜索 (Enter 或点击搜索按钮)
   ↓
5. 更新 URL 查询参数
   - /search?query=sales&filters=...
   ↓
6. SearchPage 检测 URL 变化
   ↓
7. 构建 GraphQL 搜索查询
   {
     input: {
       type: [DATASET, DASHBOARD],
       query: "sales",
       start: 0,
       count: 10,
       filters: [
         { field: "platform", values: ["snowflake"] },
         { field: "tags", values: ["pii"] }
       ]
     }
   }
   ↓
8. Apollo Client 发送请求到 GMS
   ↓
9. GMS 查询 Elasticsearch
   ↓
10. 返回搜索结果
    {
      search: {
        total: 42,
        searchResults: [
          { entity: { urn, type, ... }, matchedFields: [...] },
          ...
        ]
      }
    }
    ↓
11. SearchResults 渲染结果
    - 使用 EntityRegistry 渲染预览卡片
    - 高亮匹配文本
    ↓
12. 用户可以:
    - 点击结果查看详情
    - 调整过滤器
    - 切换页面
    - 修改排序
```

### URL 查询参数

搜索状态通过 URL 查询参数管理，确保搜索结果可分享和书签化。

**查询参数格式**:

```
/search?query=<search_query>
        &filter_platform=snowflake,bigquery
        &filter_tags=pii
        &filter_domain=urn:li:domain:123
        &filter_entityType=DATASET,DASHBOARD
        &page=1
        &sortBy=_score
```

**参数说明**:

| 参数 | 说明 | 示例 |
|------|------|------|
| `query` | 搜索查询字符串 | `sales_data` |
| `filter_<field>` | 过滤器 (可多个) | `filter_platform=snowflake` |
| `page` | 当前页码 | `page=2` |
| `sortBy` | 排序字段 | `sortBy=_score` |

**代码示例**:

```typescript
// 从 URL 读取搜索参数
function useSearchParams() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);

    return {
        query: params.get('query') || '',
        filters: parseFiltersFromParams(params),
        page: parseInt(params.get('page') || '1', 10),
        sortBy: params.get('sortBy') || '_score',
    };
}

// 更新 URL 查询参数
function updateSearchUrl(query: string, filters: FacetFilter[]) {
    const params = new URLSearchParams();
    params.set('query', query);

    filters.forEach((filter) => {
        params.set(`filter_${filter.field}`, filter.values.join(','));
    });

    history.push(`/search?${params.toString()}`);
}
```

---

## 过滤器系统

过滤器系统支持多维度的搜索结果筛选。

### 过滤器类型

#### 1. 实体类型过滤 (EntityTypeFilter)

选择要搜索的实体类型。

```typescript
<EntityTypeFilter
    selectedTypes={[EntityType.Dataset, EntityType.Dashboard]}
    onChangeTypes={(types) => setEntityTypes(types)}
/>
```

#### 2. 平台过滤 (PlatformFilter)

按数据平台筛选 (如 Snowflake、BigQuery)。

```typescript
<PlatformFilter
    selectedPlatforms={['snowflake', 'bigquery']}
    onChangePlatforms={(platforms) => updateFilter('platform', platforms)}
/>
```

#### 3. 标签过滤 (TagFilter)

按标签筛选。

```typescript
<TagFilter
    selectedTags={['pii', 'deprecated']}
    onChangeTags={(tags) => updateFilter('tags', tags)}
/>
```

#### 4. 域过滤 (DomainFilter)

按域筛选。

```typescript
<DomainFilter
    selectedDomains={['urn:li:domain:123']}
    onChangeDomains={(domains) => updateFilter('domain', domains)}
/>
```

#### 5. 所有者过滤 (OwnerFilter)

按所有者筛选。

```typescript
<OwnerFilter
    selectedOwners={['urn:li:corpuser:john']}
    onChangeOwners={(owners) => updateFilter('owners', owners)}
/>
```

### 过滤器数据结构

```typescript
interface FacetFilter {
    field: string;      // 过滤字段名
    values: string[];   // 过滤值
    condition?: FilterOperator;  // 逻辑运算符 (AND/OR)
    negated?: boolean;  // 是否取反
}

enum FilterOperator {
    AND = 'AND',
    OR = 'OR',
}

// 示例
const filters: FacetFilter[] = [
    { field: 'platform', values: ['snowflake', 'bigquery'], condition: 'OR' },
    { field: 'tags', values: ['pii'], condition: 'AND' },
    { field: 'deprecated', values: ['false'], condition: 'AND' },
];
```

### 过滤器 UI 组件

**SimpleSearchFilters** - 简单过滤器 UI

```typescript
export function SimpleSearchFilters({ filters, onFilterChange }: Props) {
    return (
        <FiltersContainer>
            <FilterSection title="Platform">
                <PlatformFilter
                    selected={getFilterValues(filters, 'platform')}
                    onChange={(values) => updateFilter('platform', values)}
                />
            </FilterSection>

            <FilterSection title="Tags">
                <TagFilter
                    selected={getFilterValues(filters, 'tags')}
                    onChange={(values) => updateFilter('tags', values)}
                />
            </FilterSection>

            {/* 更多过滤器... */}
        </FiltersContainer>
    );
}
```

### 高级过滤器

高级过滤器支持复杂的逻辑组合 (AND/OR/NOT)。

```typescript
interface AdvancedFilter {
    operator: 'AND' | 'OR';
    filters: Array<{
        field: string;
        condition: 'EQUAL' | 'CONTAIN' | 'START_WITH' | 'END_WITH';
        values: string[];
        negated?: boolean;
    }>;
}

// 示例: (platform = snowflake OR platform = bigquery) AND tags = pii AND NOT deprecated
const advancedFilter: AdvancedFilter = {
    operator: 'AND',
    filters: [
        {
            field: 'platform',
            condition: 'EQUAL',
            values: ['snowflake', 'bigquery'],
        },
        {
            field: 'tags',
            condition: 'EQUAL',
            values: ['pii'],
        },
        {
            field: 'deprecated',
            condition: 'EQUAL',
            values: ['true'],
            negated: true,
        },
    ],
};
```

---

## 自动补全

自动补全功能提供实时搜索建议。

### AutoComplete 组件

**文件位置**: `/src/app/searchV2/autoComplete/`

**功能**:
- 实体名称建议
- 最近搜索历史
- 高频搜索推荐
- 键盘导航支持

**GraphQL Query**:

```graphql
query autoComplete($input: AutoCompleteInput!) {
    autoComplete(input: $input) {
        query
        suggestions {
            type
            entity {
                urn
                type
                ... on Dataset {
                    name
                    platform { name }
                }
                ... on Dashboard {
                    properties { name }
                }
            }
            text
            score
        }
    }
}
```

**使用示例**:

```typescript
export function AutoCompleteDropdown({ query, onSelect }: Props) {
    const { data, loading } = useAutoCompleteQuery({
        variables: {
            input: {
                type: null,  // 所有类型
                query,
                limit: 10,
            },
        },
        skip: query.length < 2,
    });

    const suggestions = data?.autoComplete?.suggestions || [];
    const recentSearches = getRecentSearches();

    return (
        <DropdownContainer>
            {recentSearches.length > 0 && (
                <Section title="Recent Searches">
                    {recentSearches.map((search) => (
                        <SuggestionItem
                            key={search}
                            icon={<ClockIcon />}
                            text={search}
                            onClick={() => onSelect(search)}
                        />
                    ))}
                </Section>
            )}

            {suggestions.length > 0 && (
                <Section title="Suggestions">
                    {suggestions.map((suggestion) => (
                        <SuggestionItem
                            key={suggestion.entity.urn}
                            icon={getEntityIcon(suggestion.entity.type)}
                            text={suggestion.text}
                            subText={getEntitySubText(suggestion.entity)}
                            onClick={() => onSelect(suggestion.text)}
                        />
                    ))}
                </Section>
            )}
        </DropdownContainer>
    );
}
```

### 最近搜索历史

最近搜索存储在 LocalStorage 中。

```typescript
const RECENT_SEARCHES_KEY = 'datahub_recent_searches';
const MAX_RECENT_SEARCHES = 10;

export function addRecentSearch(query: string) {
    const recent = getRecentSearches();
    const updated = [query, ...recent.filter((q) => q !== query)].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

export function getRecentSearches(): string[] {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
}

export function clearRecentSearches() {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
}
```

---

## 高级搜索

高级搜索允许用户构建复杂的查询条件。

### 高级搜索 UI

**文件位置**: `/src/app/searchV2/advanced/AdvancedSearchFilters.tsx`

**功能**:
- 可视化查询构建器
- 多条件组合 (AND/OR/NOT)
- 字段级搜索
- 保存为视图

**UI 示例**:

```
┌────────────────────────────────────────────────────────────┐
│ Advanced Search Builder                                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ [AND ▼]                                                    │
│   ┌──────────────────────────────────────────────────┐   │
│   │ Platform [is ▼] [snowflake, bigquery]     [×]   │   │
│   └──────────────────────────────────────────────────┘   │
│                                                            │
│ [AND ▼]                                                    │
│   ┌──────────────────────────────────────────────────┐   │
│   │ Tags     [is ▼] [pii]                     [×]   │   │
│   └──────────────────────────────────────────────────┘   │
│                                                            │
│ [AND ▼]                                                    │
│   ┌──────────────────────────────────────────────────┐   │
│   │ Domain   [is ▼] [Finance]                 [×]   │   │
│   └──────────────────────────────────────────────────┘   │
│                                                            │
│ [+ Add Filter]                                             │
│                                                            │
│ [Apply] [Clear] [Save as View]                            │
└────────────────────────────────────────────────────────────┘
```

### 保存搜索视图

用户可以将常用搜索保存为"视图"。

```typescript
interface SearchView {
    urn: string;
    name: string;
    description?: string;
    query: string;
    filters: FacetFilter[];
    entityTypes: EntityType[];
}

// 保存视图
const saveView = useSaveViewMutation();

await saveView({
    variables: {
        input: {
            name: 'PII Datasets',
            description: 'All PII tagged datasets',
            viewType: ViewType.GLOBAL,
            definition: {
                entityTypes: [EntityType.Dataset],
                query: '*',
                filters: [{ field: 'tags', values: ['pii'] }],
            },
        },
    },
});

// 加载视图
const { data } = useListViewsQuery();
const views = data?.listViews?.views || [];
```

---

## GraphQL 查询

### 搜索查询

**文件位置**: `/src/graphql/search.graphql`

```graphql
query search($input: SearchInput!) {
    search(input: $input) {
        start
        count
        total
        searchResults {
            entity {
                urn
                type
                ...autoCompleteFields  # Fragment with entity-specific fields
            }
            matchedFields {
                name
                value
            }
            insights {
                text
                icon
            }
        }
        facets {
            field
            displayName
            aggregations {
                value
                count
                entity {
                    urn
                    type
                }
            }
        }
    }
}
```

### 自动补全查询

```graphql
query autoComplete($input: AutoCompleteInput!) {
    autoComplete(input: $input) {
        query
        suggestions {
            type
            entity {
                urn
                type
                ... on Dataset {
                    name
                    platform { name }
                    properties { qualifiedName }
                }
            }
            text
            score
        }
    }
}
```

### 使用生成的 Hooks

```typescript
import { useSearchQuery, useAutoCompleteQuery } from '@graphql/search.generated';

// 搜索查询
const { data, loading, error } = useSearchQuery({
    variables: {
        input: {
            type: [EntityType.Dataset],
            query: 'sales',
            start: 0,
            count: 10,
            filters: [
                { field: 'platform', values: ['snowflake'] },
            ],
        },
    },
});

// 自动补全查询
const { data: autoCompleteData } = useAutoCompleteQuery({
    variables: {
        input: { query: 'sal', limit: 5 },
    },
});
```

---

## 开发指南

### 添加新的过滤器

#### 1. 定义过滤器组件

```typescript
// src/app/searchV2/filters/MyCustomFilter.tsx

interface MyCustomFilterProps {
    selectedValues: string[];
    onChangeValues: (values: string[]) => void;
}

export function MyCustomFilter({ selectedValues, onChangeValues }: Props) {
    const [options, setOptions] = useState<string[]>([]);

    // 加载过滤器选项
    useEffect(() => {
        fetchFilterOptions().then(setOptions);
    }, []);

    return (
        <FilterSection title="My Custom Filter">
            <Checkbox.Group
                value={selectedValues}
                onChange={onChangeValues}
            >
                {options.map((option) => (
                    <Checkbox key={option} value={option}>
                        {option}
                    </Checkbox>
                ))}
            </Checkbox.Group>
        </FilterSection>
    );
}
```

#### 2. 集成到搜索页面

```typescript
// src/app/searchV2/SearchPage.tsx

function SearchPage() {
    const [customFilterValues, setCustomFilterValues] = useState<string[]>([]);

    const filters = [
        ...existingFilters,
        {
            field: 'myCustomField',
            values: customFilterValues,
        },
    ];

    return (
        <SearchContainer>
            <Sidebar>
                <MyCustomFilter
                    selectedValues={customFilterValues}
                    onChangeValues={setCustomFilterValues}
                />
            </Sidebar>
            {/* ... */}
        </SearchContainer>
    );
}
```

### 自定义实体搜索结果渲染

实体的搜索结果渲染由 Entity 类的 `renderPreview()` 方法控制。

```typescript
// src/app/entity/dataset/DatasetEntity.tsx

class DatasetEntity implements Entity<Dataset> {
    renderPreview(type: PreviewType, data: Dataset): JSX.Element {
        if (type === PreviewType.SEARCH) {
            return (
                <DatasetSearchPreview
                    urn={data.urn}
                    name={data.name}
                    platform={data.platform}
                    description={data.properties?.description}
                    owners={data.ownership?.owners}
                    tags={data.tags}
                />
            );
        }
        // ... 其他预览类型
    }
}
```

### 测试搜索功能

```typescript
// src/app/searchV2/__tests__/SearchPage.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { SearchPage } from '../SearchPage';

const searchMock = {
    request: {
        query: SEARCH_QUERY,
        variables: {
            input: {
                type: [EntityType.Dataset],
                query: 'test',
                start: 0,
                count: 10,
            },
        },
    },
    result: {
        data: {
            search: {
                total: 2,
                searchResults: [
                    { entity: { urn: 'urn:li:dataset:1', type: 'DATASET', name: 'Test Dataset 1' } },
                    { entity: { urn: 'urn:li:dataset:2', type: 'DATASET', name: 'Test Dataset 2' } },
                ],
            },
        },
    },
};

describe('SearchPage', () => {
    it('should render search results', async () => {
        render(
            <MockedProvider mocks={[searchMock]}>
                <SearchPage />
            </MockedProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Dataset 1')).toBeInTheDocument();
            expect(screen.getByText('Test Dataset 2')).toBeInTheDocument();
        });
    });
});
```

---

## 性能优化

### 1. 搜索防抖

避免频繁的 API 请求：

```typescript
import { useDebouncedValue } from '@hooks/useDebouncedValue';

function SearchBar() {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebouncedValue(query, 300);  // 300ms 延迟

    const { data } = useAutoCompleteQuery({
        variables: { input: { query: debouncedQuery } },
        skip: debouncedQuery.length < 2,
    });
}
```

### 2. 虚拟滚动

大量搜索结果使用虚拟滚动：

```typescript
import { FixedSizeList } from 'react-window';

function SearchResultList({ results }: Props) {
    return (
        <FixedSizeList
            height={600}
            itemCount={results.length}
            itemSize={120}
            width="100%"
        >
            {({ index, style }) => (
                <div style={style}>
                    {renderResult(results[index])}
                </div>
            )}
        </FixedSizeList>
    );
}
```

### 3. 结果缓存

利用 Apollo Client 的缓存机制：

```typescript
const { data } = useSearchQuery({
    variables: { input: searchInput },
    fetchPolicy: 'cache-first',  // 优先使用缓存
});
```

---

## 常见问题

### Q1: 搜索结果不准确？

**原因**:
- Elasticsearch 索引未更新
- 搜索权重配置不当

**解决方案**:
```bash
# 重建 Elasticsearch 索引
curl -X POST http://localhost:9002/gms/operations?action=restoreIndices
```

### Q2: 搜索性能慢？

**排查步骤**:
1. 检查 Elasticsearch 性能
2. 优化 GraphQL 查询 (减少字段)
3. 启用搜索结果缓存
4. 使用虚拟滚动

### Q3: 过滤器不生效？

**检查清单**:
- ✅ 过滤器字段名是否正确
- ✅ 过滤器值格式是否正确 (URN vs 名称)
- ✅ URL 查询参数是否正确编码
- ✅ GraphQL 变量是否正确传递

---

## 相关资源

- [实体详情页文档](./entity-details.md)
- [血缘图文档](./lineage-viz.md)
- [GraphQL 查询指南](../graphql/queries.md)
- [EntityRegistry 文档](../development/entity-registry.md)

---

**文档版本**: 1.0
**最后更新**: 2025-10-30
