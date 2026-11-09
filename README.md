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

当前消费 `public/reviewed/manifest.json`，组为 `cedarkit.browser.reviewed-current` v4。
manifest 格式为 1，七份浏览器文档格式为 4，目录内容为 v43；这些版本分别管理。
精确 manifest SHA256 固定在 `src/bundle-pin.json`。

输入来自 `cedarkit-param-db` 的审核文本作者导出。N06-02 冻结的 revision 4 导出组由以下命令
原字节安装到一个新目录，没有手工修改生成 JSON：

```sh
node tools/browser-bundle.mjs \
  ../../doc/2026-11-04-stage1.2-query-reki/evidence/task-n06-02/browser-candidate
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

- 列表保留 542 条资源内定义，涉及 163 个稳定 ID、1303 条映射。相同稳定 ID 在不同
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

## MESO-1KM PWAT 与本次组合

revision 2 新增 MESO-1KM 整层 `cedarkit.pwat` 及父定义，单位 `kg/m2`，参数 v9／映射 v12。
本地绑定仅覆盖 2026-11-02 12 UTC 的 0／6／48h 和审核的原生条件；页面展示的条件与证据不构成其他周期或时效的可用性承诺。
0h 是冻结原报文的初始化零，公共报告的期望域仍未知。全局 06J 当前余 95 组，由 N04B-01 的实际本地验收结算一组；06K 48 组、服务余 484 行／485 质量单元及 N27 暂缓保持。

N10I-01 使用同一 revision 2 与封存的六包候选验证实际组合。上一完整组合为 web 提交 `2a6e225`、browser revision 1／目录 v40 和其对应的 N10G 六包；恢复时同时选择匹配的代码 pin、完整快照及运行资源／包，不能仅替换 manifest 或单个资源。

## 回退和交接

原 `public/params.json`（schema 3）保持原字节，作为历史输入和回退材料；新页面始终
消费已固定的 schema 4 组，不在校验失败后自动降级到历史数据。

恢复旧页面需要同时恢复 schema 3 消费代码与其匹配快照。N03A 交接记录保留原 web
提交 `2cd93bb` 及旧文件 SHA256
`aa576355db5b992d478287b4370f9e3b5e73217fa88f984dc0ff21f0be9f5a18`。
N10G 已验该历史 schema 3 组合。N10I-01 的直接回退目标为上述 revision 1 完整组合，分别保留各次验收证据。

单测使用本仓库已安装的冻结组，并检查跨资源定义、父约束、作用域、历史导航、
版本／摘要／统计及损坏输入。Playwright 覆盖生产产物、搜索／详情／旧链接、
移动端、失败恢复和无障碍。设置 `N03B_SCREENSHOT_DIR` 可保留验收截图。

## 协议

Apache License 2.0，见 [LICENSE](LICENSE)。


## GFS NLHF revision 3 与组合恢复

N06-01 作者组新增天擎 `cedarkit.slhf` 定义及两个 GFS 产品映射，规范单位为 `J/m2`、地表、从起报累计。已审核范围仅为 2026-11-02 12 UTC、分析 0h／预报 3、6、48h、39–41N／115–117E。服务原头 `W.m-2` 的解释依据保留在同产品原始 GRIB／实际响应对照中，数值不除时长或改符号，其他周期／时效不自动成为已验范围。catalog42、天擎参数7／映射9的作用域保持独立，旧三元组 `0.0.10` 仍通过候选页选择资源。

全局历史行 1013 中已验531、余482，本批浏览器验收不重复扣减其中两行；N06余114、质量485、本地95／集合48组及N27暂缓保留。N10I-02 的精确七包、NuWe service extra、browser3／运行资源联合验收及恢复记录见 `doc/2026-11-04-stage1.2-query-reki/evidence/task-n10i-02/README.md`。直接旧组为原N10H七包＋同service extra＋browser2／catalog41；恢复须同时选择旧代码pin、完整快照及运行包和资源。原N10I-01六包／browser2联合证据及更早历史恢复目标继续保留，不能只换manifest或单个JSON。


## NSRF revision 4 与完整组合恢复

当前作者组为N06-02的browser revision4／catalog43／天擎参数8／映射10，包含542资源内定义、163稳定ID和1303作用域映射。新增服务`cedarkit.gsw`地表1/0与`cedarkit.tsw`大气顶8/0的净短波积分能量，单位J/m2；顶边界为类别，不附加虚构高度。范围只包括2026-11-02 12 UTC、39–41N／115–117E、分析0h及预报3、6、48h。原头W.m-2与解释依据保留在原始GRIB／实际响应证据中，数据不除时长或改符号，原TOA负增量仍保留。

GSW和TSW沿用同一历史三元组0.4.9，经候选页选择资源和边界；GSW父定义的单位／累计统计在TSW详情继承，映射适用域分别显示surface和atmosphere_top。原NLHF与PWAT仍保留独立审核范围。MXT/MNT的统计窗口仍缺证，当前服务资源未增加对应具名映射，不把历史候选当成现有服务支持。

N10I-03完整七包＋同NuWe extra、当前browser4及旧N10I-02完整七包／browser3的联合验收、混配边界和恢复记录位于`doc/2026-11-04-stage1.2-query-reki/evidence/task-n10i-03/README.md`。恢复须同时选择对应代码pin、完整快照、运行包和资源；更早历史组仍按各自封存证据保留。当前历史行535已验／478剩余，N06余110，质量485、本地95／集合48组及N27暂缓不变；本次组合不再次扣减四条NSRF。
