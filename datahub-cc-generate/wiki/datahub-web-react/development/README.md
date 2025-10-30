# 开发指南

## 目录

- [环境设置](#环境设置)
- [开发工作流](#开发工作流)
- [代码规范](#代码规范)
- [调试技巧](#调试技巧)
- [常见任务](#常见任务)
- [故障排查](#故障排查)

---

## 环境设置

### 前置要求

- Node.js 16.13.0 (LTS)
- Yarn 1.22+
- Git

### 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/datahub-project/datahub.git
cd datahub/datahub-web-react

# 2. 安装依赖
yarn install

# 3. 启动开发服务器
yarn start

# 访问 http://localhost:3000
```

---

## 开发工作流

### 1. 创建功能分支

```bash
git checkout -b feature/my-new-feature
```

### 2. 开发和测试

```bash
# 启动开发服务器
yarn start

# 运行测试
yarn test

# 类型检查
yarn type-check

# 代码检查
yarn lint
```

### 3. 提交代码

```bash
# 格式化代码
yarn format

# 修复 lint 问题
yarn lint-fix

# 提交
git add .
git commit -m "feat: add new feature"
```

---

## 代码规范

### 文件组织

```
ComponentName/
├── ComponentName.tsx       # 主组件
├── ComponentName.test.tsx  # 测试
├── ComponentName.types.ts  # 类型定义
├── ComponentName.hooks.ts  # 自定义 Hooks
├── ComponentName.utils.ts  # 工具函数
└── index.ts                # 导出
```

### TypeScript 规范

```typescript
// ✅ 使用接口定义 Props
interface Props {
    name: string;
    age?: number;
}

// ✅ 使用函数组件
export function MyComponent({ name, age }: Props) {
    return <div>{name}</div>;
}

// ✅ 明确返回类型
function calculate(x: number): number {
    return x * 2;
}
```

### 样式规范

```typescript
// ✅ 使用 styled-components
const Container = styled.div`
    padding: ${(props) => props.theme.spacing[4]};
    color: ${(props) => props.theme.colors.text.primary};
`;

// ❌ 避免内联样式
<div style={{ padding: '16px' }}>...</div>
```

---

## 调试技巧

### React DevTools

安装 React DevTools 浏览器扩展进行组件调试。

### Apollo Client DevTools

安装 Apollo Client DevTools 查看 GraphQL 查询和缓存。

### 日志调试

```typescript
console.log('[DEBUG]', data);
console.error('[ERROR]', error);
```

### Chrome DevTools

- **Network**: 查看 API 请求
- **Console**: 查看日志
- **Elements**: 检查 DOM
- **Sources**: 断点调试

---

## 常见任务

### 添加新页面

1. 在 `src/app/` 创建目录
2. 创建页面组件
3. 在 `Routes.tsx` 添加路由
4. 更新导航菜单

### 添加新实体类型

1. 实现 `Entity` 接口
2. 注册到 `EntityRegistry`
3. 添加 GraphQL 查询
4. 创建预览和详情组件

### 添加新的 GraphQL 查询

1. 在 `src/graphql/` 创建 `.graphql` 文件
2. 运行 `yarn generate` 生成类型
3. 在组件中使用生成的 Hook

---

## 故障排查

### 常见问题

#### 端口冲突

```bash
# 杀掉占用端口的进程
lsof -ti:3000 | xargs kill -9
```

#### 依赖问题

```bash
# 清除依赖并重新安装
rm -rf node_modules yarn.lock
yarn install
```

#### 类型错误

```bash
# 重新生成 GraphQL 类型
yarn generate
```

---

**文档版本**: 1.0
**最后更新**: 2025-10-30
