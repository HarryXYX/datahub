# Alchemy 组件库

## 目录

- [概述](#概述)
- [设计系统](#设计系统)
- [核心组件](#核心组件)
- [主题定制](#主题定制)
- [使用指南](#使用指南)

---

## 概述

Alchemy 是 DataHub 的自定义设计系统和组件库,提供一致的 UI 组件和设计规范。

### 特性

- ✅ **类型安全**: 完整的 TypeScript 类型定义
- ✅ **主题化**: 支持深色/浅色主题
- ✅ **可访问性**: 遵循 WCAG 2.1 标准
- ✅ **Storybook**: 完整的组件文档和示例
- ✅ **响应式**: 移动端友好

### 目录结构

```
src/alchemy-components/
├── components/              # 组件
│   ├── Button/
│   ├── Input/
│   ├── Table/
│   ├── Card/
│   ├── Avatar/
│   └── ...
├── theme/                   # 主题
│   ├── foundations/         # 基础 tokens
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   └── spacing.ts
│   └── config/              # 主题配置
└── .docs/                   # Storybook 文档
```

---

## 设计系统

### 颜色系统

```typescript
// theme/foundations/colors.ts
export const colors = {
    // 品牌色
    primary: '#1890ff',
    secondary: '#722ed1',

    // 语义色
    success: '#52c41a',
    warning: '#faad14',
    error: '#f5222d',
    info: '#1890ff',

    // 中性色
    gray: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#eeeeee',
        // ...
        900: '#1a1a1a',
    },

    // 文本色
    text: {
        primary: '#262626',
        secondary: '#595959',
        disabled: '#bfbfbf',
    },

    // 背景色
    background: {
        default: '#ffffff',
        paper: '#fafafa',
        elevated: '#ffffff',
    },
};
```

### 排版系统

```typescript
// theme/foundations/typography.ts
export const typography = {
    fontFamily: {
        base: 'Mulish, -apple-system, sans-serif',
        mono: 'Monaco, monospace',
    },

    fontSize: {
        xs: '12px',
        sm: '14px',
        md: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '30px',
    },

    fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },

    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
    },
};
```

### 间距系统

```typescript
// theme/foundations/spacing.ts
export const spacing = {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
};
```

---

## 核心组件

### Button 按钮

```typescript
import { Button } from '@components/components/Button';

<Button variant="primary" size="md" onClick={handleClick}>
    Click Me
</Button>

// Props
interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    onClick?: () => void;
}
```

### Input 输入框

```typescript
import { Input } from '@components/components/Input';

<Input
    placeholder="Enter text..."
    value={value}
    onChange={(e) => setValue(e.target.value)}
    error={errorMessage}
/>

// Props
interface InputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
}
```

### Table 表格

```typescript
import { Table } from '@components/components/Table';

const columns = [
    { key: 'name', title: 'Name', width: 200 },
    { key: 'age', title: 'Age', width: 100 },
];

const data = [
    { id: 1, name: 'John', age: 30 },
    { id: 2, name: 'Jane', age: 25 },
];

<Table
    columns={columns}
    data={data}
    rowKey="id"
    onRowClick={(row) => console.log(row)}
/>
```

### Card 卡片

```typescript
import { Card } from '@components/components/Card';

<Card
    title="Dataset Details"
    extra={<Button>Edit</Button>}
    hoverable
>
    Card content here...
</Card>
```

### Avatar 头像

```typescript
import { Avatar, AvatarStack } from '@components/components/Avatar';

<Avatar
    name="John Doe"
    imageUrl="https://..."
    size="md"
/>

<AvatarStack
    avatars={[
        { name: 'John', imageUrl: '...' },
        { name: 'Jane', imageUrl: '...' },
    ]}
    max={3}
/>
```

### Icon 图标

```typescript
import { Icon } from '@components/components/Icon';
import { Database, User, Settings } from '@phosphor-icons/react';

<Icon icon={Database} size={20} color="primary" />
<Icon icon={User} size={24} />
<Icon icon={Settings} size={16} color="#1890ff" />
```

### Modal 弹窗

```typescript
import { Modal } from '@components/components/Modal';

<Modal
    title="Confirm Action"
    visible={isOpen}
    onClose={() => setIsOpen(false)}
    footer={
        <>
            <Button onClick={onCancel}>Cancel</Button>
            <Button variant="primary" onClick={onConfirm}>
                Confirm
            </Button>
        </>
    }
>
    Are you sure you want to proceed?
</Modal>
```

### Tooltip 提示框

```typescript
import { Tooltip } from '@components/components/Tooltip';

<Tooltip content="This is a tooltip">
    <Button>Hover Me</Button>
</Tooltip>
```

---

## 主题定制

### 创建自定义主题

```typescript
// customTheme.ts
import { Theme } from '@components/theme/types';

export const customTheme: Theme = {
    colors: {
        primary: '#0066cc',
        secondary: '#6b46c1',
        // ... 其他颜色
    },

    typography: {
        fontFamily: {
            base: 'Inter, sans-serif',
        },
    },

    spacing: {
        // 使用默认间距
    },

    // 组件级样式覆盖
    components: {
        Button: {
            borderRadius: '8px',
            fontWeight: 600,
        },
        Card: {
            shadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
    },
};
```

### 应用主题

```typescript
import { ThemeProvider } from 'styled-components';
import { customTheme } from './customTheme';

function App() {
    return (
        <ThemeProvider theme={customTheme}>
            <YourApp />
        </ThemeProvider>
    );
}
```

### 在组件中使用主题

```typescript
import styled from 'styled-components';

const StyledDiv = styled.div`
    color: ${(props) => props.theme.colors.primary};
    font-size: ${(props) => props.theme.typography.fontSize.md};
    padding: ${(props) => props.theme.spacing[4]};
`;
```

---

## 使用指南

### 安装和导入

```typescript
// 导入单个组件
import { Button } from '@components/components/Button';
import { Input } from '@components/components/Input';

// 导入类型
import { ButtonProps } from '@components/components/Button';
```

### Storybook 文档

启动 Storybook 查看所有组件的交互式文档:

```bash
yarn storybook
```

访问 http://localhost:6006 查看组件库。

### 最佳实践

1. **使用 TypeScript 类型**: 利用完整的类型定义
2. **遵循设计系统**: 使用主题 tokens 而不是硬编码值
3. **可访问性**: 为交互元素添加适当的 ARIA 属性
4. **响应式设计**: 考虑不同屏幕尺寸
5. **性能**: 避免不必要的重渲染

---

**文档版本**: 1.0
**最后更新**: 2025-10-30
