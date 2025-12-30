# Search Console 16‑Month Backup（最小可行版）

目标：用 GSC API 把“按月汇总”数据归档到本地，避免超过约 16 个月后在 GSC 里查不到。

## 1. 安装（自用：加载已解压扩展）

1) 打开 `chrome://extensions`
2) 开启右上角「开发者模式」
3) 点击「加载已解压的扩展程序」
4) 选择本文件夹：`Search Console 16-Month Backup/`

## 2. 配置 OAuth（必须）

此扩展使用 `chrome.identity.getAuthToken`，需要你自己在 Google Cloud 配置 OAuth。

1) 进入 Google Cloud Console，新建/选择项目
2) 启用 API：**Google Search Console API**
3) 配置 OAuth 同意屏幕（OAuth consent screen）
4) 创建 OAuth Client：选择 **Chrome Extension**
5) 先把扩展加载到 `chrome://extensions`，复制扩展 ID
6) 在 OAuth Client 里填入该扩展 ID，创建完成后得到 `client_id`
7) 打开 `manifest.json`，把 `oauth2.client_id` 替换为你的 `client_id`
8) 回到 `chrome://extensions`，点击「重新加载」

说明：如果你把扩展目录换位置、或换电脑导致扩展 ID 改变，需要同步更新 OAuth Client 的扩展 ID。

## 3. 使用

1) 点扩展图标 → 「打开本地归档面板」
2) 点「授权 Google（OAuth）」
3) 点「拉取站点列表」并选择一个 Property
4) 选择月份 → 「同步并归档该月汇总」
5) 归档结果会出现在下方表格，并可「导出全部（JSON）」
6) 也可「导出全部（Excel）」生成 `.xls`（Excel 可直接打开）
7) 也可「导出全部（LibreOffice）」生成 `.ods`（LibreOffice Calc 原生格式）
8) 可在面板/设置页切换语言：中文 / 日本語 / English
9) 可使用「查询词（query）明细归档」同步并查看 Top N 查询词明细（默认 1000，最多 10,000）
10) 可使用「页面（page）明细归档」同步并查看 Top N 页面明细（默认 1000，最多 10,000）
11) 可使用「设备（device）明细归档」查看 DESKTOP/MOBILE/TABLET 表现
12) 可使用「国家/地区（country）明细归档」同步并查看 Top N 国家/地区明细（默认 1000，最多 10,000）
13) 可使用「展现类型（searchAppearance）明细归档」同步并查看 Top N 展现类型明细（默认 1000，最多 10,000）
14) 可使用「日期（date）按天归档」查看该月每天的数据（约 28~31 行）
15) 可在 `options.html` 配置「自动归档」：设置每天执行时间、归档上月/本月，并勾选要保存的维度（首次需在面板完成一次授权）
16) 如需“保存成文件到本机”，在设置页开启「自动导出到本地文件」并先点击「授权文件保存（Downloads 权限）」，自动归档会把 JSON 文件下载到你的下载目录

## 现在的范围（MVP）

- 只归档“按月汇总”一条记录（clicks/impressions/ctr/position）
- 已支持 `query` / `page` / `device` / `country` / `searchAppearance` / `date` 维度归档（其中 query/page/country/searchAppearance 支持 Top N，最多 10,000 行）
- 暂不支持 searchAppearance/date 以外的更多维度组合、定时任务、CSV 导出
