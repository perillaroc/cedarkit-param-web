# cedarkit-param-web

CedarKit GRIB2 要素清单的**公开展示端**：Vue 3 + Naive UI 单页应用，
对标 [ECMWF GRIB Parameter Database](https://codes.ecmwf.int/grib/param-db/)。

数据来源：内部项目 `cedarkit-param-db`（SQLite 编辑真源）通过
`python -m cedarkit_param_db export-json` 导出 `params.json`。
**本仓库不维护数据**——`public/params.json` 的变更只接受来自内部导出的更新，
请勿手工编辑；JSON 的 PR diff 即发布前的内容审批。

```
cedarkit_param.db（内部）──export-json──> public/params.json（本仓库）──vite build──> dist/ ──> Netlify
```

## 技术栈

Vue 3 + TypeScript + Vite + Naive UI + vue-router（hash 模式）。
纯静态站点，无服务端；构建产物可在任意静态文件服务（或 `file://` 以外的
任意子路径）下工作（`vite.config.ts` 中 `base: './'`）。
hash 路由（`/#/params/0/0/0`）使详情页链接可分享且无需 SPA fallback 配置。

## 本地开发

```bash
npm install
npm run dev        # 开发服务器（热更新）
npm test           # vitest：数据装配逻辑
npm run build      # vue-tsc 类型检查 + 产物输出到 dist/
npm run preview    # 预览构建产物
```

## 部署（GitHub + Netlify）

仓库根目录的 `netlify.toml` 已固化构建配置，无需在 Netlify 控制台手工填写：

- **Build command**：`npm ci && npm run build`
- **Publish directory**：`dist`
- **Node**：22

接入步骤：Netlify 控制台 → Add new site → Import an existing project →
选择本仓库的 GitHub 仓库，确认配置来自 `netlify.toml` 即可。此后每次
push 到主分支自动重新构建发布；发布内容变更的正确路径是：cedarkit-param-db 侧
维护数据 → `export-json` → 本仓库提交 `public/params.json` 的 PR（diff 即审批）→
合并后 Netlify 自动上线。

## 项目结构

```
cedarkit-param-web/
├── public/params.json        # 数据快照（cedarkit-param-db 导出，schema_version 契约）；
│                             # 构建时拷入 dist 根，运行时 fetch 加载，同时供第三方脚本消费
├── index.html                # Vite 入口
├── src/
│   ├── types.ts              # 契约（Raw*）与展示模型接口
│   ├── data.ts               # params.json 加载 + schema_version 校验 + 展示模型装配
│   ├── store.ts              # 模块级数据共享（启动时加载一次）
│   ├── router.ts             # hash 路由：/ 列表，/params/:d/:c/:n 详情
│   ├── App.vue               # 布局壳（NConfigProvider zhCN + 加载/错误态）
│   └── views/
│       ├── ParamListView.vue     # 搜索 + discipline 过滤 + NDataTable
│       └── ParamDetailView.vue   # NDescriptions 元信息 + 变体表 + 维护信息
├── tests/data.test.ts        # vitest：装配/搜索索引/schema_version 校验
└── netlify.toml              # Netlify 构建/发布配置
```

`public/params.json` 的 `meta.schema_version` 是两边升级的协调点：前端加载时
校验版本（`src/data.ts` 的 `SUPPORTED_SCHEMA_VERSION`），契约变更需在
cedarkit-param-db 侧递增版本号。

> 注：0.2.0 起前端由 Jinja2 静态渲染（Python 包）重构为 Vue SPA；
> 旧的 `params/{d}/{c}/{n}.html` 静态详情页 URL 不再存在，由 hash 路由取代。
