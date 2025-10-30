# 完整开发指南

本文档介绍如何设置开发环境并为 DataHub Metadata Ingestion 做出贡献。

## 环境要求

- Python 3.9+
- Java 17 (用于 Gradle)
- Git

## 设置开发环境

### 1. 克隆仓库

```bash
git clone https://github.com/datahub-project/datahub.git
cd datahub
```

### 2. 安装 Python 环境

```bash
cd metadata-ingestion
../gradlew :metadata-ingestion:installDev
source venv/bin/activate
datahub version
```

### 3. 常见问题

**虚拟环境创建失败 (Nix/Windows)**:

```bash
export DATAHUB_VENV_USE_COPIES=true
../gradlew :metadata-ingestion:installDev
```

## 开发工作流

### 代码格式化

```bash
# 自动格式化
../gradlew :metadata-ingestion:lintFix

# 或直接使用 ruff
ruff format src/ tests/
ruff check --fix src/ tests/
```

### 运行测试

```bash
# 快速单元测试
../gradlew :metadata-ingestion:testQuick

# 所有测试
../gradlew :metadata-ingestion:testFull

# 单个测试文件
pytest tests/unit/test_my_source.py -v
```

### 类型检查

```bash
mypy src/ tests/
```

## 添加新数据源

完整步骤参见 [source-development.md](./source-development.md)：

1. 创建配置类 (Pydantic)
2. 创建报告类
3. 实现 Source 类
4. 在 `setup.py` 中注册插件
5. 编写测试
6. 编写文档

## 代码风格

遵循项目代码风格：

- 使用类型注解
- 避免 `Any` 类型
- 使用 dataclass/Pydantic
- 错误处理：记录但不中断
- 配置字段必须有描述

## 提交代码

```bash
# 确保测试通过
../gradlew :metadata-ingestion:testQuick

# 格式化代码
../gradlew :metadata-ingestion:lintFix

# 提交
git add .
git commit -m "feat(ingestion): add MySQL connector"
git push origin feature-branch
```

## 参考资源

- [官方贡献指南](https://github.com/datahub-project/datahub/blob/master/CONTRIBUTING.md)
- [Slack 社区](https://datahubspace.slack.com/)
