# V4 设计依据：让周末更容易出发

本轮于 **2026-11-10** 参照公开产品页面、官方说明和项目实际界面，关注如何把条件、地点和计划组织在一起。研究不包含登录后的预约或付款，也不代表独立用户研究、官方评分或经营效果验证。

## 借鉴信息结构，保留自己的产品

“出门啦”延续森林绿、奶油底色与城市氛围，把主要空间留给选择：先看城市、日期、预算、人数和天气，再比较地点与完整方案。以下来源提供设计参照，不意味着复制其素材、品牌或完整流程。

| 官方参照 | 本轮实际观察范围 | 转化为本项目的设计 |
| --- | --- | --- |
| [Airbnb Experiences](https://www.airbnb.com/experiences) | 匿名页可见目的地、日期、同行人数的分段搜索；结果内容未加载 | 把当前出行条件集中显示，减少用户记忆负担；不据此评价或复刻其预订流程 |
| [Wanderlog](https://wanderlog.com/) | 官网营销页内展示行程、费用与地图并列的产品演示；未使用登录后的编辑器 | 地点位置和计划金额相互照应，地图辅助选择，不能取代来源与费用说明 |
| [AllTrails 地图说明](https://support.alltrails.com/hc/en-us/articles/360034969432-How-to-use-map-view-to-search-for-trails)与[筛选说明](https://support.alltrails.com/hc/en-us/articles/37227964040852-How-to-use-filters-to-find-trails) | 官方文字说明；产品页访问受限，未据错误页评价视觉界面 | 地图标记与活动卡共享选中状态；保留列表切换、明确已选条件和无结果状态 |
| [GetYourGuide：MoMA 活动详情](https://www.getyourguide.com/new-york-city-l59/nyc-moma-before-hours-tour-with-art-expert-t446965/) | 读取到时长、费用包含、集合地点与出行前须知等文本；浏览器页面返回访问限制 | 详情优先呈现做决定需要的事实与行动前提醒，不借用评分、认证或余票标签 |
| [美团技术团队：移动端 UI 一致性解决方案](https://tech.meituan.com/2020/11/26/Consistency-in-UI-Design.html) | 2020 年官方文章及插图，不代表当前所有产品规范 | 统一文字层级、颜色语义、卡片和操作状态；保留本站品牌，不将文章当作本次笔试评分细则 |

## 本轮落地的选择

- **从展示城市到探索地点。** 首页缩短氛围表达，把当前条件、具体提案、列表与地图放在主要工作区。三步定制依然承担“不知道去哪”的入口。
- **让事实和想象各有位置。** 真实地点附来源、查阅日期和预约说明；图片标注氛围参考。街区灵感、常规开放和未确认场次分别说明，费用明确是预留。
- **两份方案足够比较。** 同时展示人均规划总额、时长、理由与取舍；人数改变同行总额，也在兴趣优先的前提下影响偏好排序。
- **保持阅读与操作的一致性。** 墨绿用于标题、选中与主动作，浅色用于工作面和分组；金额、正文和辅助说明有不同层级。警告与状态同时使用文字，手机保留可直接触达的操作。
- **把链接带到手机。** 分享内容在本地生成二维码，复制链接仍可用；内容过长时明确回退，不依赖外部短链。

上述是基于任务场景作出的设计选择。是否降低选择成本、提高出发意愿，需要后续实际用户验证；当前检查只证明对应界面和交互的已记录状态，见 [验证记录](VERIFICATION.md)。

## 地图与二维码的技术依据

**地图。** 使用 Leaflet 1.9.4，其[同版本许可证](https://github.com/Leaflet/Leaflet/blob/v1.9.4/LICENSE)为 **BSD-2-Clause**。底图来自 OpenStreetMap，遵守[标准瓦片政策](https://operations.osmfoundation.org/policies/tiles/)，保留可见的[贡献者署名与版权链接](https://www.openstreetmap.org/copyright)。地图库许可证与地理数据、瓦片服务授权是不同层次，不能互相替代。

地点坐标经少量、单线程查询和人工匹配后保存在资料中，依据 [Nominatim 使用政策](https://operations.osmfoundation.org/policies/nominatim/)控制请求频率并缓存；没有在客户端运行地名自动补全。11 个点位均为 OSM WGS84 参考坐标，区分具体场馆与区域，徐汇滨江没有可靠匹配就不显示点位。

OSM 标准服务不保证可用性，国内网络也可能阻断加载。地图仅在需要时加载，失败后保留地点列表、重试和高德名称搜索；本站没有把参考点称作入场口、真实导航路线或路程估算。

**二维码。** 使用作者维护的 [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)，项目采用 2.0.4，按[官方 JS 文档](https://github.com/kazuhikoarase/qrcode-generator/blob/master/js/README.md)本地生成，遵守 [MIT 许可证](https://github.com/kazuhikoarase/qrcode-generator/blob/master/LICENSE)。分享 URL 保留中文编码与完整片段；码点过密、内容过长或生成失败时退回复制链接。成功生成与真实手机扫码效果是不同验证事项。

## 素材与表达边界

竞品截图仅用于内部设计参照，未复制到本站素材中，也不据此宣称获得图片、商标或页面的复用许可。现有照片按 [图片来源](../public/images/credits.txt)记录；AI 城市图保留概念图说明。产品没有美团、Airbnb、Wanderlog、AllTrails 或 GetYourGuide 的官方关联。

地点原始资料与核验日期见 [src/evidence.ts](../src/evidence.ts)，产品逻辑及当前范围见 [产品说明](PRODUCT.md)。
