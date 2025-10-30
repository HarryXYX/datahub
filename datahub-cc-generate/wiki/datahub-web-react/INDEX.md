# DataHub Web React 文档索引

本目录包含 DataHub Web React 模块的完整文档。

---

## 📚 文档结构

### 核心文档

1. **[模块总览 (README.md)](./README.md)**
   - 技术栈介绍
   - 架构概览
   - 目录结构
   - 核心概念
   - 开发环境设置
   - 快速入门指南

### 功能模块

2. **[搜索功能 (features/search.md)](./features/search.md)**
   - 搜索架构设计
   - 核心组件 (SearchPage, SearchBar, SearchResults)
   - 搜索流程和 URL 状态管理
   - 过滤器系统 (平台、标签、域、所有者)
   - 自动补全和最近搜索
   - 高级搜索和保存视图
   - GraphQL 查询示例
   - 开发指南和性能优化

3. **[血缘图可视化 (features/lineage-viz.md)](./features/lineage-viz.md)**
   - 血缘图架构和技术栈 (ReactFlow)
   - 核心组件 (LineageExplorer, LineageVisualization, LineageEntityNode)
   - 血缘数据获取流程
   - 交互功能 (展开/收起、高亮、拖拽、导出)
   - 字段级血缘
   - 布局算法 (Dagre, 层级布局)
   - 性能优化 (虚拟化、懒加载、Web Worker)
   - 自定义节点和边

### GraphQL 集成

4. **[GraphQL 集成指南 (graphql.md)](./graphql.md)**
   - Apollo Client 配置和类型策略
   - GraphQL Code Generator 配置
   - Query 开发和使用
   - Mutation 开发 (乐观更新、刷新查询)
   - 缓存策略 (读写、失效)
   - 错误处理 (组件级、全局)
   - 最佳实践 (Fragments、类型安全、分页)
   - 测试 Mock

### 组件库

5. **[Alchemy 组件库 (components/alchemy.md)](./components/alchemy.md)**
   - 设计系统 (颜色、排版、间距)
   - 核心组件 (Button, Input, Table, Card, Avatar, Icon, Modal, Tooltip)
   - 组件 Props 和使用示例
   - 主题定制
   - Storybook 文档
   - 最佳实践

### 状态管理

6. **[状态管理 (state-management.md)](./state-management.md)**
   - React Context 使用
   - Apollo Client 缓存管理
   - URL 状态管理
   - LocalStorage 使用
   - 自定义 Context 示例

### 开发指南

7. **[开发指南 (development/README.md)](./development/README.md)**
   - 环境设置和前置要求
   - 开发工作流 (分支、测试、提交)
   - 代码规范 (文件组织、TypeScript、样式)
   - 调试技巧 (DevTools、日志)
   - 常见任务 (添加页面、实体、查询)
   - 故障排查

---

## 🚀 快速导航

### 新手入门

如果你是第一次接触 DataHub Web React:

1. 📖 从 **[模块总览](./README.md)** 开始,了解整体架构
2. 🛠️ 参考 **[开发指南](./development/README.md)** 设置环境
3. 🔍 学习 **[搜索功能](./features/search.md)** 了解核心功能实现
4. 🔌 阅读 **[GraphQL 集成](./graphql.md)** 理解数据层

### 功能开发

开发新功能时:

1. 🎨 查阅 **[Alchemy 组件库](./components/alchemy.md)** 使用现有组件
2. 🗂️ 参考 **[状态管理](./state-management.md)** 管理应用状态
3. 🔌 学习 **[GraphQL 集成](./graphql.md)** 添加新查询
4. 🧪 遵循 **[开发指南](./development/README.md)** 中的代码规范

### 高级主题

深入理解复杂功能:

1. 🕸️ **[血缘图可视化](./features/lineage-viz.md)** - 图形可视化和交互
2. 🔍 **[搜索功能](./features/search.md)** 高级过滤和自动补全
3. 🔌 **[GraphQL 集成](./graphql.md)** 缓存优化和性能调优

---

## 📊 文档统计

| 文档 | 内容覆盖 | 代码示例 | 适合人群 |
|------|---------|---------|---------|
| 模块总览 | ⭐⭐⭐⭐⭐ | ✅ | 所有人 |
| 搜索功能 | ⭐⭐⭐⭐⭐ | ✅✅✅ | 开发者 |
| 血缘图可视化 | ⭐⭐⭐⭐⭐ | ✅✅✅ | 开发者 |
| GraphQL 集成 | ⭐⭐⭐⭐⭐ | ✅✅✅ | 开发者 |
| Alchemy 组件库 | ⭐⭐⭐⭐ | ✅✅ | 开发者/设计师 |
| 状态管理 | ⭐⭐⭐ | ✅ | 开发者 |
| 开发指南 | ⭐⭐⭐⭐ | ✅ | 新手开发者 |

---

## 🔗 相关资源

### 官方文档

- [DataHub 官方文档](https://docs.datahub.com/)
- [DataHub GitHub](https://github.com/datahub-project/datahub)
- [DataHub Demo](https://demo.datahub.com/)

### 技术栈文档

- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Apollo Client 文档](https://www.apollographql.com/docs/react/)
- [ReactFlow 文档](https://reactflow.dev/)
- [Ant Design 文档](https://ant.design/)
- [Styled Components 文档](https://styled-components.com/)
- [Vite 文档](https://vite.dev/)
- [Vitest 文档](https://vitest.dev/)

### 社区

- **Slack**: [DataHub Slack](https://datahubspace.slack.com/) - #datahub-react 频道
- **GitHub Issues**: [提交问题](https://github.com/datahub-project/datahub/issues)
- **GitHub Discussions**: [技术讨论](https://github.com/datahub-project/datahub/discussions)

---

## 📝 文档贡献

### 文档维护原则

1. **保持更新**: 代码变更时同步更新文档
2. **代码示例**: 提供可运行的代码示例
3. **清晰结构**: 使用明确的标题和章节
4. **中文撰写**: 所有文档使用中文
5. **示例优先**: 用实际例子说明概念

### 反馈和建议

如果你发现文档问题或有改进建议:

1. 在 GitHub 创建 Issue 描述问题
2. 提交 Pull Request 改进文档
3. 在 Slack #datahub-react 频道讨论

---

## 📅 文档版本

- **版本**: 1.0
- **创建日期**: 2025-10-30
- **最后更新**: 2025-10-30
- **维护者**: DataHub Team

---

## 🎯 下一步

根据你的目标选择合适的文档:

- **学习架构** → [模块总览](./README.md)
- **搭建环境** → [开发指南](./development/README.md)
- **开发搜索功能** → [搜索功能](./features/search.md)
- **开发血缘图功能** → [血缘图可视化](./features/lineage-viz.md)
- **使用 GraphQL** → [GraphQL 集成](./graphql.md)
- **使用组件库** → [Alchemy 组件库](./components/alchemy.md)

祝你开发愉快! 🚀
