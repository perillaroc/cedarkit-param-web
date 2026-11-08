# cedarkit-param-web

CedarKit 当前审核参数资源的静态浏览器，使用 Vue 3、TypeScript、Vite、Naive UI
和 vue-router。页面以稳定参数 ID 组织定义，保留参数资源上下文和产品／来源适用映射。

## 开发和验证

需要 Node.js 22。首次安装及验证：

```sh
npm ci
npm test
npm run build
npx playwright install --no-shell chromium
npm run test:e2e
```

`npm run dev` 启动开发服务器。`npm run preview` 预览 `dist/`；E2E 使用生产预览，
因此在运行 E2E 前必须先构建。CI 已按以上顺序执行。

`npm run build` 先执行 `npm run verify:bundle`，核对安装快照的 manifest pin、
完整成员清单、大小和 SHA256，再进行 TypeScript 检查和生产构建。

## 冻结的 schema 4 快照

当前消费 `public/reviewed/manifest.json`，组为 `cedarkit.browser.reviewed-current` v1。
manifest 格式为 1，七份浏览器文档格式为 4，目录内容为 v40；这些版本分别管理。
精确 manifest SHA256 固定在 `src/bundle-pin.json`。

输入来自 `cedarkit-param-db` 的审核文本作者导出。N03A 冻结的导出组由以下命令
原字节安装到一个新目录，没有手工修改生成 JSON：

```sh
node tools/browser-bundle.mjs \
  ../../doc/2026-11-04-stage1.2-query-reki/evidence/task-n03a/bundle-a
```

安装目录必须不存在；同一 revision 不覆盖。已有安装可用以下命令复核：

```sh
npm run verify:bundle
```

后续数据更新应先在 `cedarkit-param-db` 中更新审核作者输入，经
`tools/export_browser_snapshot.py` 导出、审核新组与内容版本，再协调更新 pin 和安装目录。
该导出器的完整参数和规则见 param-db 的 `docs/browser-schema4.md`。
不得通过手工修改 `public/reviewed/` 或历史 `public/params.json` 改变内容。

浏览器先验证 manifest 的冻结摘要、组身份／版本和格式；再按 manifest 所在目录
解析成员路径，验证全部 23 个成员的大小／SHA256，最后核对快照定义、映射、原运行资源、
18 个 dataset bindings 和目录中的版本／摘要。校验全部完成后才显示页面。
原运行文件摘要与浏览器内联投影的重序列化摘要用途不同，不能互换。
快照校验使用 Web Crypto，部署需要 HTTPS；localhost 开发／预览也可使用。

## 浏览和导航

- 列表保留 537 条资源内定义，涉及 163 个稳定 ID、1295 条映射。相同稳定 ID 在不同
  资源中的定义分别显示，避免覆盖差异；119 个稳定 ID 有直接映射。
- 搜索稳定 ID、名称／别名、中英文描述、单位、父定义、科学条件、适用产品、
  原生字段、证据引用和 GRIB 三元组。可按资源、dataset、backend 和直接映射状态筛选。
- 筛选和分页保存在 URL；桌面显示表格，移动端显示卡片。
- 详情按“参数资源 ID＋稳定参数 ID”定位；单位／描述只从同一资源内的父定义继承，
  展示原本地定义、完整父链、固定条件、子定义、每条映射的产品域、条件、原生转换、
  共享表及证据引用。映射身份也包含映射资源 ID。
- 有定义且无直接映射时明确显示状态，不因此宣称可以执行。
- `/#/params/:d/:c/:n` 旧链接及搜索框三元组回车进入候选页，保留多个稳定身份及资源入口。
  91 个仅历史身份使用 `historical_only`，表示未纳入当前审核切片，不自动视为退役或当前支持。
- 页面显示 reviewed_authoring／reviewed_mapping_with_references，并说明未保证所有
  时效／成员／质量单元可用。全局待验义务从 manifest 展示一次，不按七份快照相加。
- 加载失败时显示原因并提供重试，拒绝部分数据展示。

示例：

```text
/#/?q=cedarkit.t2m&s=gfs
/#/parameters/cedarkit.parameters.cma-gfs.current/cedarkit.t2m
/#/params/0/0/0
```

采用 hash 路由和相对资源路径，支持静态根目录和子目录托管。Netlify 设置在
`netlify.toml`，构建命令为 `npm ci && npm run build`，发布目录为 `dist/`。

## 回退和交接

原 `public/params.json`（schema 3）保持原字节，作为历史输入和回退材料；新页面始终
消费已固定的 schema 4 组，不在校验失败后自动降级到历史数据。

恢复旧页面需要同时恢复 schema 3 消费代码与其匹配快照。N03A 交接记录保留原 web
提交 `2cd93bb` 及旧文件 SHA256
`aa576355db5b992d478287b4370f9e3b5e73217fa88f984dc0ff21f0be9f5a18`。
完整组合与回退实演由 N10G 单独验收，N03B 的页面验收不替代该项。

单测使用本仓库已安装的冻结组，并检查跨资源定义、父约束、作用域、历史导航、
版本／摘要／统计及损坏输入。Playwright 覆盖生产产物、搜索／详情／旧链接、
移动端、失败恢复和无障碍。设置 `N03B_SCREENSHOT_DIR` 可保留验收截图。

## 协议

Apache License 2.0，见 [LICENSE](LICENSE)。
