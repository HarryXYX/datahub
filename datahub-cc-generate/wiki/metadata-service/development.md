# DataHub Metadata Service 开发指南

本指南面向希望扩展或修改 DataHub Metadata Service (GMS) 的开发者。

---

## 目录

1. [开发环境设置](#开发环境设置)
2. [添加新服务](#添加新服务)
3. [添加新 API 端点](#添加新-api-端点)
4. [Aspect Validator 开发](#aspect-validator-开发)
5. [测试指南](#测试指南)
6. [代码规范](#代码规范)
7. [常见问题](#常见问题)

---

## 开发环境设置

### 前置要求

- **JDK**: 17 或更高
- **Gradle**: 8.x (项目包含 wrapper)
- **Docker**: 用于运行依赖服务
- **IDE**: IntelliJ IDEA (推荐) 或 VS Code

### 1. 克隆代码库

```bash
git clone https://github.com/datahub-project/datahub.git
cd datahub
```

### 2. 启动依赖服务

```bash
cd docker
docker-compose -f docker-compose-without-neo4j.m1.yml up -d mysql elasticsearch kafka schema-registry
```

等待所有服务启动完成(约 2-3 分钟)。

### 3. 构建项目

```bash
# 构建整个项目
./gradlew build -x test

# 仅构建 metadata-service
./gradlew :metadata-service:war:build -x test
```

### 4. 运行 GMS

```bash
./gradlew :metadata-service:war:run
```

或使用调试模式:

```bash
./gradlew :metadata-service:war:run --debug-jvm
```

然后在 IDE 中连接到 `localhost:5005`。

### 5. 验证运行

```bash
# 健康检查
curl http://localhost:8080/health

# GraphiQL
open http://localhost:8080/api/graphiql
```

---

## 添加新服务

### 场景:创建 CommentService

假设我们要创建一个管理实体评论的服务。

### 步骤 1: 创建服务类

**文件**: `metadata-service/services/src/main/java/com/linkedin/metadata/service/CommentService.java`

```java
package com.linkedin.metadata.service;

import com.linkedin.common.urn.Urn;
import com.linkedin.entity.client.SystemEntityClient;
import com.linkedin.metadata.Constants;
import com.linkedin.metadata.resource.ResourceReference;
import com.linkedin.comment.Comment;
import com.linkedin.comment.CommentArray;
import com.linkedin.comment.Comments;
import com.linkedin.mxe.MetadataChangeProposal;
import io.datahubproject.metadata.context.OperationContext;
import lombok.extern.slf4j.Slf4j;

import javax.annotation.Nonnull;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
public class CommentService extends BaseService {

    public CommentService(@Nonnull SystemEntityClient entityClient) {
        super(entityClient);
    }

    /**
     * 为资源添加评论
     */
    public void addComment(
        @Nonnull OperationContext opContext,
        @Nonnull ResourceReference resource,
        @Nonnull String commentText,
        @Nonnull Urn author
    ) {
        log.info("Adding comment to resource: {}", resource.getUrn());

        try {
            MetadataChangeProposal proposal = buildAddCommentProposal(
                opContext,
                resource,
                commentText,
                author
            );
            _entityClient.ingestProposal(opContext, proposal, false);
        } catch (Exception e) {
            throw new RuntimeException(
                String.format("Failed to add comment to resource %s", resource.getUrn()),
                e
            );
        }
    }

    /**
     * 批量获取资源的评论
     */
    public Map<Urn, Comments> getComments(
        @Nonnull OperationContext opContext,
        @Nonnull Set<Urn> urns
    ) {
        return getAspects(
            opContext,
            urns,
            Constants.COMMENTS_ASPECT_NAME,
            new Comments()
        );
    }

    /**
     * 构建添加评论的 MCP
     */
    private MetadataChangeProposal buildAddCommentProposal(
        @Nonnull OperationContext opContext,
        @Nonnull ResourceReference resource,
        @Nonnull String commentText,
        @Nonnull Urn author
    ) {
        // 获取现有评论
        Map<Urn, Comments> commentsMap = getComments(
            opContext,
            Set.of(resource.getUrn())
        );

        Comments comments = commentsMap.getOrDefault(
            resource.getUrn(),
            new Comments()
        );

        // 初始化评论数组
        if (!comments.hasComments()) {
            comments.setComments(new CommentArray());
        }

        // 创建新评论
        Comment newComment = new Comment();
        newComment.setContent(commentText);
        newComment.setAuthor(author);
        newComment.setCreatedAt(System.currentTimeMillis());

        // 添加到评论列表
        comments.getComments().add(newComment);

        // 构建 MCP
        return buildMetadataChangeProposal(
            resource.getUrn(),
            Constants.COMMENTS_ASPECT_NAME,
            comments
        );
    }
}
```

### 步骤 2: 注册为 Spring Bean

**文件**: `metadata-service/factories/src/main/java/com/linkedin/gms/factory/config/ServiceFactoryConfig.java`

```java
@Configuration
public class ServiceFactoryConfig {

    // ... 其他 Bean 配置

    @Bean
    public CommentService commentService(
        @Nonnull final SystemEntityClient entityClient
    ) {
        return new CommentService(entityClient);
    }
}
```

### 步骤 3: 添加单元测试

**文件**: `metadata-service/services/src/test/java/com/linkedin/metadata/service/CommentServiceTest.java`

```java
package com.linkedin.metadata.service;

import com.linkedin.common.urn.Urn;
import com.linkedin.common.urn.UrnUtils;
import com.linkedin.entity.EntityResponse;
import com.linkedin.entity.client.SystemEntityClient;
import com.linkedin.metadata.resource.ResourceReference;
import io.datahubproject.metadata.context.OperationContext;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class CommentServiceTest {

    private SystemEntityClient mockClient;
    private CommentService commentService;
    private OperationContext opContext;

    @BeforeMethod
    public void setup() {
        mockClient = mock(SystemEntityClient.class);
        commentService = new CommentService(mockClient);
        opContext = mock(OperationContext.class);
    }

    @Test
    public void testAddComment() throws Exception {
        // 准备数据
        Urn entityUrn = UrnUtils.getUrn("urn:li:dataset:(urn:li:dataPlatform:hive,test,PROD)");
        Urn author = UrnUtils.getUrn("urn:li:corpuser:test_user");
        ResourceReference resource = new ResourceReference().setUrn(entityUrn);

        // Mock: 返回空的 Comments Aspect
        when(mockClient.getV2(any(), any(), any(), any()))
            .thenReturn(null);

        // 执行
        commentService.addComment(opContext, resource, "Great dataset!", author);

        // 验证
        verify(mockClient, times(1)).ingestProposal(
            eq(opContext),
            any(),
            eq(false)
        );
    }
}
```

### 步骤 4: 集成到 GraphQL (可选)

**文件**: `datahub-graphql-core/src/main/java/com/datahub/graphql/resolvers/comment/AddCommentResolver.java`

```java
@Component
public class AddCommentResolver implements DataFetcher<Boolean> {

    private final CommentService commentService;

    @Autowired
    public AddCommentResolver(CommentService commentService) {
        this.commentService = commentService;
    }

    @Override
    public Boolean get(DataFetchingEnvironment environment) {
        // 解析输入
        String resourceUrn = environment.getArgument("resourceUrn");
        String commentText = environment.getArgument("comment");

        OperationContext opContext = ((QueryContext) environment.getContext())
            .getOperationContext();
        Urn author = opContext.getActorUrn();

        // 调用服务
        ResourceReference resource = new ResourceReference()
            .setUrn(UrnUtils.getUrn(resourceUrn));

        commentService.addComment(opContext, resource, commentText, author);

        return true;
    }
}
```

---

## 添加新 API 端点

### GraphQL API

#### 1. 定义 Schema

**文件**: `datahub-graphql-core/src/main/resources/entity.graphql`

```graphql
extend type Mutation {
  """
  为实体添加评论
  """
  addComment(
    resourceUrn: String!
    comment: String!
  ): Boolean!

  """
  删除评论
  """
  removeComment(
    resourceUrn: String!
    commentId: String!
  ): Boolean!
}

extend type Query {
  """
  获取实体的所有评论
  """
  getComments(
    resourceUrn: String!
  ): [Comment!]!
}

type Comment {
  id: String!
  content: String!
  author: CorpUser!
  createdAt: Long!
}
```

#### 2. 实现 Resolver

见上面的 `AddCommentResolver` 示例。

#### 3. 注册 Resolver

**文件**: `datahub-graphql-core/src/main/java/com/datahub/graphql/GmsGraphQLEngine.java`

```java
private void configureMutationResolvers(final RuntimeWiring.Builder builder) {
    builder.type("Mutation", typeWiring -> typeWiring
        // ... 其他 Resolver
        .dataFetcher("addComment", new AddCommentResolver(commentService))
        .dataFetcher("removeComment", new RemoveCommentResolver(commentService))
    );
}
```

---

### OpenAPI (REST) 端点

#### 1. 创建 Controller

**文件**: `metadata-service/openapi-servlet/src/main/java/io/datahubproject/openapi/v1/comments/CommentsController.java`

```java
package io.datahubproject.openapi.v1.comments;

import com.linkedin.common.urn.Urn;
import com.linkedin.common.urn.UrnUtils;
import com.linkedin.metadata.resource.ResourceReference;
import com.linkedin.metadata.service.CommentService;
import io.datahubproject.metadata.context.OperationContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/comments")
@Tag(name = "Comments", description = "Comment management APIs")
@RequiredArgsConstructor
public class CommentsController {

    private final CommentService commentService;
    private final OperationContext systemOperationContext;

    @PostMapping
    @Operation(summary = "Add a comment to a resource")
    public ResponseEntity<Void> addComment(
        @RequestBody AddCommentRequest request
    ) {
        Urn resourceUrn = UrnUtils.getUrn(request.getResourceUrn());
        Urn author = systemOperationContext.getActorUrn();

        ResourceReference resource = new ResourceReference()
            .setUrn(resourceUrn);

        commentService.addComment(
            systemOperationContext,
            resource,
            request.getComment(),
            author
        );

        return ResponseEntity.ok().build();
    }

    @GetMapping("/{urn}")
    @Operation(summary = "Get comments for a resource")
    public ResponseEntity<CommentsResponse> getComments(
        @PathVariable String urn
    ) {
        // 实现获取评论逻辑
        return ResponseEntity.ok(new CommentsResponse());
    }
}
```

#### 2. 定义 DTO

```java
@Data
public class AddCommentRequest {
    private String resourceUrn;
    private String comment;
}

@Data
public class CommentsResponse {
    private List<CommentDto> comments;
}

@Data
public class CommentDto {
    private String id;
    private String content;
    private String author;
    private Long createdAt;
}
```

---

## Aspect Validator 开发

AspectPayloadValidator 用于在 Aspect 写入前进行验证,确保数据一致性和业务规则。

### 关键概念

- **位置**: `metadata-io/src/main/java/com/linkedin/metadata/aspect/validation/`
- **触发时机**: 在 EntityService 写入 Aspect 前
- **注册方式**: Spring Bean,自动发现
- **重要**: 验证必须跨所有 API 工作(GraphQL, OpenAPI, Rest.li)

### 示例:策略字段类型验证器

**场景**: 验证 DataHubPolicyInfo 的 privileges 字段只包含有效值。

**文件**: `metadata-io/src/main/java/com/linkedin/metadata/aspect/validation/PolicyFieldTypeValidator.java`

```java
package com.linkedin.metadata.aspect.validation;

import com.linkedin.common.urn.Urn;
import com.linkedin.data.template.RecordTemplate;
import com.linkedin.metadata.aspect.AspectRetriever;
import com.linkedin.metadata.aspect.plugins.validation.AspectPayloadValidator;
import com.linkedin.metadata.aspect.plugins.validation.AspectValidationException;
import com.linkedin.metadata.aspect.plugins.validation.ValidationExceptionCollection;
import com.linkedin.policy.DataHubPolicyInfo;
import io.datahubproject.metadata.context.OperationContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.annotation.Nonnull;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Component
public class PolicyFieldTypeValidator extends AspectPayloadValidator {

    private static final Set<String> VALID_PRIVILEGES = Set.of(
        "VIEW_ENTITY",
        "EDIT_ENTITY",
        "DELETE_ENTITY",
        "MANAGE_POLICIES",
        "MANAGE_TOKENS"
    );

    @Override
    protected Stream<AspectValidationException> validateProposedAspect(
        @Nonnull OperationContext opContext,
        @Nonnull Urn entityUrn,
        @Nonnull RecordTemplate aspect,
        @Nonnull AspectRetriever aspectRetriever
    ) {
        // 仅验证 DataHubPolicyInfo
        if (!(aspect instanceof DataHubPolicyInfo)) {
            return Stream.empty();
        }

        DataHubPolicyInfo policyInfo = (DataHubPolicyInfo) aspect;

        // 验证 privileges 字段
        if (policyInfo.hasPrivileges()) {
            Set<String> invalidPrivileges = policyInfo.getPrivileges().stream()
                .filter(priv -> !VALID_PRIVILEGES.contains(priv))
                .collect(Collectors.toSet());

            if (!invalidPrivileges.isEmpty()) {
                return Stream.of(AspectValidationException.forItem(
                    entityUrn,
                    aspect.getClass().getSimpleName(),
                    String.format(
                        "Invalid privileges found: %s. Valid privileges are: %s",
                        invalidPrivileges,
                        VALID_PRIVILEGES
                    )
                ));
            }
        }

        return Stream.empty();
    }

    @Override
    protected Stream<AspectValidationException> validatePreCommitAspect(
        @Nonnull OperationContext opContext,
        @Nonnull Urn entityUrn,
        @Nonnull RecordTemplate aspect,
        @Nonnull AspectRetriever aspectRetriever
    ) {
        // PreCommit 验证(可选)
        return Stream.empty();
    }

    @Override
    public boolean shouldApply(
        @Nonnull String entityName,
        @Nonnull String aspectName
    ) {
        // 仅应用于 DataHubPolicy 实体的 dataHubPolicyInfo Aspect
        return "dataHubPolicy".equals(entityName)
            && "dataHubPolicyInfo".equals(aspectName);
    }
}
```

### Validator 生命周期

```
1. 接收 MCP (MetadataChangeProposal)
   ↓
2. 调用 shouldApply() - 决定是否应用此 Validator
   ↓
3. 调用 validateProposedAspect() - 提案阶段验证
   ↓
4. 如果通过,准备写入
   ↓
5. 调用 validatePreCommitAspect() - 提交前验证
   ↓
6. 如果全部通过,写入数据库
```

### 注册 Validator

Validator 必须注册为 Spring Bean:

**文件**: `metadata-io/src/main/java/com/linkedin/metadata/aspect/plugins/spring/SpringStandardPluginConfiguration.java`

```java
@Configuration
public class SpringStandardPluginConfiguration {

    @Bean
    public PolicyFieldTypeValidator policyFieldTypeValidator() {
        return new PolicyFieldTypeValidator();
    }

    // ... 其他 Validator
}
```

### 测试 Validator

```java
@Test
public void testInvalidPrivileges() {
    PolicyFieldTypeValidator validator = new PolicyFieldTypeValidator();
    OperationContext opContext = mock(OperationContext.class);
    Urn policyUrn = UrnUtils.getUrn("urn:li:dataHubPolicy:test");

    DataHubPolicyInfo policyInfo = new DataHubPolicyInfo();
    policyInfo.setPrivileges(new StringArray("INVALID_PRIVILEGE"));

    // 执行验证
    Stream<AspectValidationException> errors = validator.validateProposedAspect(
        opContext,
        policyUrn,
        policyInfo,
        mock(AspectRetriever.class)
    );

    // 应该有一个错误
    assertEquals(errors.count(), 1);
}
```

---

## 测试指南

### 单元测试

**位置**: `src/test/java/` 目录

**框架**: TestNG (传统) 或 JUnit Jupiter (新代码)

**运行**:
```bash
./gradlew :metadata-service:services:test
```

#### 编写单元测试

```java
import org.testng.annotations.Test;
import static org.testng.Assert.*;
import static org.mockito.Mockito.*;

public class MyServiceTest {

    @Test
    public void testServiceMethod() {
        // Arrange (准备)
        MyService service = new MyService(mockDependency);
        Input input = new Input();

        // Act (执行)
        Result result = service.process(input);

        // Assert (断言)
        assertNotNull(result);
        assertEquals(result.getValue(), "expected");
        verify(mockDependency).someMethod();
    }
}
```

### 集成测试

**位置**: `metadata-integration/` 模块

**运行**:
```bash
./gradlew :metadata-integration:java:datahub-client:integrationTest
```

### Smoke 测试

**位置**: `smoke-test/` 目录

**运行**:
```bash
cd smoke-test
./run-quickstart.sh
pytest tests/
```

---

## 代码规范

### 格式化

使用 Spotless 自动格式化代码:

```bash
# 格式化 Java 代码
./gradlew spotlessApply

# 检查格式
./gradlew spotlessCheck
```

### 验证代码变更

提交代码前**必须**运行:

```bash
# Java 代码
./gradlew :metadata-service:war:build
./gradlew :metadata-service:services:test

# Python 代码
./gradlew :metadata-ingestion:lintFix
./gradlew :metadata-ingestion:testQuick
```

### 提交消息

遵循 Conventional Commits 格式:

```
feat(lineage): add DataJob downstream lineage support
fix(search): resolve NPE in scroll API
docs(readme): update quickstart guide
test(service): add CommentService unit tests
```

---

## 常见问题

### Q1: 如何调试 GMS?

```bash
# 启动调试模式
./gradlew :metadata-service:war:run --debug-jvm

# 在 IDE 中连接 Remote JVM Debug 到 localhost:5005
```

### Q2: 如何重新生成 Avro 类?

```bash
./gradlew :metadata-models:generateAvroSchema
```

### Q3: 如何清理构建缓存?

```bash
./gradlew clean
rm -rf ~/.gradle/caches/
```

### Q4: 如何添加新的配置参数?

1. 在 `DataHubAppConfiguration.java` 中添加字段:
   ```java
   private MyFeatureConfiguration myFeature;
   ```

2. 创建配置类:
   ```java
   @Data
   public class MyFeatureConfiguration {
       private Boolean enabled = false;
       private Integer maxLimit = 100;
   }
   ```

3. 在 `application.yml` 中配置:
   ```yaml
   myFeature:
     enabled: true
     maxLimit: 200
   ```

### Q5: 如何查看生成的 GraphQL Schema?

```bash
# 运行 GMS
./gradlew :metadata-service:war:run

# 访问 GraphiQL,在 Docs 面板查看
open http://localhost:8080/api/graphiql
```

### Q6: 如何测试新增的 Validator?

编写单元测试,确保:
1. 有效数据通过验证
2. 无效数据被拒绝
3. shouldApply() 正确过滤

---

## 参考资源

- [DataHub 开发者指南](https://datahubproject.io/docs/developers)
- [元数据模型文档](https://datahubproject.io/docs/modeling/metadata-model)
- [贡献指南](https://github.com/datahub-project/datahub/blob/master/CONTRIBUTING.md)
- [Slack 社区](https://datahubspace.slack.com/)

---

## 下一步

- 阅读 [GraphQL API 文档](api/graphql-api.md)
- 了解 [Aspect 模型](https://datahubproject.io/docs/modeling/metadata-model)
- 查看 [现有服务实现](services/)
