# 固定地址发布

提交地址始终为 **https://leiqingliang.github.io/weekend-city-guide/**。源码位于 `main`；生产静态文件位于同仓库 `gh-pages` 分支，Pages 使用该分支的根目录，公开访问并强制 HTTPS。

## 更新流程

1. 修改源码，完成相关检查并推送 `main`。等待 `Verify preview` 成功；该流程执行单元测试、类型检查和生产构建，上传 `github-pages` 产物。
2. 下载本次提交对应的产物，检查其提交 SHA 与准备发布的应用源码一致。解压后应包含 `index.html`、`assets/`、`images/` 和 `favicon.svg`；不要把源码、依赖、私有文件或本机记录混入。
3. 在单独的 `gh-pages` 检出目录更新静态文件，保留 `.nojekyll`。对实际产物验证桌面、手机和核心交互后，正常提交并推送该分支，不强制改写历史。
4. 等待 GitHub 的 `pages build and deployment` 成功；若没有自动触发，可由具有仓库发布权限的已登录维护者请求 Pages 构建：`gh api -X POST repos/LeiQingliang/weekend-city-guide/pages/builds`。
5. 在未登录的浏览器打开固定地址，确认首页的新资源版本、图片、主要交互和分享链接。只有该检查通过后才报告上线。

不要将 `main` 的源码直接作为 Pages 静态目录，也不要改仓库名、用户名、站点子路径或域名。GitHub Actions 的默认 `GITHUB_TOKEN` 推送不会自动触发分支 Pages 构建；当前流程由维护者发布已验证产物，不要求新增或保存长期令牌。

## 本次选择

2026-11-10 的自定义 Pages 发布任务多次在创建部署作业前返回 GitHub 内部错误，而生产构建和浏览器验收通过。因此切换为官方支持的分支发布，继续使用相同的 GitHub Pages 地址。问题发生在发布流程，没有以临时预览网址替换提交地址。

官方依据：[配置 Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。
