# GraphQL 代理解决方案

## 问题描述

在 Cloudflare Worker 环境中，Azuro SDK 在客户端浏览器中直接调用第三方 GraphQL 端点（如 `https://thegraph-1.onchainfeed.org/`），会遇到 CORS 跨域问题。

## 解决方案

使用**客户端 fetch polyfill + API 代理**的透明转发方案：

1. 在客户端拦截全局 `fetch` 函数
2. 检测到 GraphQL 请求时，重定向到我们的代理 API
3. 代理 API 在服务端转发请求到真实的第三方端点
4. SDK 的所有 hooks 和类型映射完全保留

## 实现文件

### 1. API 代理路由
**文件**: `src/app/api/graphql-proxy/route.ts`

- 接收客户端的 GraphQL 请求
- 从 `X-Original-URL` 头获取真实目标 URL
- 在服务端转发请求（无 CORS 限制）
- 返回原始响应给客户端

### 2. Fetch Polyfill
**文件**: `src/helpers/fetchPolyfill.ts`

- 拦截全局 `window.fetch`
- 检测包含 `thegraph`、`onchainfeed.org`、`azuro` 的 URL
- 重定向到 `/api/graphql-proxy`
- 添加 `X-Original-URL` 头告诉代理真实目标

### 3. 初始化
**文件**: `src/compositions/Providers/Providers.tsx`

- 在应用启动时调用 `initFetchPolyfill()`
- 仅在客户端执行

## 优点

✅ **SDK hooks 完全可用** - `useGames()`、`useBets()` 等所有 hooks 继续工作  
✅ **类型映射保留** - SDK 的所有类型转换和数据映射逻辑不受影响  
✅ **最小化修改** - 只添加了 3 个文件，不修改 SDK 源码  
✅ **透明转发** - SDK 完全不知道请求被代理了  
✅ **开发友好** - 本地开发也可以正常工作  

## 工作流程

```
客户端 SDK
    ↓ fetch('https://thegraph-1.onchainfeed.org/...')
Fetch Polyfill 拦截
    ↓ 重定向到 /api/graphql-proxy
    ↓ 添加 X-Original-URL 头
API 代理路由
    ↓ 在服务端 fetch 真实 URL
第三方 GraphQL 端点
    ↓ 返回数据
API 代理路由
    ↓ 转发响应
客户端 SDK
    ↓ 接收数据，继续处理
```

## 配置

如果需要代理其他域名，修改 `src/helpers/fetchPolyfill.ts` 中的 `PROXY_DOMAINS` 数组：

```typescript
const PROXY_DOMAINS = [
  'thegraph',
  'onchainfeed.org',
  'azuro',
  // 添加其他需要代理的域名
]
```

## 测试

1. 构建项目：`npm run cf:build`
2. 本地预览：`npm run cf:preview`
3. 打开浏览器控制台，应该看到：`[Fetch Polyfill] Initialized - GraphQL requests will be proxied`
4. 使用 SDK 的任何功能，检查网络请求是否通过 `/api/graphql-proxy`

## 部署

直接部署到 Cloudflare：

```bash
npm run cf:deploy
```

代理会自动在 Worker 环境中工作。
