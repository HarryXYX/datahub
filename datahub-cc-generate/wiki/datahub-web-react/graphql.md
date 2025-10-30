# GraphQL 集成指南

## 目录

- [概述](#概述)
- [Apollo Client 配置](#apollo-client-配置)
- [GraphQL 代码生成](#graphql-代码生成)
- [查询开发](#查询开发)
- [Mutation 开发](#mutation-开发)
- [缓存策略](#缓存策略)
- [错误处理](#错误处理)
- [最佳实践](#最佳实践)

---

## 概述

DataHub 前端使用 Apollo Client 与后端 GraphQL API 通信,通过 GraphQL Code Generator 自动生成 TypeScript 类型和 React Hooks。

### 技术栈

- **Apollo Client** 3.3.19: GraphQL 客户端
- **GraphQL Code Generator** 5.0.0: 类型生成工具
- **graphql-tag**: GraphQL 查询解析

### GraphQL 文件组织

```
src/graphql/
├── search.graphql          # 搜索查询
├── dataset.graphql         # Dataset 实体查询
├── dashboard.graphql       # Dashboard 实体查询
├── lineage.graphql         # 血缘查询
├── user.graphql            # 用户查询
├── mutations.graphql       # 通用 Mutations
├── fragments.graphql       # 可复用 Fragments
└── *.generated.ts          # 自动生成的 TypeScript 文件
```

---

## Apollo Client 配置

### 基础配置

**文件位置**: `/src/App.tsx`

```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

// HTTP 链接
const httpLink = createHttpLink({
    uri: '/api/v2/graphql',
});

// 错误处理链接
const errorLink = onError(({ networkError }) => {
    if (networkError) {
        const serverError = networkError as ServerError;
        if (serverError.statusCode === 401) {
            // 401 错误 -> 重定向到登录页
            window.location.replace('/authenticate');
        }
    }
});

// Apollo Client 实例
const client = new ApolloClient({
    link: errorLink.concat(httpLink),
    cache: new InMemoryCache({
        typePolicies: {
            Query: {
                fields: {
                    // 自定义字段合并策略
                    dataset: {
                        merge: (existing, incoming) => ({
                            ...existing,
                            ...incoming,
                        }),
                    },
                },
            },
        },
        // Union 类型支持
        possibleTypes: possibleTypesResult.possibleTypes,
    }),
    credentials: 'include',
    defaultOptions: {
        watchQuery: { fetchPolicy: 'no-cache' },
        query: { fetchPolicy: 'no-cache' },
    },
});
```

### 类型策略 (Type Policies)

```typescript
const typePolicies = {
    Query: {
        fields: {
            // 自定义字段合并逻辑
            search: {
                keyArgs: ['input', ['type', 'query', 'filters']],
                merge(existing, incoming, { args }) {
                    // 分页合并
                    if (!existing) return incoming;
                    if (!args?.input?.start) return incoming;

                    return {
                        ...incoming,
                        searchResults: [
                            ...existing.searchResults,
                            ...incoming.searchResults,
                        ],
                    };
                },
            },
        },
    },
    Dataset: {
        fields: {
            // 字段级缓存策略
            upstream: {
                merge: false,  // 不合并,直接覆盖
            },
        },
    },
};
```

---

## GraphQL 代码生成

### 配置文件

**文件位置**: `/codegen.yml`

```yaml
overwrite: true
schema:
    - '../datahub-graphql-core/src/main/resources/*.graphql'
config:
    scalars:
        Long: number
documents:
    - 'src/**/*.graphql'
generates:
    # 生成全局类型
    src/types.generated.ts:
        plugins:
            - 'typescript'

    # 生成 Union 类型映射
    src/possibleTypes.generated.ts:
        plugins:
            - 'fragment-matcher'

    # 生成每个查询的 Hooks 和类型
    src/:
        preset: near-operation-file
        presetConfig:
            extension: '.generated.ts'
            baseTypesPath: types.generated.ts
        plugins:
            - 'typescript-operations'
            - 'typescript-react-apollo'
            - add:
                  content: '/* eslint-disable */'
hooks:
    afterAllFileWrite:
        - prettier --write
```

### 运行代码生成

```bash
# 生成 TypeScript 类型和 Hooks
yarn generate

# 或
./gradlew :datahub-web-react:yarnGenerate
```

### 生成的文件

```typescript
// src/graphql/dataset.generated.ts (自动生成)

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';

// 类型定义
export type GetDatasetQueryVariables = Exact<{
    urn: Scalars['String'];
}>;

export type GetDatasetQuery = {
    dataset?: {
        urn: string;
        name: string;
        properties?: {
            description?: string;
        };
    };
};

// React Hook
export function useGetDatasetQuery(
    baseOptions: Apollo.QueryHookOptions<GetDatasetQuery, GetDatasetQueryVariables>
) {
    return Apollo.useQuery<GetDatasetQuery, GetDatasetQueryVariables>(
        GetDatasetDocument,
        baseOptions
    );
}

// Lazy Query Hook
export function useGetDatasetLazyQuery(
    baseOptions?: Apollo.LazyQueryHookOptions<GetDatasetQuery, GetDatasetQueryVariables>
) {
    return Apollo.useLazyQuery<GetDatasetQuery, GetDatasetQueryVariables>(
        GetDatasetDocument,
        baseOptions
    );
}
```

---

## 查询开发

### 定义 GraphQL 查询

**文件位置**: `/src/graphql/dataset.graphql`

```graphql
# Fragment: 可复用的字段集合
fragment datasetFields on Dataset {
    urn
    type
    name
    properties {
        name
        description
        qualifiedName
        created {
            time
            actor
        }
        lastModified {
            time
            actor
        }
    }
    platform {
        urn
        name
        properties {
            logoUrl
        }
    }
    tags {
        tags {
            tag {
                urn
                name
            }
        }
    }
}

# Query: 获取单个 Dataset
query getDataset($urn: String!) {
    dataset(urn: $urn) {
        ...datasetFields
        ownership {
            owners {
                owner {
                    ... on CorpUser {
                        urn
                        username
                        properties {
                            displayName
                        }
                    }
                }
            }
        }
        schemaMetadata {
            fields {
                fieldPath
                nativeDataType
                type
                description
            }
        }
    }
}

# Query: 搜索 Datasets
query searchDatasets($input: SearchInput!) {
    search(input: $input) {
        start
        count
        total
        searchResults {
            entity {
                ... on Dataset {
                    ...datasetFields
                }
            }
        }
    }
}
```

### 使用生成的 Hook

```typescript
import { useGetDatasetQuery } from '@graphql/dataset.generated';

function DatasetProfile({ urn }: Props) {
    // 执行查询
    const { data, loading, error, refetch } = useGetDatasetQuery({
        variables: { urn },
    });

    if (loading) return <Loading />;
    if (error) return <Error message={error.message} />;
    if (!data?.dataset) return <NotFound />;

    const dataset = data.dataset;

    return (
        <div>
            <h1>{dataset.name}</h1>
            <p>{dataset.properties?.description}</p>
            <Button onClick={() => refetch()}>Refresh</Button>
        </div>
    );
}
```

### 懒加载查询 (Lazy Query)

```typescript
import { useGetDatasetLazyQuery } from '@graphql/dataset.generated';

function DatasetSearch() {
    const [searchDatasets, { data, loading }] = useGetDatasetLazyQuery();

    const handleSearch = (query: string) => {
        searchDatasets({
            variables: {
                input: {
                    type: 'DATASET',
                    query,
                    start: 0,
                    count: 10,
                },
            },
        });
    };

    return (
        <div>
            <SearchBar onSearch={handleSearch} />
            {loading && <Loading />}
            {data && <Results data={data.search?.searchResults} />}
        </div>
    );
}
```

### 手动执行查询

```typescript
import { useApolloClient } from '@apollo/client';
import { GetDatasetDocument } from '@graphql/dataset.generated';

function ManualQuery() {
    const client = useApolloClient();

    const fetchDataset = async (urn: string) => {
        const { data } = await client.query({
            query: GetDatasetDocument,
            variables: { urn },
        });
        return data.dataset;
    };

    return <button onClick={() => fetchDataset('urn:...')}>Fetch</button>;
}
```

---

## Mutation 开发

### 定义 Mutation

**文件位置**: `/src/graphql/mutations.graphql`

```graphql
mutation updateDataset($input: DatasetUpdateInput!) {
    updateDataset(input: $input) {
        urn
        properties {
            description
        }
    }
}

mutation addTag($input: TagAssociationInput!) {
    addTag(input: $input)
}

mutation removeTag($input: TagAssociationInput!) {
    removeTag(input: $input)
}
```

### 使用 Mutation Hook

```typescript
import { useUpdateDatasetMutation } from '@graphql/mutations.generated';

function EditDatasetDescription({ urn, currentDescription }: Props) {
    const [description, setDescription] = useState(currentDescription);

    const [updateDataset, { loading, error }] = useUpdateDatasetMutation({
        onCompleted: () => {
            message.success('Description updated!');
        },
        onError: (error) => {
            message.error(`Failed: ${error.message}`);
        },
    });

    const handleSave = () => {
        updateDataset({
            variables: {
                input: {
                    urn,
                    description,
                },
            },
        });
    };

    return (
        <div>
            <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
            <Button onClick={handleSave} loading={loading}>
                Save
            </Button>
        </div>
    );
}
```

### 乐观更新 (Optimistic Response)

```typescript
const [addTag] = useAddTagMutation({
    optimisticResponse: {
        addTag: true,
    },
    update(cache, { data }) {
        // 手动更新缓存
        const existingData = cache.readQuery({
            query: GetDatasetDocument,
            variables: { urn },
        });

        if (existingData?.dataset) {
            cache.writeQuery({
                query: GetDatasetDocument,
                variables: { urn },
                data: {
                    dataset: {
                        ...existingData.dataset,
                        tags: {
                            tags: [
                                ...existingData.dataset.tags.tags,
                                { tag: { urn: tagUrn, name: tagName } },
                            ],
                        },
                    },
                },
            });
        }
    },
});
```

### 刷新查询

```typescript
const [updateDataset] = useUpdateDatasetMutation({
    refetchQueries: [
        { query: GetDatasetDocument, variables: { urn } },
        { query: SearchDatasetsDocument, variables: { input: {...} } },
    ],
    awaitRefetchQueries: true,
});
```

---

## 缓存策略

### 缓存读写

```typescript
import { useApolloClient } from '@apollo/client';
import { GetDatasetDocument } from '@graphql/dataset.generated';

function CacheExample() {
    const client = useApolloClient();

    // 读取缓存
    const readCache = () => {
        const data = client.readQuery({
            query: GetDatasetDocument,
            variables: { urn: 'urn:...' },
        });
        console.log(data?.dataset);
    };

    // 写入缓存
    const writeCache = () => {
        client.writeQuery({
            query: GetDatasetDocument,
            variables: { urn: 'urn:...' },
            data: {
                dataset: {
                    urn: 'urn:...',
                    name: 'Updated Name',
                    // ... 其他字段
                },
            },
        });
    };

    // 清除缓存
    const clearCache = () => {
        client.cache.evict({ id: 'Dataset:urn:...' });
        client.cache.gc();
    };

    return <div>{/* ... */}</div>;
}
```

### Fetch Policy

```typescript
const { data } = useGetDatasetQuery({
    variables: { urn },
    fetchPolicy: 'cache-first',  // 默认: 优先使用缓存
    // 其他选项:
    // 'cache-only'      - 仅使用缓存,不发送网络请求
    // 'network-only'    - 总是发送请求,忽略缓存
    // 'no-cache'        - 不使用缓存,也不存储结果
    // 'cache-and-network' - 先返回缓存,同时发送请求更新
});
```

---

## 错误处理

### 组件级错误处理

```typescript
function DatasetProfile({ urn }: Props) {
    const { data, loading, error } = useGetDatasetQuery({
        variables: { urn },
        onError: (error) => {
            console.error('Query failed:', error);
            // 可选: 显示错误提示
            message.error(error.message);
        },
    });

    if (error) {
        return (
            <ErrorCard>
                <h3>Failed to load dataset</h3>
                <p>{error.message}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </ErrorCard>
        );
    }

    // ...
}
```

### 全局错误处理

在 Apollo Client 配置中处理:

```typescript
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
    if (graphQLErrors) {
        graphQLErrors.forEach(({ message, locations, path, extensions }) => {
            console.error(
                `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
            );

            // 根据错误码处理
            const errorCode = extensions?.code;
            if (errorCode === 'UNAUTHENTICATED') {
                window.location.replace('/authenticate');
            }
        });
    }

    if (networkError) {
        console.error(`[Network error]: ${networkError}`);
    }
});
```

---

## 最佳实践

### 1. 使用 Fragments 复用字段

```graphql
# fragments.graphql
fragment entityFields on Entity {
    urn
    type
}

fragment datasetBasicFields on Dataset {
    ...entityFields
    name
    properties {
        description
    }
}

# 在查询中使用
query getDataset($urn: String!) {
    dataset(urn: $urn) {
        ...datasetBasicFields
        # 额外字段
        ownership { ... }
    }
}
```

### 2. 类型安全

```typescript
// 明确类型
const { data } = useGetDatasetQuery({...});
// data 的类型是 GetDatasetQuery | undefined

if (data?.dataset) {
    // dataset 类型已确定
    const name: string = data.dataset.name;
}
```

### 3. 避免过度查询

```graphql
# ❌ 不好: 查询不需要的字段
query getDataset($urn: String!) {
    dataset(urn: $urn) {
        urn
        name
        properties { ... }  # 很多字段
        ownership { ... }
        tags { ... }
        schemaMetadata { ... }  # 大量数据
        # ... 更多字段
    }
}

# ✅ 好: 只查询需要的字段
query getDatasetBasicInfo($urn: String!) {
    dataset(urn: $urn) {
        urn
        name
        properties {
            description  # 只要 description
        }
    }
}
```

### 4. 分页查询

```graphql
query searchDatasets($input: SearchInput!) {
    search(input: $input) {
        start
        count
        total
        searchResults {
            entity { ... }
        }
    }
}
```

```typescript
function PaginatedSearch() {
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const { data, loading, fetchMore } = useSearchDatasetsQuery({
        variables: {
            input: {
                query: '*',
                start: (page - 1) * pageSize,
                count: pageSize,
            },
        },
    });

    const loadMore = () => {
        fetchMore({
            variables: {
                input: {
                    query: '*',
                    start: page * pageSize,
                    count: pageSize,
                },
            },
            updateQuery: (prev, { fetchMoreResult }) => {
                if (!fetchMoreResult) return prev;
                return {
                    search: {
                        ...fetchMoreResult.search,
                        searchResults: [
                            ...prev.search.searchResults,
                            ...fetchMoreResult.search.searchResults,
                        ],
                    },
                };
            },
        });
        setPage(page + 1);
    };

    return <div>{/* ... */}</div>;
}
```

### 5. 条件查询

```typescript
function ConditionalQuery({ urn, shouldFetch }: Props) {
    const { data } = useGetDatasetQuery({
        variables: { urn },
        skip: !shouldFetch,  // 条件跳过查询
    });

    return <div>{/* ... */}</div>;
}
```

---

## 测试

### Mock GraphQL 查询

```typescript
import { MockedProvider } from '@apollo/client/testing';
import { GetDatasetDocument } from '@graphql/dataset.generated';

const mocks = [
    {
        request: {
            query: GetDatasetDocument,
            variables: { urn: 'urn:li:dataset:123' },
        },
        result: {
            data: {
                dataset: {
                    urn: 'urn:li:dataset:123',
                    name: 'Test Dataset',
                    properties: {
                        description: 'Test description',
                    },
                },
            },
        },
    },
];

describe('DatasetProfile', () => {
    it('renders dataset data', async () => {
        render(
            <MockedProvider mocks={mocks} addTypename={false}>
                <DatasetProfile urn="urn:li:dataset:123" />
            </MockedProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Dataset')).toBeInTheDocument();
        });
    });
});
```

---

## 相关资源

- [Apollo Client 文档](https://www.apollographql.com/docs/react/)
- [GraphQL Code Generator 文档](https://the-guild.dev/graphql/codegen)
- [DataHub GraphQL Schema](https://github.com/datahub-project/datahub/tree/master/datahub-graphql-core)

---

**文档版本**: 1.0
**最后更新**: 2025-10-30
