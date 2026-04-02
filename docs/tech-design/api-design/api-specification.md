# API设计规范

## 1. API设计原则

### 1.1 RESTful设计原则
- **资源导向**: 以资源为中心设计API
- **统一接口**: 标准HTTP方法使用
- **无状态**: 每个请求包含所有必要信息
- **可缓存**: 合理使用HTTP缓存机制

### 1.2 HTTP方法规范
| 方法 | 用途 | 幂等性 | 安全性 |
|------|------|--------|--------|
| GET | 获取资源 | 是 | 是 |
| POST | 创建资源 | 否 | 否 |
| PUT | 全量更新 | 是 | 否 |
| PATCH | 部分更新 | 是 | 否 |
| DELETE | 删除资源 | 是 | 否 |

### 1.3 状态码规范
- **2xx**: 成功
  - 200: 成功
  - 201: 创建成功
  - 204: 删除成功
- **4xx**: 客户端错误
  - 400: 请求错误
  - 401: 未认证
  - 403: 无权限
  - 404: 资源不存在
  - 422: 参数校验失败
  - 429: 请求过频
- **5xx**: 服务端错误
  - 500: 服务器错误
  - 502: 网关错误
  - 503: 服务不可用

## 2. API版本管理

### 2.1 版本控制策略
```
# URL路径版本控制 (推荐)
https://api.promotionai.com/v1/users
https://api.promotionai.com/v2/users

# Header版本控制 (备选)
Accept: application/vnd.promotionai.v1+json
```

### 2.2 版本生命周期
- **Active**: 正常使用
- **Deprecated**: 已废弃，但仍可用
- **Inactive**: 已停用

## 3. 请求响应格式

### 3.1 通用响应格式
```json
{
  "success": true,
  "code": 0,
  "message": "请求成功",
  "data": {
    // 业务数据
  },
  "timestamp": "2026-03-29T10:00:00.000Z",
  "trace_id": "req_abc123def456"
}
```

### 3.2 错误响应格式
```json
{
  "success": false,
  "code": 400001,
  "message": "参数错误",
  "error": {
    "code": "INVALID_PARAM",
    "details": {
      "field": "username",
      "reason": "用户名不能为空"
    }
  },
  "timestamp": "2026-03-29T10:00:00.000Z",
  "trace_id": "req_abc123def456"
}
```

### 3.3 分页响应格式
```json
{
  "success": true,
  "code": 0,
  "message": "请求成功",
  "data": {
    "list": [...],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5
    }
  },
  "timestamp": "2026-03-29T10:00:00.000Z",
  "trace_id": "req_abc123def456"
}
```

## 4. 认证授权

### 4.1 JWT认证
```
# 请求头
Authorization: Bearer <jwt_token>

# JWT Payload
{
  "sub": "user_id",
  "username": "username",
  "roles": ["user", "admin"],
  "permissions": ["user:read", "user:write"],
  "exp": 1711724400,
  "iat": 1711720800
}
```

### 4.2 权限控制
- **RBAC**: 基于角色的访问控制
- **ABAC**: 基于属性的访问控制
- **ACL**: 访问控制列表

## 5. API安全

### 5.1 输入验证
- **字段验证**: 类型、长度、格式
- **业务验证**: 业务逻辑校验
- **安全验证**: 防注入、防XSS

### 5.2 限流策略
```
# 基于IP限流
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200

# 基于用户限流
X-UserRateLimit-Limit: 100
X-UserRateLimit-Remaining: 99
```

### 5.3 CORS配置
```javascript
{
  "origin": ["https://promotionai.com", "https://admin.promotionai.com"],
  "methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
  "allowedHeaders": ["Content-Type", "Authorization", "X-Requested-With"],
  "credentials": true
}
```

## 6. API文档规范

### 6.1 OpenAPI 3.0规范
```yaml
openapi: 3.0.0
info:
  title: PromotionAI API
  version: 1.0.0
  description: PromotionAI系统API文档

servers:
  - url: https://api.promotionai.com/v1
    description: 生产环境

paths:
  /users:
    get:
      summary: 获取用户列表
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: page_size
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserListResponse'
```

### 6.2 接口示例

#### 6.2.1 用户管理接口
```
# 获取用户列表
GET /v1/users?page=1&page_size=20&status=active

# 创建用户
POST /v1/users
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}

# 更新用户
PUT /v1/users/{id}
{
  "username": "updated_username",
  "email": "updated@example.com"
}

# 删除用户
DELETE /v1/users/{id}
```

#### 6.2.2 内容管理接口
```
# 获取内容列表
GET /v1/contents?type=financial&status=published&page=1&page_size=20

# 创建内容
POST /v1/contents
{
  "title": "理财资讯标题",
  "content": "内容详情",
  "type": "financial",
  "tags": ["理财", "基金"],
  "channels": ["douyin", "xiaohongshu"]
}

# 发布内容
POST /v1/contents/{id}/publish
{
  "channels": ["douyin", "weibo"]
}
```

## 7. API性能优化

### 7.1 缓存策略
- **HTTP缓存**: ETag, Last-Modified
- **应用缓存**: Redis缓存
- **CDN缓存**: 静态资源加速

### 7.2 数据压缩
- **Gzip压缩**: 响应数据压缩
- **图片优化**: WebP格式、懒加载
- **分页查询**: 避免大数据量返回

### 7.3 异步处理
- **消息队列**: 耗时操作异步处理
- **事件驱动**: 基于事件的异步通信
- **批量处理**: 批量操作优化性能

## 8. API监控

### 8.1 关键指标
- **响应时间**: P50, P95, P99
- **错误率**: HTTP错误率
- **吞吐量**: QPS, TPS
- **可用性**: 服务可用率

### 8.2 监控告警
- **响应时间告警**: P95 > 1s
- **错误率告警**: 错误率 > 1%
- **可用性告警**: 可用率 < 99%
- **容量告警**: 连接数 > 80%

---