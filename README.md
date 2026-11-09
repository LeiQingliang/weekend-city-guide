# 出门啦 · 周末城市探索指南

**[打开公开作品 →](https://leiqingliang.github.io/weekend-city-guide/)**

[![Deploy to GitHub Pages](https://github.com/LeiQingliang/weekend-city-guide/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/LeiQingliang/weekend-city-guide/actions/workflows/deploy-pages.yml)

面向大学生的周末探索交互雏形。把“去哪玩”的想法，变成有推荐理由、时间安排、预算和同行邀请的一份城市计划。

[三分钟体验路线](docs/SHOWCASE.md) · [产品设计说明](docs/PRODUCT.md) · [验证记录](docs/VERIFICATION.md) · [代码仓库](https://github.com/LeiQingliang/weekend-city-guide)

## V2 可以体验

| 环节 | 已实现能力 |
| --- | --- |
| 找灵感 | 一句话解析常用的城市、兴趣、人数、预算与天气表达；三城筛选、收藏、搜索及推荐理由 |
| 看天气 | Open-Meteo 每日预报、日期选择、30 分钟缓存；限流、断网和预报范围外均有明确提示，可切换天气情景 |
| 排计划 | 半日建议、日期与开始时间、活动顺序调整；活动＋餐饮＋交通的人均及同行总费用、超预算提醒 |
| 应对变化 | 雨天提醒；确认后替换或移除户外活动，重新计算时间和费用 |
| 带走计划 | 分享行程快照、预览后载入；导出 `.ics` 日历与文字行程 |
| 同行与记录 | 本机小队创建、加入、退出和邀请；照片打卡；攻略创建、编辑、删除与分享 |
| 保存数据 | 本机记录持久化、JSON 备份与确认恢复，导入内容校验与清理 |

## 界面预览

| 桌面：排程与完整费用 | 手机：发现与灵感 |
| --- | --- |
| ![桌面行程页面](docs/images/plan.jpg) | ![手机发现页面](docs/images/mobile.jpg) |

以上为实际运行页面截图。

## 数据与能力边界

- **活动是示例。** 活动、票价和场次用于展示设计，不提供真实预约、售票或支付。图片只表达场景氛围。
- **天气有来源。** 联网模式请求 [Open-Meteo](https://open-meteo.com/en/docs) 的城市参考位置预报，不读取设备定位。只有成功取得数据才展示联网预报；情景模式明确标记。免费接口可能限流，不能保证持续可用。
- **推荐和排程使用本地规则。** 未调用大模型。转场统一预留 25 分钟；演出不早于 19:00 的规则仅作规划示例，不代表真实开演时间。餐饮有费用预留，尚未自动安排用餐时间；未接入实时地图或营业时段。
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

测试覆盖需求解析、排程与预算、分享数据、日历、天气校验与回退、本机记录清理等关键逻辑。具体运行结果见上方 Actions；单元测试不替代浏览器交互和公开访问检查。

## 固定地址与发布

推送到 `main` 后，由 GitHub Actions 构建、测试并发布 GitHub Pages。后续迭代继续使用同一地址：

**https://leiqingliang.github.io/weekend-city-guide/**

请保留 GitHub 用户名 `LeiQingliang`、仓库名 `weekend-city-guide` 及 Vite `base: "/weekend-city-guide/"`，不要通过另建站点或改名替换提交链接。维护约定见 [AGENTS.md](AGENTS.md)。

图片来源见 [credits.txt](public/images/credits.txt)。天气数据由 Open-Meteo 提供，页面保留 [CC BY 4.0](https://open-meteo.com/en/licence) 署名链接；接口使用条件见 [官方说明](https://open-meteo.com/en/terms)。
