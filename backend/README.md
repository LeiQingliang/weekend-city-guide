# 可选的意图整理接口

这是独立的 Node.js 22 服务，仅将一句话整理为可核对的条件修改建议。它不生成活动、不订票、不付款、不发送消息，也不读取或修改浏览器计划。前端继续用有来源的地点目录和约束规则生成方案，由用户确认采用。

当前提供源码、模拟测试与一条本地真实调用记录；尚未公开部署。真实模型调用、云部署和公开页面接通分别验证。公开静态站的模式以 [README 当前运行模式](../README.md#当前运行模式)为准。GitHub Pages 不能运行此服务，未配置接口时保留本地解析和手动核对。

## 运行

无生产依赖。由运行环境安全注入 `DEEPSEEK_API_KEY`，不要写入代码、前端 `VITE_` 变量、截图或命令历史。没有密钥也可启动，健康检查返回 `configured: false`，意图请求返回 503。

```bash
node backend/server.mjs
node --test backend/server.test.mjs
```

默认监听 `127.0.0.1:8787`，可用 `HOST`、`PORT` 配置。云容器通常需要 `HOST=0.0.0.0` 并由平台提供 HTTPS。应部署单实例：当前额度保存在进程内，重启清零，多实例不会共享额度；如需正式运营，先接持久化共享限流与监测，不能把此实现当作抗滥用认证系统。

应用不记录密钥、请求正文、模型正文或原始上游错误；主机与代理日志需要部署者另行检查。模型调用会把本轮文字、出行条件与待核对要求发送给 DeepSeek，前端应在启用前说明，避免输入个人联系方式或私密内容。

## 接到固定公开页面

先部署后端并验证 HTTPS、限流和实际请求，再在仓库的 Actions Variables 中设置 `INTENT_API_URL` 为完整的 `https://你的后端域名/api/intent`。`Verify preview` 会将这个公开地址传入 `VITE_INTENT_API_URL`；按 [原发布流程](../docs/DEPLOYMENT.md)重新构建、验收并更新 Pages 即可。作品网址保持不变。地址不能含账号、密码或查询参数；不要把密钥放入任何前端变量或仓库变量。

本地联调可用 `VITE_INTENT_API_URL=http://127.0.0.1:8787/api/intent` 启动前端。未配置、地址格式不合要求时继续使用本地模式；请求失败或输出未通过校验时，页面明确提示已回退本地规则，保留未知要求和用户确认。仅配置地址不代表部署验证成功。

## 客户端契约

`POST /api/intent`，`Content-Type: application/json`，请求体最多 **8 KB**，`message` 最多 **300 个 Unicode 字符**。浏览器来源只允许 `https://leiqingliang.github.io` 与 `http://127.0.0.1[:port]`；不允许任意 GitHub Pages 站点、`localhost` 或通配来源。非浏览器验证也需要显式发送允许的 `Origin`。不使用 Cookie，不接收浏览器提供的 API Key。

```json
{
  "message": "预算改为80元，只去室内",
  "base": {
    "city": "上海",
    "date": "2026-11-14",
    "startTime": "10:00",
    "budget": 150,
    "people": 2,
    "maxDurationMinutes": 300,
    "weather": "多云",
    "mealBudget": 30,
    "transportBudget": 15,
    "interests": ["展览"],
    "excludedInterests": [],
    "indoorOnly": false,
    "pace": "balanced"
  },
  "unresolved": ["返校时间需要自行核对"]
}
```

`base` 是完整 `WeekendBrief`，`pace` 为 `relaxed` 或 `balanced`；`excludedInterests`、`indoorOnly` 可缺省。所有字段做白名单校验；全天预算为有限的 0–100000 数字，餐饮和交通各 0–10000，人数 1–12，时长为 60–720 整数，日期和时间必须有效。`unresolved` 可选，最多16条、每条300字，用于带上之前尚未覆盖的要求；服务端合并保留，模型不能自行删掉。响应最多32条、每条300字，原始未知要求不静默截断。

成功 200，仅返回下列结构。这里只是形状示例，不是真实模型验证结果：

```json
{
  "patch": { "budget": 80, "indoorOnly": true },
  "unresolved": ["返校时间需要自行核对"],
  "summary": "已整理 2 项条件修改建议，另有 1 项要求待核对。"
}
```

`patch` 仅允许 `city/date/startTime/budget/people/maxDurationMinutes/weather/mealBudget/transportBudget/interests/excludedInterests/indoorOnly`；只含有变化的字段，不能写活动 ID、票价事实或预订状态。模型提出未知字段时转为待核对提示，不合规已知字段、过往日期或截断输出则整轮拒绝。摘要由服务端生成，不能采用模型声称已订票或付款的自由文本。服务端校验结构和值域，不能证明模型正确理解每句话；客户端仍须核对差异、保留未知要求、支持撤销，并由用户确认采用。

客户端将有效 patch 合并到草稿，继续调用本地推荐引擎；服务端不会自动确认或写入正式计划。无 patch 的回复也可能有待核对要求，不能当成成功满足。取消、失败或响应过时都不应覆盖当前草稿；已有未覆盖要求也应在客户端保留。需要用户明确处理的旧要求，不靠模型自行清除。

错误形状为 `{ "error": { "code": "…", "message": "…" } }`：

| HTTP | 场景 | 客户端处理 |
| --- | --- | --- |
| 400 / 413 / 415 | 输入格式、字段、正文大小或类型不符 | 保留草稿并提示核对输入 |
| 403 | 来源或预检不允许 | 检查部署来源，不重试绕过 |
| 422 | 请求代为订票、支付等真实动作 | 明确未执行，不自动降级为已完成 |
| 429 | 当前额度用完 | 显示限制，提供本地解析；响应含 Retry-After |
| 503 | 未配置或并发已满 | 保留草稿，可用本地解析 |
| 502 / 504 | 模型不可用、输出无效或超时 | 不采用部分输出，明确回退入口 |

`GET /health` 仅返回 `{ "configured": true|false }`；可供无 Origin 的部署探针调用，不暴露密钥、模型正文或账户情况。configured 只说明环境变量非空，不代表真实调用已经成功。

## 上游与限制

固定请求 `https://api.deepseek.com/chat/completions`，不接受用户提供的模型地址或重定向；固定 `deepseek-flash`、`max_tokens: 800`、`thinking: { type: "disabled" }`、`response_format: { type: "json_object" }`。这些参数来自 [DeepSeek Chat Completions 官方文档](https://api-docs.deepseek.com/api/create-chat-completion/)。[JSON Output 文档](https://api-docs.deepseek.com/guides/json_mode/)提示 JSON 可能为空或被截断，因此本服务还会检查结束原因、内容、结构和值域，不直接信任格式声明。

调用超时 **20 秒**，上游响应最多 32 KB；每进程每天最多 **100 次模型尝试**（北京时间零点重置），每个连接来源 IP 滚动一小时最多 **10 次**，最多 **2 个并发模型请求**。上游失败也消耗尝试额度；输入不合法、未配置与并发拒绝不消耗模型次数。不自动重试，以免扩大消耗。

不信任客户端 `X-Forwarded-For`。经反向代理部署时，当前版本会按代理连接 IP 共享每小时额度，限制更保守；在核验平台可信代理链前不要启用任意转发头。CORS 不是身份认证，非浏览器可伪造 Origin；公开运营需另行设计可信鉴权与防滥用。

## 验证层级

`server.test.mjs` 使用注入的模拟 `fetch` 和本地 HTTP 服务，覆盖参数、来源、字段与大小边界、未知条件保留、不合规输出、错误脱敏、超时和额度。它不会读真实密钥，也不会请求 DeepSeek。模拟通过不等于模型理解效果、云服务已部署或公开页面调用成功；真实调用由持有密钥的维护者单独记录。

2026-11-10，维护者通过本地 `start({ apiKey, port: 0 })` 完成一条真实链路：POST → DeepSeek flash → 前端 `modelRevision` 校验 → 本地推荐。HTTP 200，耗时 2725 ms；本次 API 返回总 token 715、输出 token 112。“我和另外两位同学”提取为3人，预算100元、180分钟、14:00，轮椅要求保留为待核对项，约束检查后得到两案。密钥仅在进程内使用。此记录来自维护者的实际调用报告，是单案例证据，不能推导总体理解准确率、上线状态或所有模型请求均可用。
