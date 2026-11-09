# 出门啦 · 周末城市探索指南

**[打开公开作品 →](https://leiqingliang.github.io/weekend-city-guide/)**

[![Deploy to GitHub Pages](https://github.com/LeiQingliang/weekend-city-guide/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/LeiQingliang/weekend-city-guide/actions/workflows/deploy-pages.yml)

面向大学生的周末探索交互雏形，也是一次 AI Coding 产品设计练习。先给出一份看得懂的周末提案，再把偏好、全天花费、可用时间和天气，落实到能调整、能分享的城市计划。

[90 秒体验路线](docs/SHOWCASE.md) · [产品设计说明](docs/PRODUCT.md) · [验证记录](docs/VERIFICATION.md) · [代码仓库](https://github.com/LeiQingliang/weekend-city-guide)

## V3：从「去哪玩」，到「一起出发」

打开首页即可看到具体活动组合、预计时长和**含餐饮交通预留的人均费用**。点“定制我的周末”，经过“选心情 → 定预算 → 留时间”，比较最多两份方案，再决定采用。也可以先点“90 秒体验”，用临时示例计划走过雨天调整、分享和打卡；退出导览或刷新后回到原有本机记录。

| 环节 | 已实现能力 |
| --- | --- |
| 少做选择 | 首页晴天提案与主题入口；三步定制最多两份不同活动组合，说明推荐理由、费用、时间和取舍 |
| 条件真正生效 | 定制同时约束城市、全天预算、可用时间和雨天室内条件；兴趣优先排序，同行人数轻量影响排序并计算同行总额 |
| 自己找灵感 | 一句话解析常用的城市、兴趣、人数、预算与天气表达；活动筛选、收藏、搜索及推荐理由 |
| 看天气 | Open-Meteo 每日预报、日期选择、30 分钟缓存；限流、断网和预报范围外均有明确提示，可切换手动天气情景 |
| 排计划 | 日期与开始时间、活动顺序调整；活动＋餐饮＋交通的人均及同行总费用、超预算提醒；空计划直接进入定制 |
| 应对变化 | 雨天替代保留已有室内活动，按预算和时长寻找替换；确认前展示新费用与时间，不可行时保留原计划 |
| 一起出发 | 计划页直接约搭子、分享和打卡；本机小队创建、加入、退出和邀请；打卡整理为可编辑攻略草稿，保存后分享 |
| 带走与保存 | 行程分享快照先预览再载入；导出 `.ics` 日历与文字行程；本机记录持久化、JSON 备份及确认恢复 |
| 快速体验 | 产品导览与临时示例计划；体验中的记录不写入原有本机数据，退出或刷新后恢复正常使用 |

## 界面预览

| 桌面：具体提案与完整费用 | 手机：首屏即可开始 |
| --- | --- |
| ![桌面提案首页](docs/images/plan.jpg) | ![手机提案首页](docs/images/mobile.jpg) |

以上为实际运行页面截图。

## 数据与能力边界

- **活动是示例。** 支持上海、杭州、北京；活动、票价和场次用于展示设计，不提供真实预约、售票或支付。图片只表达场景氛围，首页城市图为 AI 生成概念图。
- **天气有来源。** 联网模式请求 [Open-Meteo](https://open-meteo.com/en/docs) 的城市参考位置预报，不读取设备定位。只有成功取得数据才展示联网预报；情景模式明确标记。免费接口可能限流，不能保证持续可用。
- **推荐和排程使用本地规则。** 未调用大模型。条件过严时可以只有一份方案或没有结果，不自动放宽预算、时长或雨天约束。同行人数影响偏好排序，不代表场地容量或余票。
- **费用和时间是估算。** 餐饮交通采用可调整的预留值；转场统一预留 25 分钟，演出不早于 19:00，仅作规划示例。尚未自动安排用餐时间，也未接入实时地图、营业时段或真实场次。
- **记录保存在当前浏览器。** 无账号、业务后台或跨设备报名同步；小队人数为本机模拟。清除浏览器数据会删除记录，可先导出备份。
- **分享的是内容快照。** 行程、邀请和攻略写入链接的 `#` 片段，由接收者浏览器读取。链接可被转发，内容不加密；修改或删除本机内容不会撤回已经分享的快照。

## 本地运行与检查

Node.js **22.13+**，React + TypeScript + Vite。

```bash
npm ci
npm run dev
```

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

测试覆盖定制方案的约束与排序、需求解析、排程与预算、分享数据、日历、天气校验与回退、本机记录清理等关键逻辑。具体运行结果见上方 Actions；单元测试不替代浏览器交互和公开访问检查。

## 固定地址与发布

推送到 `main` 后，由 GitHub Actions 构建、测试并发布 GitHub Pages。后续迭代继续使用同一地址：

**https://leiqingliang.github.io/weekend-city-guide/**

请保留 GitHub 用户名 `LeiQingliang`、仓库名 `weekend-city-guide` 及 Vite `base: "/weekend-city-guide/"`，不要通过另建站点或改名替换提交链接。维护约定见 [AGENTS.md](AGENTS.md)。

图片来源见 [credits.txt](public/images/credits.txt)。天气数据由 Open-Meteo 提供，页面保留 [CC BY 4.0](https://open-meteo.com/en/licence) 署名链接；接口使用条件见 [官方说明](https://open-meteo.com/en/terms)。
