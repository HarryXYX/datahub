# 状态管理

## 目录

- [概述](#概述)
- [React Context](#react-context)
- [Apollo Client 缓存](#apollo-client-缓存)
- [URL 状态管理](#url-状态管理)
- [本地存储](#本地存储)

---

## 概述

DataHub 前端使用多种状态管理策略:

- **React Context**: 全局应用状态
- **Apollo Client**: GraphQL 数据缓存
- **URL 参数**: 可分享的页面状态
- **LocalStorage**: 用户偏好设置

---

## React Context

### AppConfig Context

**文件位置**: `/src/AppConfigProvider.tsx`

```typescript
interface AppConfig {
    config: AppConfigType;
}

export const AppConfigContext = React.createContext<AppConfig>({
    config: DEFAULT_APP_CONFIG,
});

export const useAppConfig = () => useContext(AppConfigContext);
```

### EntityRegistry Context

```typescript
const EntityRegistryContext = React.createContext<EntityRegistry>(
    new EntityRegistry()
);

export const useEntityRegistry = () => useContext(EntityRegistryContext);
```

### 自定义 Context 示例

```typescript
// SearchContext.tsx
interface SearchContextType {
    query: string;
    setQuery: (query: string) => void;
    filters: Filter[];
    setFilters: (filters: Filter[]) => void;
}

const SearchContext = React.createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC = ({ children }) => {
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState<Filter[]>([]);

    return (
        <SearchContext.Provider value={{ query, setQuery, filters, setFilters }}>
            {children}
        </SearchContext.Provider>
    );
};

export const useSearch = () => {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error('useSearch must be used within SearchProvider');
    }
    return context;
};
```

---

## Apollo Client 缓存

### 读取缓存

```typescript
import { useApolloClient } from '@apollo/client';

const client = useApolloClient();

const cachedData = client.readQuery({
    query: GetDatasetDocument,
    variables: { urn: 'urn:...' },
});
```

### 写入缓存

```typescript
client.writeQuery({
    query: GetDatasetDocument,
    variables: { urn: 'urn:...' },
    data: { dataset: { ... } },
});
```

### 失效缓存

```typescript
client.cache.evict({ id: 'Dataset:urn:...' });
client.cache.gc();
```

---

## URL 状态管理

```typescript
import { useHistory, useLocation } from 'react-router-dom';

function SearchPage() {
    const history = useHistory();
    const location = useLocation();

    const params = new URLSearchParams(location.search);
    const query = params.get('query') || '';

    const updateQuery = (newQuery: string) => {
        params.set('query', newQuery);
        history.push(`/search?${params.toString()}`);
    };

    return <div>{/* ... */}</div>;
}
```

---

## 本地存储

```typescript
// utils/storage.ts
export const StorageKeys = {
    RECENT_SEARCHES: 'recent_searches',
    USER_PREFERENCES: 'user_preferences',
};

export function saveToStorage<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
}

export function getFromStorage<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
}

// 使用
saveToStorage(StorageKeys.RECENT_SEARCHES, ['query1', 'query2']);
const searches = getFromStorage<string[]>(StorageKeys.RECENT_SEARCHES);
```

---

**文档版本**: 1.0
**最后更新**: 2025-10-30
