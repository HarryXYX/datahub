# 血缘图可视化 (Lineage Visualization)

## 目录

- [概述](#概述)
- [架构设计](#架构设计)
- [核心组件](#核心组件)
- [数据流](#数据流)
- [交互功能](#交互功能)
- [布局算法](#布局算法)
- [性能优化](#性能优化)
- [开发指南](#开发指南)

---

## 概述

DataHub 的血缘图可视化功能展示数据实体之间的依赖关系，帮助用户理解数据流转路径、影响分析和数据质量追踪。

### 功能特性

- ✅ **上下游血缘**: 可视化展示数据集的上游来源和下游消费
- ✅ **多层级展开**: 支持展开多层上下游关系
- ✅ **字段级血缘**: 展示 Schema 字段级别的依赖关系
- ✅ **列高亮**: 列级血缘路径高亮显示
- ✅ **交互式图形**: 拖拽、缩放、平移等交互操作
- ✅ **影响分析**: 查看变更影响范围
- ✅ **时间旅行**: 查看历史血缘关系
- ✅ **手动编辑**: 支持手动添加/编辑血缘关系
- ✅ **导出功能**: 导出血缘图为 PNG/SVG

### 支持的血缘类型

| 血缘类型 | 说明 | 示例 |
|---------|------|------|
| **Dataset → Dataset** | 数据集到数据集 | ETL Pipeline 转换 |
| **Dataset → Dashboard** | 数据集到仪表板 | BI 报表数据源 |
| **Dataset → Chart** | 数据集到图表 | 数据可视化 |
| **DataJob → Dataset** | 数据任务到数据集 | Job 输出数据 |
| **Dataset → DataJob** | 数据集到数据任务 | Job 输入数据 |
| **Column → Column** | 字段到字段 | SQL 字段转换 |

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                  LineageExplorer                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ LineageControls (顶部控制栏)                         │  │
│  │  - 层级选择 (1-3 hops)                               │  │
│  │  - 方向选择 (上游/下游/双向)                         │  │
│  │  - 布局切换 (自动/手动)                              │  │
│  │  - 缩放控制 (+/-)                                    │  │
│  │  - 导出 (PNG/SVG)                                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────┬────────────────────────────────┐   │
│  │ LineageSidebar     │ LineageVisualization           │   │
│  │ (左侧面板)         │ (主可视化区域)                │   │
│  │                    │                                │   │
│  │ - 实体详情         │  ReactFlow Graph:              │   │
│  │ - 字段列表         │  ┌──────┐       ┌──────┐      │   │
│  │ - 血缘统计         │  │Node 1│──────▶│Node 2│      │   │
│  │ - 过滤选项         │  └──────┘       └──────┘      │   │
│  │                    │      │              │          │   │
│  │                    │      ▼              ▼          │   │
│  │                    │  ┌──────┐       ┌──────┐      │   │
│  │                    │  │Node 3│──────▶│Node 4│      │   │
│  │                    │  └──────┘       └──────┘      │   │
│  └────────────────────┴────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

- **ReactFlow** (11.10.1): 图形可视化核心库
- **D3.js**: 图形布局算法
- **@visx/hierarchy**: 层级图布局
- **Dagre**: DAG 图自动布局

### 目录结构

```
src/app/lineageV3/
├── LineageExplorer.tsx             # 血缘图页面主入口
├── LineageVisualization.tsx        # 血缘图可视化主组件
├── LineageDisplay.tsx              # ReactFlow 渲染容器
├── LineageSidebar.tsx              # 左侧信息面板
├── LineageGraphContext.tsx         # 血缘图全局 Context
│
├── LineageEntityNode/              # 实体节点组件
│   ├── LineageEntityNode.tsx       # 节点主组件
│   ├── NodeContent.tsx             # 节点内容渲染
│   ├── NodeExpand.tsx              # 展开/收起按钮
│   ├── NodeHighlight.tsx           # 节点高亮效果
│   └── styles.ts                   # 节点样式
│
├── LineageEdge/                    # 连线组件
│   ├── LineageEdge.tsx             # 边主组件
│   ├── EdgeLabel.tsx               # 边标签
│   └── EdgeHighlight.tsx           # 边高亮效果
│
├── controls/                       # 控制组件
│   ├── ZoomControls.tsx            # 缩放控制
│   ├── DirectionSelect.tsx         # 方向选择
│   ├── DepthSelect.tsx             # 层级选择
│   ├── LayoutSelect.tsx            # 布局选择
│   ├── ExportButton.tsx            # 导出按钮
│   └── FilterControls.tsx          # 过滤控制
│
├── initialize/                     # 初始化逻辑
│   ├── fetchLineage.ts             # 获取血缘数据
│   ├── buildGraph.ts               # 构建图数据结构
│   └── computeLayout.ts            # 计算节点位置
│
├── useComputeGraph/                # 图计算 Hooks
│   ├── useComputeGraph.ts          # 主计算逻辑
│   ├── useExpandNode.ts            # 节点展开逻辑
│   ├── useCollapseNode.ts          # 节点收起逻辑
│   └── useFilterGraph.ts           # 图过滤逻辑
│
├── manualLineage/                  # 手动血缘编辑
│   ├── AddLineageModal.tsx         # 添加血缘弹窗
│   ├── EditLineageModal.tsx        # 编辑血缘弹窗
│   └── LineageEditor.tsx           # 血缘编辑器
│
├── queries/                        # GraphQL 查询
│   ├── useLineageQuery.ts          # 血缘查询 Hook
│   └── lineageQueries.graphql      # 血缘 GraphQL 定义
│
├── traversals/                     # 图遍历算法
│   ├── bfs.ts                      # 广度优先搜索
│   ├── dfs.ts                      # 深度优先搜索
│   └── findPaths.ts                # 路径查找
│
├── utils/                          # 工具函数
│   ├── layoutUtils.ts              # 布局工具
│   ├── highlightUtils.ts           # 高亮工具
│   ├── exportUtils.ts              # 导出工具
│   └── constants.ts                # 常量定义
│
├── useColumnHighlighting.ts        # 列高亮 Hook
├── useNodeHighlighting.ts          # 节点高亮 Hook
├── types.ts                        # 类型定义
└── common.ts                       # 公共工具
```

---

## 核心组件

### 1. LineageExplorer

血缘图页面的主入口组件。

**文件位置**: `/src/app/lineageV3/LineageExplorer.tsx`

**职责**:
- 解析 URL 参数 (实体 URN、方向、深度)
- 获取血缘数据
- 管理全局状态 (选中节点、高亮状态)
- 协调子组件渲染

**代码示例**:

```typescript
export function LineageExplorer() {
    const { urn } = useParams<{ urn: string }>();
    const [direction, setDirection] = useState<Direction>('BOTH');
    const [depth, setDepth] = useState(3);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

    // 获取血缘数据
    const { data, loading, refetch } = useGetLineageQuery({
        variables: {
            urn: decodeURIComponent(urn),
            input: {
                direction,
                start: 0,
                count: 1000,
                degrees: depth,
            },
        },
    });

    // 构建图数据
    const { nodes, edges } = useMemo(() => {
        if (!data) return { nodes: [], edges: [] };
        return buildGraph(data.entity, direction, depth);
    }, [data, direction, depth]);

    return (
        <LineageGraphContext.Provider value={{
            selectedNode,
            setSelectedNode,
            direction,
            setDirection,
            depth,
            setDepth,
            refetch,
        }}>
            <Container>
                <LineageControls
                    direction={direction}
                    depth={depth}
                    onDirectionChange={setDirection}
                    onDepthChange={setDepth}
                />

                <ContentContainer>
                    <LineageSidebar selectedNode={selectedNode} />
                    <LineageVisualization
                        nodes={nodes}
                        edges={edges}
                        centerUrn={urn}
                    />
                </ContentContainer>
            </Container>
        </LineageGraphContext.Provider>
    );
}
```

### 2. LineageVisualization

血缘图可视化主组件，基于 ReactFlow。

**文件位置**: `/src/app/lineageV3/LineageVisualization.tsx`

**职责**:
- ReactFlow 初始化和配置
- 节点和边的渲染
- 交互事件处理 (拖拽、缩放、点击)
- 布局计算和更新

**代码示例**:

```typescript
export function LineageVisualization({ nodes, edges, centerUrn }: Props) {
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
    const { selectedNode, setSelectedNode } = useLineageGraphContext();

    // 自定义节点类型
    const nodeTypes = useMemo(
        () => ({
            lineageEntity: LineageEntityNode,
            lineageFilter: LineageFilterNode,
            lineageTransformation: LineageTransformationNode,
        }),
        []
    );

    // 自定义边类型
    const edgeTypes = useMemo(
        () => ({
            lineage: LineageEdge,
        }),
        []
    );

    // 自动布局
    useEffect(() => {
        if (reactFlowInstance && nodes.length > 0) {
            const layoutedElements = computeLayout(nodes, edges);
            reactFlowInstance.setNodes(layoutedElements.nodes);
            reactFlowInstance.setEdges(layoutedElements.edges);

            // 居中显示
            setTimeout(() => {
                reactFlowInstance.fitView({ padding: 0.2 });
            }, 100);
        }
    }, [nodes, edges, reactFlowInstance]);

    return (
        <ReactFlowProvider>
            <ReactFlowContainer>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onInit={setReactFlowInstance}
                    onNodeClick={(event, node) => setSelectedNode(node.id)}
                    fitView
                    minZoom={0.1}
                    maxZoom={1.5}
                    defaultEdgeOptions={{
                        type: 'lineage',
                        animated: false,
                    }}
                >
                    <Background />
                    <Controls />
                    <MiniMap />
                </ReactFlow>
            </ReactFlowContainer>
        </ReactFlowProvider>
    );
}
```

### 3. LineageEntityNode

实体节点组件。

**文件位置**: `/src/app/lineageV3/LineageEntityNode/LineageEntityNode.tsx`

**职责**:
- 渲染实体节点 (图标、名称、平台)
- 展开/收起按钮
- 节点高亮状态
- 悬停预览

**代码示例**:

```typescript
export function LineageEntityNode({ data }: NodeProps<LineageNodeData>) {
    const { entity, isExpanded, onExpand, onCollapse } = data;
    const { selectedNode } = useLineageGraphContext();
    const entityRegistry = useEntityRegistry();

    const isHighlighted = selectedNode === entity.urn;
    const hasUpstream = entity.upstreamCount > 0;
    const hasDownstream = entity.downstreamCount > 0;

    return (
        <NodeContainer highlighted={isHighlighted}>
            <NodeHeader>
                <EntityIcon>
                    {entityRegistry.getIcon(entity.type, 20, IconStyleType.ACCENT)}
                </EntityIcon>
                <EntityName>{entity.name}</EntityName>
            </NodeHeader>

            <NodeBody>
                <PlatformInfo>
                    <PlatformIcon src={entity.platform?.logo} />
                    <PlatformName>{entity.platform?.name}</PlatformName>
                </PlatformInfo>

                {entity.description && (
                    <Description>{truncate(entity.description, 100)}</Description>
                )}
            </NodeBody>

            <NodeFooter>
                {hasUpstream && (
                    <ExpandButton
                        direction="upstream"
                        isExpanded={isExpanded.upstream}
                        onClick={() => isExpanded.upstream ? onCollapse('upstream') : onExpand('upstream')}
                    >
                        {isExpanded.upstream ? <CollapseIcon /> : <ExpandIcon />}
                        {entity.upstreamCount} upstream
                    </ExpandButton>
                )}

                {hasDownstream && (
                    <ExpandButton
                        direction="downstream"
                        isExpanded={isExpanded.downstream}
                        onClick={() => isExpanded.downstream ? onCollapse('downstream') : onExpand('downstream')}
                    >
                        {isExpanded.downstream ? <CollapseIcon /> : <ExpandIcon />}
                        {entity.downstreamCount} downstream
                    </ExpandButton>
                )}
            </NodeFooter>
        </NodeContainer>
    );
}
```

### 4. LineageEdge

血缘关系连线组件。

**文件位置**: `/src/app/lineageV3/LineageEdge/LineageEdge.tsx`

**功能**:
- 渲染连线 (贝塞尔曲线或直线)
- 连线标签 (转换类型、字段映射)
- 连线高亮
- 连线动画

**代码示例**:

```typescript
export function LineageEdge({
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
    markerEnd,
}: EdgeProps<LineageEdgeData>) {
    const { selectedNode } = useLineageGraphContext();
    const isHighlighted = selectedNode === source || selectedNode === target;

    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
    });

    return (
        <>
            <path
                id={id}
                className="react-flow__edge-path"
                d={edgePath}
                strokeWidth={isHighlighted ? 3 : 2}
                stroke={isHighlighted ? '#1890ff' : '#b1b1b7'}
                markerEnd={markerEnd}
            />

            {data?.label && (
                <EdgeLabel
                    transform={`translate(${(sourceX + targetX) / 2}, ${(sourceY + targetY) / 2})`}
                >
                    {data.label}
                </EdgeLabel>
            )}
        </>
    );
}
```

---

## 数据流

### 血缘数据获取流程

```
1. 用户访问血缘图页面
   /lineage/dataset/urn:li:dataset:123?direction=BOTH&depth=3
           ↓
2. LineageExplorer 解析 URL 参数
   - urn: urn:li:dataset:123
   - direction: BOTH (上下游)
   - depth: 3 (3 层)
           ↓
3. 执行 GraphQL 查询
   query getLineage($urn: String!, $input: LineageInput!) {
     entity(urn: $urn) {
       ... on Dataset {
         upstream(input: $input) {
           start
           count
           total
           relationships {
             entity { urn type ... }
             degree
             paths { path }
           }
         }
         downstream(input: $input) { ... }
       }
     }
   }
           ↓
4. GMS 返回血缘数据
   {
     upstream: {
       relationships: [
         { entity: {...}, degree: 1 },
         { entity: {...}, degree: 2 },
       ]
     },
     downstream: { ... }
   }
           ↓
5. buildGraph() 构建图数据结构
   - 解析实体关系
   - 构建节点 (nodes)
   - 构建边 (edges)
   - 去重和合并
           ↓
6. computeLayout() 计算布局
   - 使用 Dagre 算法计算节点位置
   - 按层级排列
   - 避免节点重叠
           ↓
7. ReactFlow 渲染图形
   - 渲染节点和边
   - 应用样式和交互
           ↓
8. 用户交互
   - 拖拽节点
   - 展开/收起
   - 选中节点查看详情
```

### GraphQL 查询

**文件位置**: `/src/graphql/lineage.graphql`

```graphql
query getLineage($urn: String!, $input: LineageInput!) {
    entity(urn: $urn) {
        urn
        type
        ... on EntityWithRelationships {
            upstream(input: $input) {
                start
                count
                total
                relationships {
                    entity {
                        urn
                        type
                        ... on Dataset {
                            name
                            platform { name logo }
                            properties { description }
                            upstreamCount: upstream(input: { start: 0, count: 0 }) { total }
                            downstreamCount: downstream(input: { start: 0, count: 0 }) { total }
                        }
                    }
                    type  # TRANSFORMED, CONSUMED, PRODUCED, etc.
                    degree  # 1, 2, 3 (层级)
                    paths {
                        path {
                            urn
                            type
                        }
                    }
                    # 字段级血缘
                    fineGrainedLineages {
                        upstreamType
                        downstreamType
                        transformOperation
                        upstreams {
                            urn
                            path
                        }
                        downstreams {
                            urn
                            path
                        }
                    }
                }
            }
            downstream(input: $input) {
                # 同上
            }
        }
    }
}
```

---

## 交互功能

### 1. 节点展开/收起

用户可以逐层展开实体的上下游关系。

```typescript
function useExpandNode() {
    const { refetch } = useLineageGraphContext();

    const expandNode = async (urn: string, direction: 'upstream' | 'downstream') => {
        // 获取该节点的上下游数据
        const { data } = await refetch({
            urn,
            input: {
                direction: direction === 'upstream' ? 'UPSTREAM' : 'DOWNSTREAM',
                start: 0,
                count: 100,
                degrees: 1,  // 只展开 1 层
            },
        });

        // 更新图数据
        const newNodes = extractNodes(data);
        const newEdges = extractEdges(data);

        addNodesToGraph(newNodes);
        addEdgesToGraph(newEdges);

        // 标记节点为已展开
        markNodeAsExpanded(urn, direction);
    };

    return expandNode;
}
```

### 2. 节点选中和高亮

选中节点时，高亮显示相关的上下游路径。

```typescript
function useNodeHighlighting() {
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
    const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!selectedNode) {
            setHighlightedNodes(new Set());
            setHighlightedEdges(new Set());
            return;
        }

        // 查找所有相关的上下游节点
        const relatedNodes = findRelatedNodes(selectedNode, nodes, edges);
        const relatedEdges = findRelatedEdges(selectedNode, edges);

        setHighlightedNodes(new Set(relatedNodes));
        setHighlightedEdges(new Set(relatedEdges));
    }, [selectedNode, nodes, edges]);

    return {
        selectedNode,
        setSelectedNode,
        isNodeHighlighted: (urn: string) => highlightedNodes.has(urn),
        isEdgeHighlighted: (id: string) => highlightedEdges.has(id),
    };
}
```

### 3. 列级血缘高亮

选中 Schema 字段时，高亮显示字段级别的血缘路径。

```typescript
function useColumnHighlighting() {
    const [selectedColumn, setSelectedColumn] = useState<{
        entityUrn: string;
        columnPath: string;
    } | null>(null);

    const highlightColumnLineage = useCallback(
        (entityUrn: string, columnPath: string) => {
            setSelectedColumn({ entityUrn, columnPath });

            // 查找字段级血缘
            const columnLineage = findFineGrainedLineage(entityUrn, columnPath);

            // 高亮相关节点和边
            highlightColumnPath(columnLineage);
        },
        [nodes, edges]
    );

    return {
        selectedColumn,
        highlightColumnLineage,
        clearColumnHighlight: () => setSelectedColumn(null),
    };
}
```

### 4. 拖拽和缩放

ReactFlow 自带拖拽和缩放功能。

```typescript
<ReactFlow
    nodes={nodes}
    edges={edges}
    // 允许拖拽节点
    nodesDraggable
    // 允许画布拖拽
    panOnDrag
    // 允许缩放
    zoomOnScroll
    // 缩放范围
    minZoom={0.1}
    maxZoom={1.5}
    // 双击居中
    onNodeDoubleClick={(event, node) => {
        reactFlowInstance?.fitView({
            nodes: [node],
            padding: 0.5,
        });
    }}
/>
```

### 5. 导出血缘图

导出为 PNG 或 SVG 格式。

```typescript
import { toPng, toSvg } from 'html-to-image';

async function exportLineageGraph(format: 'png' | 'svg') {
    const element = document.querySelector('.react-flow') as HTMLElement;

    if (!element) return;

    try {
        let dataUrl: string;

        if (format === 'png') {
            dataUrl = await toPng(element, {
                backgroundColor: '#ffffff',
                quality: 1.0,
            });
        } else {
            dataUrl = await toSvg(element);
        }

        // 下载文件
        const link = document.createElement('a');
        link.download = `lineage-graph.${format}`;
        link.href = dataUrl;
        link.click();
    } catch (error) {
        console.error('Export failed:', error);
    }
}
```

---

## 布局算法

### Dagre 自动布局

使用 Dagre 算法计算有向无环图 (DAG) 的节点位置。

```typescript
import dagre from 'dagre';

export function computeLayout(
    nodes: Node[],
    edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
    // 创建 Dagre 图
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // 设置布局方向和间距
    dagreGraph.setGraph({
        rankdir: 'LR',  // Left to Right
        ranksep: 150,   // 层级间距
        nodesep: 80,    // 节点间距
    });

    // 添加节点
    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, {
            width: node.width || 250,
            height: node.height || 120,
        });
    });

    // 添加边
    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    // 计算布局
    dagre.layout(dagreGraph);

    // 更新节点位置
    const layoutedNodes = nodes.map((node) => {
        const position = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: position.x - (node.width || 250) / 2,
                y: position.y - (node.height || 120) / 2,
            },
        };
    });

    return {
        nodes: layoutedNodes,
        edges,
    };
}
```

### 层级布局

按照血缘层级 (degree) 分层布局。

```typescript
export function computeHierarchicalLayout(
    nodes: Node[],
    edges: Edge[],
    centerUrn: string
): { nodes: Node[]; edges: Edge[] } {
    // 按 degree 分组
    const nodesByDegree = groupBy(nodes, (node) => node.data.degree);

    const layers = Object.keys(nodesByDegree)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map((degree) => nodesByDegree[degree]);

    let xOffset = 0;
    const layerWidth = 300;
    const nodeHeight = 150;

    const layoutedNodes = layers.flatMap((layer, layerIndex) => {
        const x = xOffset;
        xOffset += layerWidth;

        return layer.map((node, nodeIndex) => ({
            ...node,
            position: {
                x,
                y: nodeIndex * nodeHeight,
            },
        }));
    });

    return {
        nodes: layoutedNodes,
        edges,
    };
}
```

---

## 性能优化

### 1. 虚拟化渲染

对于大型血缘图，只渲染可视区域内的节点。

```typescript
function useVirtualizedNodes(allNodes: Node[], viewport: Viewport) {
    return useMemo(() => {
        const visibleNodes = allNodes.filter((node) => {
            const { x, y } = node.position;
            const nodeWidth = node.width || 250;
            const nodeHeight = node.height || 120;

            // 检查节点是否在可视区域内
            return (
                x + nodeWidth > viewport.x &&
                x < viewport.x + viewport.width &&
                y + nodeHeight > viewport.y &&
                y < viewport.y + viewport.height
            );
        });

        return visibleNodes;
    }, [allNodes, viewport]);
}
```

### 2. 懒加载

按需加载血缘数据，而不是一次性加载所有层级。

```typescript
function useLazyLoadLineage(urn: string) {
    const [loadedDegrees, setLoadedDegrees] = useState<Set<number>>(new Set([1]));

    const loadNextDegree = async () => {
        const nextDegree = Math.max(...Array.from(loadedDegrees)) + 1;

        const { data } = await fetchLineage(urn, {
            degrees: nextDegree,
            start: 0,
            count: 100,
        });

        // 合并新数据到现有图中
        mergeLineageData(data);
        setLoadedDegrees((prev) => new Set([...prev, nextDegree]));
    };

    return { loadedDegrees, loadNextDegree };
}
```

### 3. 节流和防抖

限制高频操作 (如拖拽) 的更新频率。

```typescript
import { throttle } from 'lodash';

const handleNodeDrag = throttle((event: MouseEvent, node: Node) => {
    updateNodePosition(node.id, {
        x: event.clientX,
        y: event.clientY,
    });
}, 16);  // 约 60fps
```

### 4. Web Worker

将布局计算移到 Web Worker 中，避免阻塞主线程。

```typescript
// lineageLayoutWorker.ts
self.addEventListener('message', (event) => {
    const { nodes, edges } = event.data;
    const layoutedElements = computeLayout(nodes, edges);
    self.postMessage(layoutedElements);
});

// 主线程
const worker = new Worker('./lineageLayoutWorker.ts');

worker.postMessage({ nodes, edges });

worker.addEventListener('message', (event) => {
    const { nodes, edges } = event.data;
    setNodes(nodes);
    setEdges(edges);
});
```

---

## 开发指南

### 添加自定义节点类型

```typescript
// 1. 定义节点组件
export function CustomLineageNode({ data }: NodeProps<CustomNodeData>) {
    return (
        <CustomNodeContainer>
            <NodeHeader>{data.title}</NodeHeader>
            <NodeBody>{data.content}</NodeBody>
        </CustomNodeContainer>
    );
}

// 2. 注册节点类型
const nodeTypes = {
    lineageEntity: LineageEntityNode,
    custom: CustomLineageNode,  // 添加自定义类型
};

// 3. 在节点数据中使用
const customNode = {
    id: 'node-1',
    type: 'custom',  // 指定类型
    data: {
        title: 'Custom Node',
        content: '...',
    },
    position: { x: 0, y: 0 },
};
```

### 自定义边样式

```typescript
export function CustomLineageEdge(props: EdgeProps) {
    const { sourceX, sourceY, targetX, targetY, data } = props;

    // 自定义路径
    const edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

    return (
        <>
            <path
                d={edgePath}
                stroke={data.color || '#b1b1b7'}
                strokeWidth={data.width || 2}
                strokeDasharray={data.dashed ? '5,5' : undefined}
            />
        </>
    );
}
```

### 测试血缘图组件

```typescript
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { LineageExplorer } from '../LineageExplorer';

const lineageMock = {
    request: {
        query: GET_LINEAGE_QUERY,
        variables: {
            urn: 'urn:li:dataset:123',
            input: { direction: 'BOTH', degrees: 3 },
        },
    },
    result: {
        data: {
            entity: {
                urn: 'urn:li:dataset:123',
                upstream: { relationships: [...] },
                downstream: { relationships: [...] },
            },
        },
    },
};

describe('LineageExplorer', () => {
    it('should render lineage graph', async () => {
        render(
            <MockedProvider mocks={[lineageMock]}>
                <LineageExplorer />
            </MockedProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('Dataset 123')).toBeInTheDocument();
        });
    });
});
```

---

## 常见问题

### Q1: 血缘图加载慢？

**原因**:
- 血缘层级过深
- 实体数量过多
- 布局计算复杂

**解决方案**:
1. 限制初始加载层级 (建议 2-3 层)
2. 启用懒加载
3. 使用 Web Worker 计算布局
4. 优化 GraphQL 查询字段

### Q2: 节点位置重叠？

**原因**:
- 布局算法参数不当
- 节点尺寸计算错误

**解决方案**:
```typescript
dagreGraph.setGraph({
    rankdir: 'LR',
    ranksep: 200,  // 增加层级间距
    nodesep: 100,  // 增加节点间距
});
```

### Q3: 字段级血缘不显示？

**检查清单**:
- ✅ 后端是否支持字段级血缘
- ✅ GraphQL 查询是否包含 `fineGrainedLineages`
- ✅ 实体是否有 Schema 信息
- ✅ 字段路径格式是否正确

---

## 相关资源

- [ReactFlow 文档](https://reactflow.dev/)
- [Dagre 文档](https://github.com/dagrejs/dagre)
- [实体详情页文档](./entity-details.md)
- [GraphQL 查询指南](../graphql/queries.md)

---

**文档版本**: 1.0
**最后更新**: 2025-10-30
