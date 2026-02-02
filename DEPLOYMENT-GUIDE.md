# GraphQL 代理部署指南

## ✅ 实现完成

已成功实现 Azuro SDK 的 GraphQL 请求代理，解决 Cloudflare Worker 环境中的 CORS 跨域问题。

## 📁 关键文件

1. **`worker-wrapper.js`** - Cloudflare Worker 自定义包装器
   - 拦截 `/api/graphql-proxy` 请求
   - 在 Worker 层面转发到第三方 GraphQL 端点
   - 绕过 CORS 限制

2. **`src/helpers/fetchPolyfill.ts`** - 客户端 fetch 拦截器
   - 拦截所有包含 `thegraph`、`onchainfeed.org`、`azuro` 的请求
   - 重定向到 `/api/graphql-proxy`

3. **`src/compositions/Providers/Providers.tsx`** - Polyfill 初始化
   - 在模块加载时立即初始化 polyfill

4. **`wrangler.jsonc`** - Cloudflare Worker 配置
   - 使用 `worker-wrapper.js` 作为入口点

## 🚀 部署步骤

### 1. 构建项目
```bash
npm run cf:build
```

### 2. 本地预览（可选）
```bash
npm run cf:preview
```

### 3. 部署到 Cloudflare
```bash
npm run cf:deploy
```

## 🔍 验证部署

部署后，打开浏览器开发者工具：

1. 打开 Network 标签
2. 访问你的应用
3. 查找 `/api/graphql-proxy` 请求
4. 确认请求成功返回数据（状态码 200）

## 📊 工作原理

```
客户端 (浏览器)
    ↓
    fetch('https://thegraph-1.onchainfeed.org/...')
    ↓
Fetch Polyfill 拦截
    ↓
    重定向到 /api/graphql-proxy
    ↓
Cloudflare Worker (worker-wrapper.js)
    ↓
    在服务端 fetch 真实 URL (无 CORS 限制)
    ↓
第三方 GraphQL 端点
    ↓
    返回数据
    ↓
Cloudflare Worker
    ↓
    转发响应
    ↓
客户端 SDK
    ↓
    接收数据，继续处理
```

## 🎯 优势

- ✅ **SDK 完全兼容** - 所有 Azuro SDK hooks 正常工作
- ✅ **类型安全** - 保留所有 TypeScript 类型
- ✅ **最小修改** - 只添加了代理层，不修改 SDK
- ✅ **透明转发** - SDK 不知道请求被代理了
- ✅ **性能优化** - 在 Worker 层面处理，速度快

## 🐛 故障排查

### 如果看到 530 错误：

1. 检查 Cloudflare Worker 日志
2. 确认 `worker-wrapper.js` 正确部署
3. 验证 `wrangler.jsonc` 配置正确

### 如果请求仍然直连第三方：

1. 检查浏览器控制台是否有 polyfill 初始化日志
2. 确认 `[Fetch Polyfill] ✅ Initialized` 消息出现
3. 清除浏览器缓存并刷新

### 查看 Worker 日志：

```bash
wrangler tail
```

或在 Cloudflare Dashboard:
- Workers & Pages → 你的 Worker → Logs

## 📝 配置代理域名

如需代理其他域名，编辑 `src/helpers/fetchPolyfill.ts`:

```typescript
const PROXY_DOMAINS = [
  'thegraph',
  'onchainfeed.org',
  'azuro',
  // 添加其他域名
  'your-domain.com',
]
```

然后重新构建和部署。

## 🔄 更新流程

当需要更新代码时：

```bash
# 1. 修改代码
# 2. 重新构建
npm run cf:build

# 3. 部署
npm run cf:deploy
```

## ⚠️ 注意事项

1. **Windows 兼容性** - OpenNext 在 Windows 上可能有问题，建议使用 WSL
2. **构建时间** - 首次构建可能需要较长时间
3. **环境变量** - 确保 `.env` 文件配置正确

## 📞 支持

如遇到问题，请检查：
1. Cloudflare Worker 日志
2. 浏览器控制台日志
3. Network 请求详情
