# DataHub 生产环境部署架构指南

## 目录

- [1. 架构概述](#1-架构概述)
- [2. Kubernetes 集群部署](#2-kubernetes-集群部署)
- [3. 基础设施配置](#3-基础设施配置)
- [4. 资源规划](#4-资源规划)
- [5. 监控和告警](#5-监控和告警)
- [6. 灾难恢复](#6-灾难恢复)
- [7. 安全加固](#7-安全加固)
- [8. 运维最佳实践](#8-运维最佳实践)

---

## 1. 架构概述

### 1.1 核心组件

DataHub 是一个事件驱动的元数据平台，包含以下核心服务：

```
┌─────────────────────────────────────────────────────────────┐
│                     负载均衡器 (Ingress)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │                            │
┌───────▼────────┐          ┌────────▼────────┐
│  Frontend      │          │  GMS (Backend)  │
│  (React UI)    │◄─────────┤  (Spring Boot)  │
└────────────────┘          └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
          ┌─────────▼──────┐  ┌──────▼──────┐  ┌────▼──────┐
          │ MySQL/Postgres │  │ Elasticsearch│  │   Kafka   │
          │ (元数据存储)     │  │  (搜索索引)   │  │ (事件流)   │
          └────────────────┘  └──────────────┘  └───────────┘
                    │
          ┌─────────▼──────┐
          │    Neo4j       │
          │  (图数据库)     │
          └────────────────┘
```

### 1.2 依赖服务

| 服务          | 用途                    | 可选性 | 推荐版本        |
|--------------|------------------------|--------|----------------|
| Kafka        | 事件流和消息队列          | 必需   | 7.9.2+         |
| MySQL/Postgres| 主元数据存储            | 必需   | MySQL 8.0+     |
| Elasticsearch| 搜索索引和查询           | 必需   | 7.16.1+        |
| Neo4j        | 图关系存储              | 可选   | 4.4.9          |

---

## 2. Kubernetes 集群部署

### 2.1 前置条件

```bash
# 必需工具
- kubectl >= 1.20
- helm >= 3.0
- 集群资源要求：
  - 节点数：最少 3 个（生产环境推荐 5+）
  - CPU：每节点 8 核+
  - 内存：每节点 32GB+
  - 存储：支持 StorageClass (推荐 SSD)
```

### 2.2 命名空间和资源配额

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: datahub-prod
  labels:
    name: datahub-prod
    environment: production

---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: datahub-quota
  namespace: datahub-prod
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    requests.storage: 1Ti
    persistentvolumeclaims: "50"
    pods: "100"
```

### 2.3 Helm 部署配置

#### 添加 DataHub Helm 仓库

```bash
# 添加仓库
helm repo add datahub https://helm.datahubproject.io/
helm repo update

# 创建密钥
kubectl create namespace datahub-prod

kubectl create secret generic mysql-secrets \
  --from-literal=mysql-root-password='YOUR_SECURE_PASSWORD' \
  -n datahub-prod

kubectl create secret generic neo4j-secrets \
  --from-literal=neo4j-password='YOUR_SECURE_PASSWORD' \
  -n datahub-prod

kubectl create secret generic elasticsearch-secrets \
  --from-literal=elastic-password='YOUR_SECURE_PASSWORD' \
  -n datahub-prod
```

#### 生产环境 Values 配置

```yaml
# datahub-production-values.yaml
global:
  # 全局镜像配置
  datahub:
    version: "v0.14.1"  # 使用稳定版本
    gms:
      image:
        repository: acryldata/datahub-gms
        tag: "v0.14.1"
    frontend:
      image:
        repository: acryldata/datahub-frontend-react
        tag: "v0.14.1"

  # 高可用配置
  podAnnotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "4318"

# GMS (后端服务) 配置
datahub-gms:
  enabled: true
  replicaCount: 3  # 高可用 3 副本

  resources:
    requests:
      memory: "4Gi"
      cpu: "2"
    limits:
      memory: "8Gi"
      cpu: "4"

  # 健康检查
  livenessProbe:
    httpGet:
      path: /health
      port: 8080
    initialDelaySeconds: 90
    periodSeconds: 30
    timeoutSeconds: 5
    failureThreshold: 3

  readinessProbe:
    httpGet:
      path: /health
      port: 8080
    initialDelaySeconds: 60
    periodSeconds: 10
    timeoutSeconds: 5

  # 自动扩缩容
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80

  # Pod 反亲和性（分散到不同节点）
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
            - key: app
              operator: In
              values:
              - datahub-gms
          topologyKey: kubernetes.io/hostname

  # 环境变量
  env:
    - name: KAFKA_BOOTSTRAP_SERVER
      value: "kafka-broker:9092"
    - name: KAFKA_CONSUMER_STOP_ON_DESERIALIZATION_ERROR
      value: "false"
    - name: METADATA_SERVICE_AUTH_ENABLED
      value: "true"
    - name: ENABLE_PROMETHEUS
      value: "true"
    - name: ENABLE_OTEL
      value: "true"
    - name: JAVA_OPTS
      value: "-Xms4g -Xmx6g -XX:+UseG1GC -XX:MaxGCPauseMillis=200"

# Frontend 配置
datahub-frontend:
  enabled: true
  replicaCount: 2

  resources:
    requests:
      memory: "2Gi"
      cpu: "1"
    limits:
      memory: "4Gi"
      cpu: "2"

  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 6
    targetCPUUtilizationPercentage: 70

  # Ingress 配置
  ingress:
    enabled: true
    className: "nginx"
    annotations:
      cert-manager.io/cluster-issuer: "letsencrypt-prod"
      nginx.ingress.kubernetes.io/ssl-redirect: "true"
      nginx.ingress.kubernetes.io/proxy-body-size: "100m"
      nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
      nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    hosts:
      - host: datahub.yourcompany.com
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: datahub-tls
        hosts:
          - datahub.yourcompany.com

# Actions (事件处理) 配置
datahub-actions:
  enabled: true
  replicaCount: 2

  resources:
    requests:
      memory: "1Gi"
      cpu: "0.5"
    limits:
      memory: "2Gi"
      cpu: "1"
```

### 2.4 依赖服务 Helm 配置

```yaml
# prerequisites-production-values.yaml

# MySQL 配置
mysql:
  enabled: true
  auth:
    existingSecret: mysql-secrets
    database: datahub
    username: datahub

  primary:
    persistence:
      enabled: true
      size: 500Gi
      storageClass: "fast-ssd"

    resources:
      requests:
        memory: "8Gi"
        cpu: "4"
      limits:
        memory: "16Gi"
        cpu: "8"

    configuration: |-
      [mysqld]
      max_connections=1000
      innodb_buffer_pool_size=12G
      innodb_log_file_size=2G
      innodb_flush_log_at_trx_commit=2
      innodb_flush_method=O_DIRECT
      query_cache_size=0
      query_cache_type=0
      slow_query_log=1
      long_query_time=2

  # 主从复制
  secondary:
    replicaCount: 2
    persistence:
      enabled: true
      size: 500Gi
    resources:
      requests:
        memory: "8Gi"
        cpu: "4"

# Elasticsearch 配置
elasticsearch:
  enabled: true
  replicas: 3
  minimumMasterNodes: 2

  esJavaOpts: "-Xms4g -Xmx4g"

  resources:
    requests:
      cpu: "2"
      memory: "8Gi"
    limits:
      cpu: "4"
      memory: "8Gi"

  volumeClaimTemplate:
    accessModes: [ "ReadWriteOnce" ]
    storageClassName: "fast-ssd"
    resources:
      requests:
        storage: 1Ti

  esConfig:
    elasticsearch.yml: |
      cluster.name: "datahub"
      network.host: 0.0.0.0

      # 生产环境优化
      bootstrap.memory_lock: true

      # 线程池配置
      thread_pool:
        write:
          queue_size: 1000
        search:
          queue_size: 2000

      # 慢查询日志
      index.search.slowlog.threshold.query.warn: 10s
      index.search.slowlog.threshold.query.info: 5s
      index.search.slowlog.threshold.fetch.warn: 1s

      # 安全配置
      xpack.security.enabled: true
      xpack.security.transport.ssl.enabled: true

# Kafka 配置
kafka:
  enabled: true
  replicaCount: 3

  resources:
    requests:
      memory: "4Gi"
      cpu: "2"
    limits:
      memory: "8Gi"
      cpu: "4"

  persistence:
    enabled: true
    size: 1Ti
    storageClass: "fast-ssd"

  # Kafka 配置参数
  config:
    # 日志保留
    log.retention.hours: 168  # 7 天
    log.segment.bytes: 1073741824  # 1GB
    log.retention.check.interval.ms: 300000

    # 副本配置
    default.replication.factor: 3
    min.insync.replicas: 2

    # 性能优化
    num.network.threads: 8
    num.io.threads: 16
    socket.send.buffer.bytes: 102400
    socket.receive.buffer.bytes: 102400
    socket.request.max.bytes: 104857600

    # 压缩
    compression.type: "lz4"

  zookeeper:
    enabled: true
    replicaCount: 3
    resources:
      requests:
        memory: "2Gi"
        cpu: "1"
    persistence:
      enabled: true
      size: 100Gi

# Neo4j 配置（可选）
neo4j:
  enabled: false  # 可使用 Elasticsearch 替代
  core:
    numberOfServers: 3

  resources:
    requests:
      memory: "8Gi"
      cpu: "4"
    limits:
      memory: "16Gi"
      cpu: "8"

  persistentVolume:
    size: 500Gi
    storageClass: "fast-ssd"
```

### 2.5 部署步骤

```bash
# 1. 部署依赖服务
helm install datahub-prerequisites datahub/datahub-prerequisites \
  -f prerequisites-production-values.yaml \
  -n datahub-prod \
  --wait \
  --timeout 15m

# 2. 验证依赖服务状态
kubectl get pods -n datahub-prod
kubectl get pvc -n datahub-prod

# 3. 部署 DataHub
helm install datahub datahub/datahub \
  -f datahub-production-values.yaml \
  -n datahub-prod \
  --wait \
  --timeout 15m

# 4. 验证部署
kubectl get all -n datahub-prod
kubectl get ingress -n datahub-prod

# 5. 查看日志
kubectl logs -f deployment/datahub-datahub-gms -n datahub-prod
kubectl logs -f deployment/datahub-datahub-frontend -n datahub-prod
```

---

## 3. 基础设施配置

### 3.1 MySQL 高可用配置

#### 主从复制架构

```sql
-- 主节点配置
-- /etc/mysql/my.cnf

[mysqld]
# 服务器标识
server-id = 1

# 二进制日志
log-bin = mysql-bin
binlog_format = ROW
expire_logs_days = 7
max_binlog_size = 500M

# GTID 模式（推荐）
gtid_mode = ON
enforce_gtid_consistency = ON

# 半同步复制（保证数据一致性）
rpl_semi_sync_master_enabled = 1
rpl_semi_sync_master_timeout = 1000

# 性能优化
innodb_buffer_pool_size = 12G
innodb_buffer_pool_instances = 8
innodb_log_file_size = 2G
innodb_log_buffer_size = 64M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# 连接池
max_connections = 1000
max_connect_errors = 1000000
thread_cache_size = 100

# 查询缓存（MySQL 8.0 已移除）
# query_cache_type = 0
# query_cache_size = 0

# 慢查询日志
slow_query_log = 1
long_query_time = 2
slow_query_log_file = /var/log/mysql/slow-query.log

# 临时表
tmp_table_size = 256M
max_heap_table_size = 256M
```

#### 连接池配置（HikariCP）

```yaml
# application.yml for GMS
spring:
  datasource:
    type: com.zaxxer.hikari.HikariDataSource
    hikari:
      # 连接池大小
      maximum-pool-size: 50
      minimum-idle: 10

      # 连接超时
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000

      # 性能优化
      auto-commit: false
      connection-test-query: SELECT 1
      pool-name: DataHubHikariPool

      # 监控
      register-mbeans: true

      # 数据源属性
      data-source-properties:
        cachePrepStmts: true
        prepStmtCacheSize: 250
        prepStmtCacheSqlLimit: 2048
        useServerPrepStmts: true
        useLocalSessionState: true
        rewriteBatchedStatements: true
        cacheResultSetMetadata: true
        cacheServerConfiguration: true
        elideSetAutoCommits: true
        maintainTimeStats: false
```

#### 备份脚本

```bash
#!/bin/bash
# mysql-backup.sh

# 配置
MYSQL_USER="backup"
MYSQL_PASSWORD="${MYSQL_BACKUP_PASSWORD}"
MYSQL_HOST="mysql-primary"
BACKUP_DIR="/backup/mysql"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p ${BACKUP_DIR}

# 全量备份（使用 mysqldump）
echo "Starting MySQL backup at ${DATE}"
mysqldump \
  --host=${MYSQL_HOST} \
  --user=${MYSQL_USER} \
  --password=${MYSQL_PASSWORD} \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --all-databases \
  --master-data=2 \
  | gzip > ${BACKUP_DIR}/backup_${DATE}.sql.gz

# 验证备份
if [ $? -eq 0 ]; then
    echo "Backup completed successfully"

    # 上传到对象存储（S3/GCS/Azure Blob）
    aws s3 cp ${BACKUP_DIR}/backup_${DATE}.sql.gz \
      s3://your-backup-bucket/mysql/backup_${DATE}.sql.gz

    # 清理旧备份
    find ${BACKUP_DIR} -name "backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
else
    echo "Backup failed"
    exit 1
fi
```

### 3.2 Elasticsearch 集群配置

#### 索引模板优化

```json
// datahub-index-template.json
{
  "index_patterns": ["datahub*"],
  "settings": {
    "number_of_shards": 5,
    "number_of_replicas": 2,
    "refresh_interval": "30s",
    "index": {
      "max_result_window": 10000,
      "translog": {
        "durability": "async",
        "sync_interval": "30s"
      }
    },
    "analysis": {
      "analyzer": {
        "datahub_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding"]
        }
      }
    }
  },
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "urn": {
        "type": "keyword"
      },
      "name": {
        "type": "text",
        "analyzer": "datahub_analyzer",
        "fields": {
          "keyword": {
            "type": "keyword"
          }
        }
      },
      "timestamp": {
        "type": "date",
        "format": "epoch_millis"
      }
    }
  }
}
```

#### ILM 策略（索引生命周期管理）

```json
// datahub-ilm-policy.json
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_size": "50gb",
            "max_age": "7d"
          },
          "set_priority": {
            "priority": 100
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "forcemerge": {
            "max_num_segments": 1
          },
          "shrink": {
            "number_of_shards": 1
          },
          "set_priority": {
            "priority": 50
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "freeze": {},
          "set_priority": {
            "priority": 0
          }
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

#### 快照备份配置

```bash
#!/bin/bash
# elasticsearch-snapshot.sh

ES_URL="http://elasticsearch:9200"
REPO_NAME="datahub_snapshots"
SNAPSHOT_NAME="snapshot_$(date +%Y%m%d_%H%M%S)"

# 创建快照仓库（首次）
curl -X PUT "${ES_URL}/_snapshot/${REPO_NAME}" \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "s3",
    "settings": {
      "bucket": "your-es-backup-bucket",
      "region": "us-east-1",
      "base_path": "datahub-snapshots"
    }
  }'

# 创建快照
curl -X PUT "${ES_URL}/_snapshot/${REPO_NAME}/${SNAPSHOT_NAME}?wait_for_completion=false" \
  -H 'Content-Type: application/json' \
  -d '{
    "indices": "datahub*",
    "ignore_unavailable": true,
    "include_global_state": false
  }'

# 查看快照状态
curl -X GET "${ES_URL}/_snapshot/${REPO_NAME}/${SNAPSHOT_NAME}"
```

### 3.3 Kafka 集群配置

#### Topic 配置

```bash
#!/bin/bash
# create-kafka-topics.sh

KAFKA_BROKER="kafka-broker:9092"

# 创建主要 Topics
kafka-topics.sh --create \
  --bootstrap-server ${KAFKA_BROKER} \
  --topic MetadataChangeProposal_v1 \
  --partitions 12 \
  --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config retention.ms=604800000 \
  --config compression.type=lz4 \
  --config cleanup.policy=delete

kafka-topics.sh --create \
  --bootstrap-server ${KAFKA_BROKER} \
  --topic MetadataChangeLog_Versioned_v1 \
  --partitions 12 \
  --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config retention.ms=604800000

kafka-topics.sh --create \
  --bootstrap-server ${KAFKA_BROKER} \
  --topic MetadataChangeLog_Timeseries_v1 \
  --partitions 12 \
  --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config retention.ms=2592000000  # 30 天

kafka-topics.sh --create \
  --bootstrap-server ${KAFKA_BROKER} \
  --topic DataHubUsageEvent_v1 \
  --partitions 6 \
  --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config retention.ms=604800000
```

#### Kafka 监控配置

```yaml
# kafka-exporter-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-exporter
  namespace: datahub-prod
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kafka-exporter
  template:
    metadata:
      labels:
        app: kafka-exporter
    spec:
      containers:
      - name: kafka-exporter
        image: danielqsj/kafka-exporter:latest
        args:
          - "--kafka.server=kafka-broker:9092"
          - "--web.listen-address=:9308"
        ports:
        - containerPort: 9308
          name: metrics
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"

---
apiVersion: v1
kind: Service
metadata:
  name: kafka-exporter
  namespace: datahub-prod
  labels:
    app: kafka-exporter
spec:
  ports:
  - port: 9308
    name: metrics
  selector:
    app: kafka-exporter
```

### 3.4 负载均衡器配置

#### Nginx Ingress Controller

```yaml
# ingress-nginx-values.yaml
controller:
  replicaCount: 3

  resources:
    requests:
      cpu: 1
      memory: 2Gi
    limits:
      cpu: 2
      memory: 4Gi

  # 服务配置
  service:
    type: LoadBalancer
    annotations:
      service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
      service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"

  # 性能配置
  config:
    # 连接配置
    proxy-connect-timeout: "60"
    proxy-send-timeout: "600"
    proxy-read-timeout: "600"
    proxy-body-size: "100m"

    # 缓冲配置
    proxy-buffer-size: "16k"
    proxy-buffers-number: "8"

    # 性能优化
    use-gzip: "true"
    gzip-level: "5"
    gzip-types: "text/plain text/css text/xml application/json application/javascript"

    # 安全配置
    ssl-protocols: "TLSv1.2 TLSv1.3"
    ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384"
    enable-real-ip: "true"

    # 限流配置
    limit-req-status-code: "429"
    limit-conn-zone-variable: "$binary_remote_addr"

  # 指标配置
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true

  # Pod 反亲和性
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
            - key: app.kubernetes.io/name
              operator: In
              values:
              - ingress-nginx
          topologyKey: kubernetes.io/hostname
```

---

## 4. 资源规划

### 4.1 计算资源

#### 各组件推荐配置

| 组件            | 副本数 | CPU (Request/Limit) | Memory (Request/Limit) | 说明 |
|----------------|-------|---------------------|------------------------|------|
| GMS            | 3-5   | 2/4 cores           | 4Gi/8Gi                | 核心后端服务 |
| Frontend       | 2-4   | 1/2 cores           | 2Gi/4Gi                | Web UI |
| Actions        | 2     | 0.5/1 core          | 1Gi/2Gi                | 事件处理 |
| MySQL          | 1+2   | 4/8 cores           | 8Gi/16Gi               | 主+从副本 |
| Elasticsearch  | 3     | 2/4 cores           | 8Gi/8Gi                | 搜索集群 |
| Kafka          | 3     | 2/4 cores           | 4Gi/8Gi                | 消息队列 |
| Zookeeper      | 3     | 1/2 cores           | 2Gi/4Gi                | 协调服务 |
| Neo4j (可选)    | 3     | 4/8 cores           | 8Gi/16Gi               | 图数据库 |

#### 总体资源估算

**小规模部署（< 10,000 实体）：**
- CPU：30-40 cores
- 内存：60-80 GB
- 存储：2-3 TB

**中规模部署（10,000 - 100,000 实体）：**
- CPU：60-80 cores
- 内存：120-160 GB
- 存储：5-10 TB

**大规模部署（> 100,000 实体）：**
- CPU：100+ cores
- 内存：200+ GB
- 存储：10-20 TB

### 4.2 存储容量规划

#### 存储类型和用途

```yaml
# StorageClass 配置
---
# 高性能存储（用于数据库和 Elasticsearch）
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs  # 或其他云提供商
parameters:
  type: io2  # AWS EBS io2
  iopsPerGB: "50"
  fsType: ext4
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer

---
# 标准存储（用于 Kafka 和日志）
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  fsType: ext4
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

#### 存储容量估算

| 组件          | 初始容量 | 增长率（每月） | 保留期 | 推荐配置 |
|--------------|---------|--------------|--------|----------|
| MySQL        | 100GB   | 10-20GB      | 永久   | 500GB+   |
| Elasticsearch| 200GB   | 20-50GB      | 90天   | 1TB+     |
| Kafka        | 100GB   | 50-100GB     | 7天    | 1TB+     |
| Neo4j        | 50GB    | 5-10GB       | 永久   | 500GB+   |

### 4.3 网络带宽要求

#### 内部流量

- **GMS ↔ MySQL**: 100-500 Mbps（高峰期可达 1 Gbps）
- **GMS ↔ Elasticsearch**: 200-1000 Mbps
- **GMS ↔ Kafka**: 500-2000 Mbps
- **Frontend ↔ GMS**: 50-200 Mbps

#### 外部流量

- **用户访问**: 10-100 Mbps（取决于用户数）
- **Ingestion**: 100-1000 Mbps（取决于数据源数量）

#### 网络策略

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: datahub-network-policy
  namespace: datahub-prod
spec:
  # 应用到所有 DataHub pods
  podSelector:
    matchLabels:
      app.kubernetes.io/part-of: datahub

  policyTypes:
  - Ingress
  - Egress

  # 入站规则
  ingress:
  # 允许从 Ingress Controller
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 9002  # Frontend
    - protocol: TCP
      port: 8080  # GMS

  # 允许内部通信
  - from:
    - podSelector:
        matchLabels:
          app.kubernetes.io/part-of: datahub

  # 出站规则
  egress:
  # 允许访问依赖服务
  - to:
    - podSelector:
        matchLabels:
          app: mysql
    ports:
    - protocol: TCP
      port: 3306

  - to:
    - podSelector:
        matchLabels:
          app: elasticsearch
    ports:
    - protocol: TCP
      port: 9200

  - to:
    - podSelector:
        matchLabels:
          app: kafka
    ports:
    - protocol: TCP
      port: 9092

  # 允许 DNS 查询
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
```

---

## 5. 监控和告警

### 5.1 Prometheus 配置

#### Prometheus 部署

```yaml
# prometheus-values.yaml
server:
  global:
    scrape_interval: 15s
    scrape_timeout: 10s
    evaluation_interval: 15s

  retention: 30d

  persistentVolume:
    enabled: true
    size: 500Gi
    storageClass: standard-ssd

  resources:
    requests:
      cpu: 2
      memory: 8Gi
    limits:
      cpu: 4
      memory: 16Gi

alertmanager:
  enabled: true
  persistentVolume:
    enabled: true
    size: 10Gi

# ServiceMonitor 配置
serviceMonitors:
  - name: datahub-gms
    selector:
      matchLabels:
        app: datahub-gms
    endpoints:
    - port: metrics
      interval: 30s
      path: /actuator/prometheus
```

#### 关键指标监控

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: datahub-alerts
  namespace: datahub-prod
spec:
  groups:
  # GMS 健康检查
  - name: datahub-gms
    interval: 30s
    rules:
    # GMS 不可用
    - alert: DataHubGMSDown
      expr: up{job="datahub-gms"} == 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "DataHub GMS is down"
        description: "GMS instance {{ $labels.instance }} has been down for more than 2 minutes"

    # GMS 响应慢
    - alert: DataHubGMSHighLatency
      expr: histogram_quantile(0.95, rate(http_server_requests_seconds_bucket{job="datahub-gms"}[5m])) > 5
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "DataHub GMS high latency"
        description: "95th percentile latency is {{ $value }}s"

    # GMS 错误率高
    - alert: DataHubGMSHighErrorRate
      expr: rate(http_server_requests_seconds_count{job="datahub-gms",status=~"5.."}[5m]) / rate(http_server_requests_seconds_count{job="datahub-gms"}[5m]) > 0.05
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "DataHub GMS high error rate"
        description: "Error rate is {{ $value | humanizePercentage }}"

    # JVM 内存使用率高
    - alert: DataHubGMSHighMemory
      expr: jvm_memory_used_bytes{job="datahub-gms",area="heap"} / jvm_memory_max_bytes{job="datahub-gms",area="heap"} > 0.85
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "DataHub GMS high memory usage"
        description: "Heap memory usage is {{ $value | humanizePercentage }}"

  # Kafka 监控
  - name: datahub-kafka
    interval: 30s
    rules:
    # Kafka lag 过高
    - alert: DataHubKafkaHighLag
      expr: kafka_consumergroup_lag{topic=~"MetadataChange.*"} > 10000
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Kafka consumer lag is high"
        description: "Consumer group {{ $labels.consumergroup }} lag is {{ $value }}"

    # Kafka 队列时间过长
    - alert: DataHubKafkaHighQueueTime
      expr: histogram_quantile(0.95, rate(kafka_message_queue_time_seconds_bucket[5m])) > 300
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Kafka queue time is high"
        description: "95th percentile queue time is {{ $value }}s"

  # MySQL 监控
  - name: datahub-mysql
    interval: 30s
    rules:
    # MySQL 连接数过高
    - alert: DataHubMySQLHighConnections
      expr: mysql_global_status_threads_connected / mysql_global_variables_max_connections > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "MySQL connection usage is high"
        description: "Connection usage is {{ $value | humanizePercentage }}"

    # MySQL 慢查询
    - alert: DataHubMySQLSlowQueries
      expr: rate(mysql_global_status_slow_queries[5m]) > 10
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "MySQL has many slow queries"
        description: "Slow query rate is {{ $value }} per second"

    # MySQL 复制延迟
    - alert: DataHubMySQLReplicationLag
      expr: mysql_slave_status_seconds_behind_master > 30
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "MySQL replication is lagging"
        description: "Replication lag is {{ $value }} seconds"

  # Elasticsearch 监控
  - name: datahub-elasticsearch
    interval: 30s
    rules:
    # Elasticsearch 集群状态
    - alert: DataHubElasticsearchClusterYellow
      expr: elasticsearch_cluster_health_status{color="yellow"} == 1
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Elasticsearch cluster is yellow"
        description: "Elasticsearch cluster {{ $labels.cluster }} is in yellow state"

    - alert: DataHubElasticsearchClusterRed
      expr: elasticsearch_cluster_health_status{color="red"} == 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Elasticsearch cluster is red"
        description: "Elasticsearch cluster {{ $labels.cluster }} is in red state"

    # Elasticsearch JVM 内存
    - alert: DataHubElasticsearchHighMemory
      expr: elasticsearch_jvm_memory_used_bytes{area="heap"} / elasticsearch_jvm_memory_max_bytes{area="heap"} > 0.9
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Elasticsearch heap memory is high"
        description: "Heap memory usage is {{ $value | humanizePercentage }}"

    # Elasticsearch 搜索延迟
    - alert: DataHubElasticsearchHighSearchLatency
      expr: rate(elasticsearch_indices_search_query_time_seconds[5m]) / rate(elasticsearch_indices_search_query_total[5m]) > 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Elasticsearch search latency is high"
        description: "Average search latency is {{ $value }}s"
```

### 5.2 Grafana Dashboard

#### Grafana 部署

```yaml
# grafana-values.yaml
image:
  repository: grafana/grafana
  tag: 10.2.3

persistence:
  enabled: true
  size: 10Gi
  storageClassName: standard-ssd

resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 1
    memory: 2Gi

# 数据源配置
datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      url: http://prometheus-server
      access: proxy
      isDefault: true

# Dashboard 配置
dashboardProviders:
  dashboardproviders.yaml:
    apiVersion: 1
    providers:
    - name: 'default'
      orgId: 1
      folder: ''
      type: file
      disableDeletion: false
      editable: true
      options:
        path: /var/lib/grafana/dashboards/default

# 导入 Dashboards
dashboards:
  default:
    jvm:
      gnetId: 14845
      revision: 1
      datasource: Prometheus
```

#### DataHub Dashboard JSON

```json
{
  "dashboard": {
    "title": "DataHub Production Metrics",
    "tags": ["datahub", "production"],
    "timezone": "browser",
    "panels": [
      {
        "title": "GMS Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_server_requests_seconds_count{job='datahub-gms'}[5m])",
            "legendFormat": "{{method}} {{uri}}"
          }
        ]
      },
      {
        "title": "GMS P95 Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_server_requests_seconds_bucket{job='datahub-gms'}[5m]))",
            "legendFormat": "{{uri}}"
          }
        ]
      },
      {
        "title": "Kafka Consumer Lag",
        "type": "graph",
        "targets": [
          {
            "expr": "kafka_consumergroup_lag{topic=~'MetadataChange.*'}",
            "legendFormat": "{{topic}} - {{consumergroup}}"
          }
        ]
      },
      {
        "title": "MySQL Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "mysql_global_status_threads_connected",
            "legendFormat": "Connected"
          },
          {
            "expr": "mysql_global_variables_max_connections",
            "legendFormat": "Max"
          }
        ]
      },
      {
        "title": "Elasticsearch Cluster Health",
        "type": "stat",
        "targets": [
          {
            "expr": "elasticsearch_cluster_health_status",
            "legendFormat": "{{color}}"
          }
        ]
      }
    ]
  }
}
```

### 5.3 日志聚合（ELK Stack）

#### Filebeat 配置

```yaml
# filebeat-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
  namespace: datahub-prod
spec:
  selector:
    matchLabels:
      app: filebeat
  template:
    metadata:
      labels:
        app: filebeat
    spec:
      serviceAccountName: filebeat
      terminationGracePeriodSeconds: 30
      containers:
      - name: filebeat
        image: docker.elastic.co/beats/filebeat:7.16.1
        args: [
          "-c", "/etc/filebeat.yml",
          "-e",
        ]
        env:
        - name: ELASTICSEARCH_HOST
          value: elasticsearch
        - name: ELASTICSEARCH_PORT
          value: "9200"
        securityContext:
          runAsUser: 0
        resources:
          limits:
            memory: 500Mi
          requests:
            cpu: 100m
            memory: 200Mi
        volumeMounts:
        - name: config
          mountPath: /etc/filebeat.yml
          readOnly: true
          subPath: filebeat.yml
        - name: data
          mountPath: /usr/share/filebeat/data
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: varlog
          mountPath: /var/log
          readOnly: true
      volumes:
      - name: config
        configMap:
          defaultMode: 0640
          name: filebeat-config
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      - name: varlog
        hostPath:
          path: /var/log
      - name: data
        hostPath:
          path: /var/lib/filebeat-data
          type: DirectoryOrCreate

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: datahub-prod
data:
  filebeat.yml: |-
    filebeat.inputs:
    - type: container
      paths:
        - /var/log/containers/datahub-*.log
      processors:
        - add_kubernetes_metadata:
            host: ${NODE_NAME}
            matchers:
            - logs_path:
                logs_path: "/var/log/containers/"

    # 输出到 Elasticsearch
    output.elasticsearch:
      hosts: ['${ELASTICSEARCH_HOST:elasticsearch}:${ELASTICSEARCH_PORT:9200}']
      indices:
        - index: "datahub-logs-%{+yyyy.MM.dd}"
          when.contains:
            kubernetes.labels.app: datahub

    # 日志级别
    logging.level: info
```

### 5.4 AlertManager 配置

```yaml
# alertmanager-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: datahub-prod
data:
  alertmanager.yml: |
    global:
      resolve_timeout: 5m
      slack_api_url: 'YOUR_SLACK_WEBHOOK_URL'

    # 路由配置
    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h
      receiver: 'default'
      routes:
      # Critical 告警发送到 PagerDuty
      - match:
          severity: critical
        receiver: pagerduty
        continue: true

      # Warning 告警发送到 Slack
      - match:
          severity: warning
        receiver: slack

    # 接收器配置
    receivers:
    - name: 'default'
      slack_configs:
      - channel: '#datahub-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

    - name: 'pagerduty'
      pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
        description: '{{ .GroupLabels.alertname }}'

    - name: 'slack'
      slack_configs:
      - channel: '#datahub-warnings'
        title: 'Warning: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

    # 抑制规则
    inhibit_rules:
    - source_match:
        severity: 'critical'
      target_match:
        severity: 'warning'
      equal: ['alertname', 'cluster', 'service']
```

---

## 6. 灾难恢复

### 6.1 备份策略

#### 完整备份计划

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: datahub-backup
  namespace: datahub-prod
spec:
  # 每天凌晨 2 点执行
  schedule: "0 2 * * *"
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  concurrencyPolicy: Forbid

  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: your-registry/datahub-backup:latest
            env:
            - name: BACKUP_DATE
              value: $(date +%Y%m%d)
            - name: MYSQL_HOST
              value: mysql-primary
            - name: MYSQL_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-secrets
                  key: mysql-root-password
            - name: ES_HOST
              value: elasticsearch:9200
            - name: S3_BUCKET
              value: your-backup-bucket
            command:
            - /bin/bash
            - -c
            - |
              set -e

              echo "Starting backup at $(date)"

              # MySQL 备份
              echo "Backing up MySQL..."
              mysqldump \
                --host=${MYSQL_HOST} \
                --user=root \
                --password=${MYSQL_PASSWORD} \
                --single-transaction \
                --all-databases \
                | gzip > /tmp/mysql_${BACKUP_DATE}.sql.gz

              aws s3 cp /tmp/mysql_${BACKUP_DATE}.sql.gz \
                s3://${S3_BUCKET}/mysql/

              # Elasticsearch 快照
              echo "Creating Elasticsearch snapshot..."
              curl -X PUT "${ES_HOST}/_snapshot/datahub_snapshots/snapshot_${BACKUP_DATE}?wait_for_completion=true"

              # Kafka Topic 配置备份
              echo "Backing up Kafka topics..."
              kafka-topics.sh --bootstrap-server kafka-broker:9092 \
                --describe --topics-with-overrides \
                > /tmp/kafka_topics_${BACKUP_DATE}.txt

              aws s3 cp /tmp/kafka_topics_${BACKUP_DATE}.txt \
                s3://${S3_BUCKET}/kafka/

              echo "Backup completed successfully at $(date)"

            resources:
              requests:
                memory: "2Gi"
                cpu: "1"
              limits:
                memory: "4Gi"
                cpu: "2"

            volumeMounts:
            - name: backup-storage
              mountPath: /tmp

          volumes:
          - name: backup-storage
            emptyDir:
              sizeLimit: 50Gi
```

#### 备份验证脚本

```bash
#!/bin/bash
# verify-backup.sh

BACKUP_DATE=$(date +%Y%m%d)
S3_BUCKET="your-backup-bucket"

echo "Verifying backups for ${BACKUP_DATE}..."

# 验证 MySQL 备份
echo "Checking MySQL backup..."
aws s3 ls s3://${S3_BUCKET}/mysql/mysql_${BACKUP_DATE}.sql.gz || {
    echo "ERROR: MySQL backup not found"
    exit 1
}

# 检查文件大小（应该 > 100MB）
SIZE=$(aws s3 ls s3://${S3_BUCKET}/mysql/mysql_${BACKUP_DATE}.sql.gz | awk '{print $3}')
if [ $SIZE -lt 104857600 ]; then
    echo "WARNING: MySQL backup file is suspiciously small (${SIZE} bytes)"
fi

# 验证 Elasticsearch 快照
echo "Checking Elasticsearch snapshot..."
SNAPSHOT_STATUS=$(curl -s "http://elasticsearch:9200/_snapshot/datahub_snapshots/snapshot_${BACKUP_DATE}" | jq -r '.snapshots[0].state')

if [ "$SNAPSHOT_STATUS" != "SUCCESS" ]; then
    echo "ERROR: Elasticsearch snapshot failed with status: ${SNAPSHOT_STATUS}"
    exit 1
fi

echo "All backups verified successfully!"
```

### 6.2 恢复流程

#### MySQL 恢复

```bash
#!/bin/bash
# restore-mysql.sh

BACKUP_FILE=$1
MYSQL_HOST="mysql-primary"
MYSQL_USER="root"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file.sql.gz>"
    exit 1
fi

echo "WARNING: This will overwrite the current database!"
read -p "Are you sure you want to continue? (yes/no) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    exit 1
fi

# 停止 DataHub 服务
echo "Scaling down DataHub services..."
kubectl scale deployment datahub-datahub-gms --replicas=0 -n datahub-prod
kubectl scale deployment datahub-datahub-frontend --replicas=0 -n datahub-prod

# 下载备份
echo "Downloading backup from S3..."
aws s3 cp s3://your-backup-bucket/mysql/${BACKUP_FILE} /tmp/

# 恢复数据库
echo "Restoring database..."
gunzip < /tmp/${BACKUP_FILE} | mysql \
    --host=${MYSQL_HOST} \
    --user=${MYSQL_USER} \
    --password=${MYSQL_ROOT_PASSWORD}

if [ $? -eq 0 ]; then
    echo "Database restored successfully"

    # 重启 DataHub 服务
    echo "Scaling up DataHub services..."
    kubectl scale deployment datahub-datahub-gms --replicas=3 -n datahub-prod
    kubectl scale deployment datahub-datahub-frontend --replicas=2 -n datahub-prod
else
    echo "ERROR: Database restoration failed"
    exit 1
fi
```

#### Elasticsearch 恢复

```bash
#!/bin/bash
# restore-elasticsearch.sh

SNAPSHOT_NAME=$1
ES_HOST="http://elasticsearch:9200"

if [ -z "$SNAPSHOT_NAME" ]; then
    echo "Usage: $0 <snapshot-name>"
    exit 1
fi

echo "WARNING: This will restore Elasticsearch indices from snapshot!"
read -p "Are you sure you want to continue? (yes/no) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    exit 1
fi

# 关闭所有 DataHub 索引
echo "Closing DataHub indices..."
curl -X POST "${ES_HOST}/datahub*/_close"

# 恢复快照
echo "Restoring snapshot ${SNAPSHOT_NAME}..."
curl -X POST "${ES_HOST}/_snapshot/datahub_snapshots/${SNAPSHOT_NAME}/_restore" \
  -H 'Content-Type: application/json' \
  -d '{
    "indices": "datahub*",
    "ignore_unavailable": true,
    "include_global_state": false
  }'

# 等待恢复完成
echo "Waiting for restore to complete..."
while true; do
    STATUS=$(curl -s "${ES_HOST}/_snapshot/datahub_snapshots/${SNAPSHOT_NAME}/_status" | jq -r '.snapshots[0].state')
    if [ "$STATUS" == "null" ]; then
        echo "Restore completed!"
        break
    fi
    echo "Restore in progress... (${STATUS})"
    sleep 10
done

# 重新打开索引
echo "Opening DataHub indices..."
curl -X POST "${ES_HOST}/datahub*/_open"

echo "Elasticsearch restore completed successfully!"
```

### 6.3 灾难恢复演练

```bash
#!/bin/bash
# dr-drill.sh
# 灾难恢复演练脚本

DR_ENV="datahub-dr"
PROD_ENV="datahub-prod"

echo "========================================"
echo "DataHub Disaster Recovery Drill"
echo "========================================"

# 1. 创建 DR 命名空间
echo "Step 1: Creating DR namespace..."
kubectl create namespace ${DR_ENV}

# 2. 复制密钥
echo "Step 2: Copying secrets..."
kubectl get secret mysql-secrets -n ${PROD_ENV} -o yaml | \
  sed "s/namespace: ${PROD_ENV}/namespace: ${DR_ENV}/" | \
  kubectl apply -f -

# 3. 部署依赖服务
echo "Step 3: Deploying prerequisites..."
helm install ${DR_ENV}-prerequisites datahub/datahub-prerequisites \
  -f prerequisites-production-values.yaml \
  -n ${DR_ENV} \
  --wait

# 4. 恢复数据
echo "Step 4: Restoring data from latest backup..."
LATEST_BACKUP=$(aws s3 ls s3://your-backup-bucket/mysql/ | sort | tail -n 1 | awk '{print $4}')
./restore-mysql.sh ${LATEST_BACKUP}

# 5. 部署 DataHub
echo "Step 5: Deploying DataHub..."
helm install ${DR_ENV} datahub/datahub \
  -f datahub-production-values.yaml \
  -n ${DR_ENV} \
  --wait

# 6. 验证服务
echo "Step 6: Verifying services..."
kubectl get pods -n ${DR_ENV}

# 7. 健康检查
echo "Step 7: Running health checks..."
GMS_POD=$(kubectl get pod -n ${DR_ENV} -l app=datahub-gms -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n ${DR_ENV} ${GMS_POD} -- curl -f http://localhost:8080/health || {
    echo "ERROR: Health check failed"
    exit 1
}

echo "========================================"
echo "DR Drill completed successfully!"
echo "DR environment: ${DR_ENV}"
echo "========================================"
```

---

## 7. 安全加固

### 7.1 TLS/SSL 配置

#### cert-manager 部署

```bash
# 安装 cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# 等待 cert-manager 就绪
kubectl wait --for=condition=Available --timeout=300s \
  deployment/cert-manager -n cert-manager
```

#### Let's Encrypt 证书颁发器

```yaml
# letsencrypt-issuer.yaml
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    # Let's Encrypt 生产环境
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@yourcompany.com

    # 密钥存储
    privateKeySecretRef:
      name: letsencrypt-prod-key

    # HTTP01 挑战
    solvers:
    - http01:
        ingress:
          class: nginx

---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    # Let's Encrypt 测试环境
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: ops@yourcompany.com

    privateKeySecretRef:
      name: letsencrypt-staging-key

    solvers:
    - http01:
        ingress:
          class: nginx
```

#### 内部服务 TLS（使用自签名证书）

```yaml
# internal-ca-issuer.yaml
---
# 创建自签名根证书
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}

---
# 创建 CA 证书
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: datahub-ca
  namespace: datahub-prod
spec:
  isCA: true
  commonName: datahub-ca
  secretName: datahub-ca-secret
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer

---
# 创建 CA Issuer
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: datahub-ca-issuer
  namespace: datahub-prod
spec:
  ca:
    secretName: datahub-ca-secret

---
# MySQL TLS 证书
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: mysql-tls
  namespace: datahub-prod
spec:
  secretName: mysql-tls-secret
  duration: 8760h  # 1 year
  renewBefore: 720h  # 30 days
  subject:
    organizations:
      - YourCompany
  commonName: mysql-primary.datahub-prod.svc.cluster.local
  dnsNames:
    - mysql-primary
    - mysql-primary.datahub-prod
    - mysql-primary.datahub-prod.svc
    - mysql-primary.datahub-prod.svc.cluster.local
  issuerRef:
    name: datahub-ca-issuer
    kind: Issuer

---
# Kafka TLS 证书
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: kafka-tls
  namespace: datahub-prod
spec:
  secretName: kafka-tls-secret
  duration: 8760h
  renewBefore: 720h
  commonName: kafka-broker.datahub-prod.svc.cluster.local
  dnsNames:
    - kafka-broker
    - kafka-broker.datahub-prod
    - kafka-broker.datahub-prod.svc
    - "*.kafka-broker-headless.datahub-prod.svc.cluster.local"
  issuerRef:
    name: datahub-ca-issuer
    kind: Issuer
```

### 7.2 网络隔离

#### NetworkPolicy 配置

```yaml
# network-isolation.yaml
---
# 默认拒绝所有入站流量
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: datahub-prod
spec:
  podSelector: {}
  policyTypes:
  - Ingress

---
# 默认拒绝所有出站流量
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: datahub-prod
spec:
  podSelector: {}
  policyTypes:
  - Egress

---
# 允许 Frontend 访问 GMS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-to-gms
  namespace: datahub-prod
spec:
  podSelector:
    matchLabels:
      app: datahub-frontend
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: datahub-gms
    ports:
    - protocol: TCP
      port: 8080

---
# 允许 GMS 访问数据库和搜索服务
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: gms-to-datastore
  namespace: datahub-prod
spec:
  podSelector:
    matchLabels:
      app: datahub-gms
  policyTypes:
  - Egress
  egress:
  # MySQL
  - to:
    - podSelector:
        matchLabels:
          app: mysql
    ports:
    - protocol: TCP
      port: 3306

  # Elasticsearch
  - to:
    - podSelector:
        matchLabels:
          app: elasticsearch
    ports:
    - protocol: TCP
      port: 9200

  # Kafka
  - to:
    - podSelector:
        matchLabels:
          app: kafka
    ports:
    - protocol: TCP
      port: 9092

  # Neo4j (如果启用)
  - to:
    - podSelector:
        matchLabels:
          app: neo4j
    ports:
    - protocol: TCP
      port: 7687

---
# 允许从 Ingress 访问 Frontend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ingress-to-frontend
  namespace: datahub-prod
spec:
  podSelector:
    matchLabels:
      app: datahub-frontend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 9002

---
# 允许 DNS 查询
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: datahub-prod
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
```

### 7.3 密钥管理

#### 使用 External Secrets Operator

```yaml
# external-secrets-setup.yaml
---
# 安装 External Secrets Operator
# kubectl apply -f https://raw.githubusercontent.com/external-secrets/external-secrets/main/deploy/crds/bundle.yaml
# helm repo add external-secrets https://charts.external-secrets.io
# helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# AWS Secrets Manager Backend
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: datahub-prod
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa

---
# 从 AWS Secrets Manager 同步密钥
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: datahub-secrets
  namespace: datahub-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore

  target:
    name: datahub-app-secrets
    creationPolicy: Owner

  data:
  # MySQL 密码
  - secretKey: mysql-root-password
    remoteRef:
      key: datahub/mysql
      property: root-password

  - secretKey: mysql-datahub-password
    remoteRef:
      key: datahub/mysql
      property: datahub-password

  # Elasticsearch 密码
  - secretKey: elastic-password
    remoteRef:
      key: datahub/elasticsearch
      property: password

  # Neo4j 密码
  - secretKey: neo4j-password
    remoteRef:
      key: datahub/neo4j
      property: password

  # JWT 密钥
  - secretKey: jwt-secret
    remoteRef:
      key: datahub/app
      property: jwt-secret

  # Kafka SASL 密码
  - secretKey: kafka-sasl-password
    remoteRef:
      key: datahub/kafka
      property: sasl-password
```

#### Vault Integration（替代方案）

```yaml
# vault-secrets.yaml
---
# Vault SecretStore
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: datahub-prod
spec:
  provider:
    vault:
      server: "https://vault.yourcompany.com"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "datahub"
          serviceAccountRef:
            name: datahub-sa

---
# 从 Vault 同步密钥
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: datahub-vault-secrets
  namespace: datahub-prod
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: vault-backend
    kind: SecretStore

  target:
    name: datahub-vault-secrets
    creationPolicy: Owner

  data:
  - secretKey: database-password
    remoteRef:
      key: datahub/database
      property: password
```

### 7.4 身份认证和授权

#### OIDC 集成配置

```yaml
# gms-oidc-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gms-oidc-config
  namespace: datahub-prod
data:
  application.yml: |
    authentication:
      enabled: true
      systemClientId: __datahub_system
      systemClientSecret: ${DATAHUB_SYSTEM_CLIENT_SECRET}

      # OIDC 配置
      oidc:
        enabled: true
        clientId: ${OIDC_CLIENT_ID}
        clientSecret: ${OIDC_CLIENT_SECRET}
        discoveryUri: https://your-idp.com/.well-known/openid-configuration
        userNameClaim: email
        userNameClaimRegex: "([^@]+)"
        scope: "openid profile email"

        # 角色映射
        groupsClaim: groups

      # JWT 配置
      tokenService:
        signingKey: ${JWT_SIGNING_KEY}
        salt: ${JWT_SALT}
        signingAlgorithm: HS256
        issuer: datahub
        expirationTimeInMs: 86400000  # 24 hours
```

#### RBAC 策略

```yaml
# datahub-rbac-policies.yaml
# 通过 DataHub API 或 UI 配置

policies:
  - name: "Admin Full Access"
    description: "Full access for administrators"
    type: "PLATFORM"
    actors:
      users:
        - "urn:li:corpuser:admin"
      groups:
        - "urn:li:corpGroup:admins"
    privileges:
      - "MANAGE_POLICIES"
      - "MANAGE_USERS_AND_GROUPS"
      - "VIEW_ANALYTICS"
      - "MANAGE_DOMAINS"
      - "MANAGE_GLOSSARIES"
      - "MANAGE_TAGS"
    resources:
      allResources: true

  - name: "Data Steward Access"
    description: "Access for data stewards"
    type: "PLATFORM"
    actors:
      groups:
        - "urn:li:corpGroup:data-stewards"
    privileges:
      - "MANAGE_DOMAINS"
      - "MANAGE_GLOSSARIES"
      - "MANAGE_TAGS"
      - "EDIT_ENTITY_DOCS"
      - "EDIT_ENTITY_OWNERS"
    resources:
      allResources: true

  - name: "Viewer Access"
    description: "Read-only access for all users"
    type: "PLATFORM"
    actors:
      allUsers: true
    privileges:
      - "VIEW_ENTITY_PAGE"
      - "SEARCH_PRIVILEGE"
    resources:
      allResources: true
```

### 7.5 安全扫描和审计

#### Trivy 镜像扫描

```yaml
# trivy-scan-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: trivy-image-scan
  namespace: datahub-prod
spec:
  schedule: "0 3 * * *"  # 每天凌晨 3 点
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: trivy
            image: aquasec/trivy:latest
            command:
            - /bin/sh
            - -c
            - |
              # 扫描 DataHub 镜像
              trivy image \
                --severity HIGH,CRITICAL \
                --format json \
                --output /reports/gms-scan.json \
                acryldata/datahub-gms:v0.14.1

              trivy image \
                --severity HIGH,CRITICAL \
                --format json \
                --output /reports/frontend-scan.json \
                acryldata/datahub-frontend-react:v0.14.1

              # 上传报告到 S3
              aws s3 sync /reports s3://your-security-reports/trivy/$(date +%Y%m%d)/

            volumeMounts:
            - name: reports
              mountPath: /reports

          volumes:
          - name: reports
            emptyDir: {}
```

#### 审计日志配置

```yaml
# audit-logging-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gms-audit-config
  namespace: datahub-prod
data:
  logback.xml: |
    <?xml version="1.0" encoding="UTF-8"?>
    <configuration>
      <!-- 审计日志 Appender -->
      <appender name="AUDIT" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>/var/log/datahub/audit.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
          <fileNamePattern>/var/log/datahub/audit.%d{yyyy-MM-dd}.log.gz</fileNamePattern>
          <maxHistory>90</maxHistory>
          <totalSizeCap>10GB</totalSizeCap>
        </rollingPolicy>
        <encoder>
          <pattern>%d{ISO8601} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
      </appender>

      <!-- 审计 Logger -->
      <logger name="com.linkedin.metadata.audit" level="INFO" additivity="false">
        <appender-ref ref="AUDIT" />
      </logger>

      <!-- 应用日志 -->
      <root level="INFO">
        <appender-ref ref="CONSOLE" />
        <appender-ref ref="FILE" />
      </root>
    </configuration>
```

---

## 8. 运维最佳实践

### 8.1 部署检查清单

```markdown
# DataHub 生产环境部署检查清单

## 部署前 (Pre-Deployment)

- [ ] 所有依赖服务已部署并运行正常
  - [ ] MySQL 主从复制已配置
  - [ ] Elasticsearch 集群健康状态为 green
  - [ ] Kafka 所有 Topics 已创建
  - [ ] Zookeeper 集群正常运行

- [ ] 密钥管理
  - [ ] 所有密钥已通过 External Secrets 或 Vault 管理
  - [ ] 密钥轮换策略已配置
  - [ ] 不存在硬编码密钥

- [ ] 资源配置
  - [ ] ResourceQuota 已设置
  - [ ] LimitRange 已配置
  - [ ] PodDisruptionBudget 已创建

- [ ] 网络配置
  - [ ] NetworkPolicy 已应用
  - [ ] Ingress TLS 证书已配置
  - [ ] 负载均衡器健康检查已配置

- [ ] 监控和日志
  - [ ] Prometheus 正在采集指标
  - [ ] Grafana Dashboard 已导入
  - [ ] AlertManager 告警路由已配置
  - [ ] 日志聚合已配置

- [ ] 备份
  - [ ] 备份 CronJob 已配置
  - [ ] 备份存储桶已创建
  - [ ] 备份验证脚本已测试

## 部署中 (During Deployment)

- [ ] 使用正确的 Helm values 文件
- [ ] 镜像版本已锁定（不使用 latest）
- [ ] 部署顺序正确（先依赖，后应用）
- [ ] 监控部署进度和日志

## 部署后 (Post-Deployment)

- [ ] 健康检查
  - [ ] 所有 Pods 运行正常
  - [ ] 所有服务可访问
  - [ ] Ingress 配置正确

- [ ] 功能测试
  - [ ] 用户可以登录
  - [ ] 搜索功能正常
  - [ ] 元数据摄取正常
  - [ ] 血缘关系显示正常

- [ ] 性能测试
  - [ ] 响应时间符合预期
  - [ ] 资源使用率正常
  - [ ] 无明显瓶颈

- [ ] 安全检查
  - [ ] TLS 证书有效
  - [ ] 身份认证正常
  - [ ] 授权策略生效

- [ ] 监控验证
  - [ ] 所有指标正常采集
  - [ ] Dashboard 显示正常
  - [ ] 测试告警规则

- [ ] 文档更新
  - [ ] 部署配置已记录
  - [ ] 运维手册已更新
  - [ ] 联系人信息已更新
```

### 8.2 故障排查指南

```markdown
# DataHub 故障排查指南

## GMS 服务不可用

### 症状
- GMS Pods 状态为 CrashLoopBackOff
- 健康检查失败
- 无法连接到 GMS

### 排查步骤

1. 检查 Pod 状态
```bash
kubectl get pods -n datahub-prod | grep gms
kubectl describe pod <gms-pod-name> -n datahub-prod
```

2. 查看日志
```bash
kubectl logs <gms-pod-name> -n datahub-prod --tail=200
kubectl logs <gms-pod-name> -n datahub-prod --previous  # 查看上一个容器的日志
```

3. 检查依赖服务
```bash
# MySQL
kubectl exec -n datahub-prod <gms-pod-name> -- \
  nc -zv mysql-primary 3306

# Elasticsearch
kubectl exec -n datahub-prod <gms-pod-name> -- \
  curl -f http://elasticsearch:9200/_cluster/health

# Kafka
kubectl exec -n datahub-prod <gms-pod-name> -- \
  nc -zv kafka-broker 9092
```

4. 检查资源限制
```bash
kubectl top pod <gms-pod-name> -n datahub-prod
```

### 常见原因和解决方案

- **内存不足**: 增加内存限制或调整 JVM 参数
- **数据库连接失败**: 检查连接字符串和密钥
- **Kafka 连接超时**: 检查网络策略和 Kafka 健康状态

## Elasticsearch 集群状态异常

### 症状
- 集群状态为 yellow 或 red
- 搜索功能缓慢或失败
- 索引操作失败

### 排查步骤

1. 检查集群健康
```bash
curl http://elasticsearch:9200/_cluster/health?pretty
```

2. 检查节点状态
```bash
curl http://elasticsearch:9200/_cat/nodes?v
```

3. 检查索引状态
```bash
curl http://elasticsearch:9200/_cat/indices?v
```

4. 查看未分配分片
```bash
curl http://elasticsearch:9200/_cat/shards?h=index,shard,prirep,state,unassigned.reason
```

### 常见原因和解决方案

- **磁盘空间不足**: 清理旧索引或增加存储
- **分片未分配**: 手动分配或调整副本数
- **节点故障**: 重启故障节点或扩展集群

## Kafka Consumer Lag 过高

### 症状
- 消息延迟严重
- 元数据更新不及时
- 监控显示 lag 持续增长

### 排查步骤

1. 检查 consumer lag
```bash
kafka-consumer-groups.sh --bootstrap-server kafka-broker:9092 \
  --describe --group generic-mce-consumer
```

2. 检查 Topic 状态
```bash
kafka-topics.sh --bootstrap-server kafka-broker:9092 \
  --describe --topic MetadataChangeProposal_v1
```

3. 检查 Consumer 日志
```bash
kubectl logs -n datahub-prod <consumer-pod-name> --tail=200
```

### 常见原因和解决方案

- **Consumer 处理慢**: 增加 consumer 并行度或副本数
- **Kafka 性能问题**: 检查 Kafka 资源使用和配置
- **数据库瓶颈**: 优化数据库查询或增加连接池

## 性能问题

### 症状
- 响应时间过长
- CPU/内存使用率过高
- 用户体验差

### 排查步骤

1. 检查应用指标
```bash
# 查看 Grafana Dashboard
# 或使用 Prometheus 查询

# GMS P95 延迟
histogram_quantile(0.95, rate(http_server_requests_seconds_bucket{job='datahub-gms'}[5m]))

# JVM 内存使用
jvm_memory_used_bytes{job='datahub-gms',area='heap'} / jvm_memory_max_bytes{job='datahub-gms',area='heap'}
```

2. 分析慢查询
```bash
# MySQL 慢查询
kubectl exec -n datahub-prod mysql-primary-0 -- \
  mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "SELECT * FROM mysql.slow_log ORDER BY query_time DESC LIMIT 10;"

# Elasticsearch 慢查询
curl http://elasticsearch:9200/_nodes/stats/indices/search?pretty
```

3. 检查线程池
```bash
# JVM 线程 dump
kubectl exec -n datahub-prod <gms-pod-name> -- jstack 1 > thread-dump.txt
```

### 优化建议

- **增加副本数**: 水平扩展应用
- **优化数据库查询**: 添加索引或重写查询
- **调整缓存**: 增加缓存大小或调整 TTL
- **升级资源**: 增加 CPU 和内存限制
```

### 8.3 性能优化建议

```yaml
# performance-tuning-guide.yaml

# 1. JVM 调优
gms:
  env:
    - name: JAVA_OPTS
      value: >-
        -Xms4g -Xmx6g
        -XX:+UseG1GC
        -XX:MaxGCPauseMillis=200
        -XX:InitiatingHeapOccupancyPercent=45
        -XX:G1HeapRegionSize=16m
        -XX:+ParallelRefProcEnabled
        -XX:+UnlockExperimentalVMOptions
        -XX:+DisableExplicitGC
        -XX:+AlwaysPreTouch
        -XX:+HeapDumpOnOutOfMemoryError
        -XX:HeapDumpPath=/tmp/heap-dump.hprof

# 2. MySQL 连接池调优
datasource:
  hikari:
    maximum-pool-size: 50
    minimum-idle: 10
    connection-timeout: 30000
    idle-timeout: 600000
    max-lifetime: 1800000
    leak-detection-threshold: 60000

# 3. Elasticsearch 批量操作优化
elasticsearch:
  bulkProcessor:
    bulkActions: 1000
    bulkSize: 5mb
    flushInterval: 10s
    concurrentRequests: 4

# 4. Kafka Consumer 优化
kafka:
  consumer:
    fetch-min-size: 1mb
    fetch-max-wait: 500ms
    max-poll-records: 500
    max-poll-interval: 300000

# 5. 缓存配置优化
cache:
  client:
    entityClient:
      enabled: true
      maxBytes: 209715200  # 200MB
      entityAspectTTLSeconds:
        corpuser:
          corpUserInfo: 60
          corpUserKey: 600
        dataset:
          schemaMetadata: 300
          datasetProperties: 300
```

### 8.4 容量规划工具

```python
#!/usr/bin/env python3
# capacity-planning-calculator.py

"""
DataHub 容量规划计算器
根据实体数量和增长率估算资源需求
"""

def calculate_storage_requirement(
    num_entities: int,
    avg_entity_size_kb: float = 50,
    growth_rate_monthly: float = 0.1,
    retention_months: int = 12
):
    """计算存储需求"""

    # 计算月度增长
    monthly_entities = []
    current = num_entities
    for month in range(retention_months):
        monthly_entities.append(current)
        current = current * (1 + growth_rate_monthly)

    # MySQL 存储（永久保留所有数据）
    total_entities = sum(monthly_entities)
    mysql_storage_gb = (total_entities * avg_entity_size_kb) / (1024 * 1024)

    # Elasticsearch 存储（90 天保留）
    es_months = min(3, retention_months)
    es_entities = sum(monthly_entities[:es_months])
    es_storage_gb = (es_entities * avg_entity_size_kb * 2) / (1024 * 1024)  # 2x for replicas

    # Kafka 存储（7 天保留，高吞吐）
    kafka_storage_gb = (monthly_entities[0] * avg_entity_size_kb * 4) / (1024 * 1024)  # 4x for overhead

    return {
        "mysql_gb": round(mysql_storage_gb, 2),
        "elasticsearch_gb": round(es_storage_gb, 2),
        "kafka_gb": round(kafka_storage_gb, 2),
        "total_gb": round(mysql_storage_gb + es_storage_gb + kafka_storage_gb, 2)
    }

def calculate_compute_requirement(
    num_entities: int,
    avg_queries_per_second: int = 10,
    avg_ingestion_per_hour: int = 100
):
    """计算计算资源需求"""

    # GMS 资源（基于查询负载）
    gms_cpu_cores = max(4, avg_queries_per_second // 5)
    gms_memory_gb = max(8, num_entities // 10000 * 4)
    gms_replicas = max(3, avg_queries_per_second // 50)

    # Elasticsearch 资源（基于索引大小）
    es_nodes = max(3, num_entities // 100000 + 1)
    es_cpu_cores_per_node = 4
    es_memory_gb_per_node = max(8, num_entities // 50000)

    # Kafka 资源（基于吞吐量）
    kafka_brokers = 3
    kafka_cpu_cores_per_broker = max(2, avg_ingestion_per_hour // 1000)
    kafka_memory_gb_per_broker = 8

    return {
        "gms": {
            "replicas": gms_replicas,
            "cpu_per_replica": gms_cpu_cores,
            "memory_gb_per_replica": gms_memory_gb,
            "total_cpu": gms_cpu_cores * gms_replicas,
            "total_memory_gb": gms_memory_gb * gms_replicas
        },
        "elasticsearch": {
            "nodes": es_nodes,
            "cpu_per_node": es_cpu_cores_per_node,
            "memory_gb_per_node": es_memory_gb_per_node,
            "total_cpu": es_cpu_cores_per_node * es_nodes,
            "total_memory_gb": es_memory_gb_per_node * es_nodes
        },
        "kafka": {
            "brokers": kafka_brokers,
            "cpu_per_broker": kafka_cpu_cores_per_broker,
            "memory_gb_per_broker": kafka_memory_gb_per_broker,
            "total_cpu": kafka_cpu_cores_per_broker * kafka_brokers,
            "total_memory_gb": kafka_memory_gb_per_broker * kafka_brokers
        }
    }

if __name__ == "__main__":
    import json

    # 示例：中等规模部署
    num_entities = 50000
    queries_per_second = 50
    ingestion_per_hour = 500

    print("=" * 60)
    print("DataHub 容量规划报告")
    print("=" * 60)
    print(f"\n输入参数:")
    print(f"  实体数量: {num_entities:,}")
    print(f"  查询 QPS: {queries_per_second}")
    print(f"  摄取速率: {ingestion_per_hour}/hour")

    storage = calculate_storage_requirement(num_entities)
    print(f"\n存储需求:")
    print(f"  MySQL: {storage['mysql_gb']:.2f} GB")
    print(f"  Elasticsearch: {storage['elasticsearch_gb']:.2f} GB")
    print(f"  Kafka: {storage['kafka_gb']:.2f} GB")
    print(f"  总计: {storage['total_gb']:.2f} GB")

    compute = calculate_compute_requirement(num_entities, queries_per_second, ingestion_per_hour)
    print(f"\n计算资源需求:")
    print(f"\n  GMS:")
    print(f"    副本数: {compute['gms']['replicas']}")
    print(f"    每副本 CPU: {compute['gms']['cpu_per_replica']} cores")
    print(f"    每副本内存: {compute['gms']['memory_gb_per_replica']} GB")
    print(f"    总 CPU: {compute['gms']['total_cpu']} cores")
    print(f"    总内存: {compute['gms']['total_memory_gb']} GB")

    print(f"\n  Elasticsearch:")
    print(f"    节点数: {compute['elasticsearch']['nodes']}")
    print(f"    每节点 CPU: {compute['elasticsearch']['cpu_per_node']} cores")
    print(f"    每节点内存: {compute['elasticsearch']['memory_gb_per_node']} GB")
    print(f"    总 CPU: {compute['elasticsearch']['total_cpu']} cores")
    print(f"    总内存: {compute['elasticsearch']['total_memory_gb']} GB")

    print(f"\n  Kafka:")
    print(f"    Broker 数: {compute['kafka']['brokers']}")
    print(f"    每 Broker CPU: {compute['kafka']['cpu_per_broker']} cores")
    print(f"    每 Broker 内存: {compute['kafka']['memory_gb_per_broker']} GB")
    print(f"    总 CPU: {compute['kafka']['total_cpu']} cores")
    print(f"    总内存: {compute['kafka']['total_memory_gb']} GB")

    total_cpu = (compute['gms']['total_cpu'] +
                 compute['elasticsearch']['total_cpu'] +
                 compute['kafka']['total_cpu'])
    total_memory = (compute['gms']['total_memory_gb'] +
                    compute['elasticsearch']['total_memory_gb'] +
                    compute['kafka']['total_memory_gb'])

    print(f"\n集群总计:")
    print(f"  总 CPU: {total_cpu} cores")
    print(f"  总内存: {total_memory} GB")
    print(f"  总存储: {storage['total_gb']:.2f} GB")
    print("=" * 60)
```

### 8.5 运维自动化脚本

```bash
#!/bin/bash
# datahub-ops-automation.sh
# DataHub 运维自动化脚本集合

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

NAMESPACE="datahub-prod"

# 健康检查
function health_check() {
    echo -e "${GREEN}Running health check...${NC}"

    # 检查所有 Pods
    echo "Checking Pods status..."
    kubectl get pods -n ${NAMESPACE} | grep -v "Running\|Completed" && {
        echo -e "${RED}Some pods are not healthy!${NC}"
        return 1
    }

    # 检查 GMS 健康
    GMS_POD=$(kubectl get pod -n ${NAMESPACE} -l app=datahub-gms -o jsonpath='{.items[0].metadata.name}')
    kubectl exec -n ${NAMESPACE} ${GMS_POD} -- curl -sf http://localhost:8080/health || {
        echo -e "${RED}GMS health check failed!${NC}"
        return 1
    }

    # 检查 Elasticsearch 集群
    ES_STATUS=$(kubectl exec -n ${NAMESPACE} elasticsearch-master-0 -- \
        curl -s http://localhost:9200/_cluster/health | jq -r '.status')

    if [ "$ES_STATUS" != "green" ]; then
        echo -e "${YELLOW}Elasticsearch cluster is ${ES_STATUS}${NC}"
    fi

    echo -e "${GREEN}Health check passed!${NC}"
}

# 资源使用报告
function resource_report() {
    echo -e "${GREEN}Generating resource usage report...${NC}"

    echo "Pod Resource Usage:"
    kubectl top pods -n ${NAMESPACE} --sort-by=memory

    echo -e "\nPVC Usage:"
    kubectl get pvc -n ${NAMESPACE} -o custom-columns=NAME:.metadata.name,CAPACITY:.spec.resources.requests.storage,STATUS:.status.phase

    echo -e "\nNode Resource Allocation:"
    kubectl top nodes
}

# 清理旧数据
function cleanup_old_data() {
    echo -e "${GREEN}Cleaning up old data...${NC}"

    # 清理 Elasticsearch 旧索引
    ES_POD=$(kubectl get pod -n ${NAMESPACE} -l app=elasticsearch -o jsonpath='{.items[0].metadata.name}')

    echo "Deleting indices older than 90 days..."
    kubectl exec -n ${NAMESPACE} ${ES_POD} -- \
        curator_cli --host localhost delete_indices \
        --filter_list '[{"filtertype":"age","source":"creation_date","direction":"older","unit":"days","unit_count":90}]'

    # 清理 MySQL 旧审计日志（如果有）
    echo "Cleaning up old audit logs..."
    # TODO: 添加 MySQL 清理逻辑

    echo -e "${GREEN}Cleanup completed!${NC}"
}

# 扩缩容
function scale_deployment() {
    local deployment=$1
    local replicas=$2

    if [ -z "$deployment" ] || [ -z "$replicas" ]; then
        echo "Usage: scale_deployment <deployment-name> <replicas>"
        return 1
    fi

    echo -e "${GREEN}Scaling ${deployment} to ${replicas} replicas...${NC}"
    kubectl scale deployment ${deployment} --replicas=${replicas} -n ${NAMESPACE}

    echo "Waiting for rollout to complete..."
    kubectl rollout status deployment/${deployment} -n ${NAMESPACE}

    echo -e "${GREEN}Scaling completed!${NC}"
}

# 重启服务
function restart_service() {
    local deployment=$1

    if [ -z "$deployment" ]; then
        echo "Usage: restart_service <deployment-name>"
        return 1
    fi

    echo -e "${YELLOW}Restarting ${deployment}...${NC}"
    kubectl rollout restart deployment/${deployment} -n ${NAMESPACE}
    kubectl rollout status deployment/${deployment} -n ${NAMESPACE}

    echo -e "${GREEN}Restart completed!${NC}"
}

# 主菜单
function show_menu() {
    echo "=========================================="
    echo "DataHub Operations Automation"
    echo "=========================================="
    echo "1. Health Check"
    echo "2. Resource Report"
    echo "3. Cleanup Old Data"
    echo "4. Scale Deployment"
    echo "5. Restart Service"
    echo "6. Exit"
    echo "=========================================="
}

# 主程序
if [ $# -eq 0 ]; then
    while true; do
        show_menu
        read -p "Select option: " option

        case $option in
            1) health_check ;;
            2) resource_report ;;
            3) cleanup_old_data ;;
            4)
                read -p "Deployment name: " dep
                read -p "Replicas: " rep
                scale_deployment $dep $rep
                ;;
            5)
                read -p "Deployment name: " dep
                restart_service $dep
                ;;
            6) exit 0 ;;
            *) echo -e "${RED}Invalid option${NC}" ;;
        esac

        echo
        read -p "Press Enter to continue..."
    done
else
    # 支持命令行参数
    case $1 in
        health) health_check ;;
        report) resource_report ;;
        cleanup) cleanup_old_data ;;
        scale) scale_deployment $2 $3 ;;
        restart) restart_service $2 ;;
        *) echo "Unknown command: $1" ;;
    esac
fi
```

---

## 附录

### A. 参考资源

- [DataHub 官方文档](https://datahubproject.io/docs/)
- [DataHub GitHub 仓库](https://github.com/datahub-project/datahub)
- [DataHub Helm Charts](https://github.com/acryldata/datahub-helm)
- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [Prometheus 文档](https://prometheus.io/docs/)
- [Elasticsearch 最佳实践](https://www.elastic.co/guide/en/elasticsearch/reference/current/best-practices.html)

### B. 常用命令速查

```bash
# Kubectl 常用命令
kubectl get pods -n datahub-prod
kubectl logs -f <pod-name> -n datahub-prod
kubectl describe pod <pod-name> -n datahub-prod
kubectl exec -it <pod-name> -n datahub-prod -- bash
kubectl port-forward <pod-name> 8080:8080 -n datahub-prod

# Helm 常用命令
helm list -n datahub-prod
helm status datahub -n datahub-prod
helm upgrade datahub datahub/datahub -f values.yaml -n datahub-prod
helm rollback datahub 1 -n datahub-prod

# MySQL 常用命令
mysql -h mysql-primary -u root -p
SHOW DATABASES;
SHOW TABLES;
SHOW PROCESSLIST;
SHOW SLAVE STATUS\G

# Elasticsearch 常用命令
curl http://elasticsearch:9200/_cluster/health?pretty
curl http://elasticsearch:9200/_cat/indices?v
curl http://elasticsearch:9200/_cat/nodes?v
curl http://elasticsearch:9200/datahub*/_search?pretty

# Kafka 常用命令
kafka-topics.sh --bootstrap-server kafka:9092 --list
kafka-consumer-groups.sh --bootstrap-server kafka:9092 --list
kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group <group-name>
```

### C. 联系和支持

- **技术支持**: support@yourcompany.com
- **紧急联系**: oncall@yourcompany.com
- **Slack 频道**: #datahub-ops
- **文档仓库**: https://github.com/yourcompany/datahub-docs

---

**文档版本**: 1.0
**最后更新**: 2025-10-30
**维护者**: DataHub 运维团队
