# Transformer 开发指南

Transformer 用于在元数据发送到 Sink 之前对其进行转换、增强或过滤。

## Transformer 架构

```
Source → WorkUnit Stream → Transformer 1 → Transformer 2 → ... → Sink
```

## 核心接口

```python
from typing import Iterable
from datahub.ingestion.api.transform import Transformer
from datahub.ingestion.api.common import RecordEnvelope, PipelineContext

class MyTransformer(Transformer):
    def __init__(self, config: dict, ctx: PipelineContext):
        self.config = config
        self.ctx = ctx

    @classmethod
    def create(cls, config_dict: dict, ctx: PipelineContext) -> "MyTransformer":
        return cls(config_dict, ctx)

    def transform(
        self, record_envelopes: Iterable[RecordEnvelope]
    ) -> Iterable[RecordEnvelope]:
        """转换记录流"""
        for record_envelope in record_envelopes:
            # 转换逻辑
            yield self._transform_record(record_envelope)
```

## 常用 Transformer

### 1. AddDatasetOwnership
添加数据集所有者

```yaml
transformers:
  - type: "simple_add_dataset_ownership"
    config:
      owner_urns:
        - "urn:li:corpuser:data_team"
      ownership_type: "TECHNICAL_OWNER"
```

### 2. AddDatasetTags
添加标签

```yaml
transformers:
  - type: "pattern_add_dataset_tags"
    config:
      tag_pattern:
        rules:
          ".*_PII$": ["PII", "Sensitive"]
          ".*customer.*": ["Customer Data"]
```

### 3. AddDatasetDomain
设置数据域

```yaml
transformers:
  - type: "pattern_add_dataset_domain"
    config:
      domain_pattern:
        rules:
          ".*sales.*": "Sales"
          ".*finance.*": "Finance"
```

## 自定义 Transformer

完整示例参见 [source-development.md](./source-development.md)。

## 下一步

- [Emitter 详解](./emitters.md)
- [开发环境搭建](./development.md)
