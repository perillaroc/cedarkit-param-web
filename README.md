# cedarkit-param-web

CedarKit GRIB2 要素清单的公开展示端。项目使用 Vue 3、TypeScript、Vite、Naive UI
和 vue-router 构建，是一个不依赖服务端的静态站点。

参数数据由内部项目 `cedarkit-param-db` 从 SQLite 数据库导出，前端使用导出的
`public/params.json`。数据发布链路如下：

```
cedarkit_param.db ──export-json──> public/params.json ──vite build──> dist/
```

`public/params.json` 是生成文件，请勿手工编辑。参数内容变更应在
`cedarkit-param-db` 中完成，再重新导出并提交快照。

## 主要功能

- 按名称、别名、CMADaaS 名称、wgrib2 名称、描述、单位、层次、变体条件和三元组全文搜索。
- 输入 `discipline.category.number` 三元组后，可直接回车打开对应详情页。
- 按 discipline、category 和是否包含条件变体筛选；筛选条件和页码保存在 URL 中。
- 桌面端表格和移动端卡片布局，显示 CedarKit、CMADaaS 和 wgrib2 变量名。
- 详情页显示变量元信息、条件变体、继承值和维护信息，并支持复制三元组及变量名。
- 使用 hash 路由分享详情页，例如 `/#/params/0/0/0`，无需服务端配置 SPA fallback。
- 运行时校验 `schema_version`、核心字段和统计值；数据加载失败时支持重试。
- GitHub Actions 执行单元测试、类型检查、生产构建、Chromium E2E 和无障碍检查。

## 开始使用

安装依赖后启动开发服务器：

```bash
npm ci
npm run dev
```

浏览器打开终端输出的地址，通常为 <http://localhost:5173/>。

常用页面：

```text
/                    参数列表
/#/params/0/0/0      discipline=0、category=0、number=0 的详情页
```

## 安装

开发环境需要：

- Node.js 22
- npm

安装锁定版本的依赖：

```bash
npm ci
```

首次运行浏览器测试时安装 Chromium：

```bash
npx playwright install --no-shell chromium
```

## 使用

### 开发服务器

```bash
npm run dev
```

### 生产构建和预览

```bash
npm run build
npm run preview
```

构建产物输出到 `dist/`。Vite 使用相对路径，站点可以部署到根路径或任意子路径。
Netlify 配置已写入 `netlify.toml`：构建命令为 `npm ci && npm run build`，发布目录为
`dist/`，Node.js 版本为 22。hash 路由不需要额外的 SPA fallback 配置。

### 更新参数快照

在 `cedarkit-param-db` 项目中修改数据库后导出：

```bash
cd ../cedarkit-param-db
uv run --project . python -m cedarkit_param_db \
  --db cedarkit_param.db export-json \
  -o ../cedarkit-param-web/public/params.json
```

导出后可以检查快照是否与数据库一致：

```bash
uv run --project . python -m cedarkit_param_db \
  --db cedarkit_param.db check \
  --json ../cedarkit-param-web/public/params.json
```

## 开发

执行前端测试和检查：

```bash
npm test           # Vitest 数据装配测试
npm run build      # vue-tsc 类型检查和 Vite 生产构建
npm run test:e2e   # Playwright 浏览器流程和无障碍检查
```

项目结构：

```
cedarkit-param-web/
├── public/params.json          # cedarkit-param-db 导出的数据快照
├── src/
│   ├── types.ts                # params.json 契约和展示模型类型
│   ├── data.ts                 # 数据加载、校验和展示模型装配
│   ├── store.ts                # 应用级数据共享和加载状态
│   ├── router.ts               # hash 路由
│   ├── App.vue                 # 页面布局和加载/错误状态
│   └── views/
│       ├── ParamListView.vue   # 搜索、筛选、列表和移动卡片
│       └── ParamDetailView.vue # 元信息、复制操作和变体表格
├── tests/data.test.ts          # Vitest 单元测试
├── tests/e2e/                  # Playwright E2E 测试
└── netlify.toml                # Netlify 构建和响应头配置
```

数据展示层字段使用 TypeScript 的 `Entry`/`Variant` 模型；契约字段与展示字段的转换
集中在 `src/data.ts`，避免在 Vue 组件中重复处理原始 JSON。

### `params.json` 协议结构

`params.json` 当前使用 schema v3，由 `cedarkit-param-db` 的 `export-json` 命令生成。
前端 `src/data.ts` 中的 `SUPPORTED_SCHEMA_VERSION` 必须与导出器版本兼容；版本不匹配时
页面会拒绝加载数据。

顶层结构：

```json
{
  "meta": {
    "schema_version": 3,
    "generated_by": "cedarkit-param-db",
    "stats": {
      "entries": 126,
      "variants": 95,
      "aliases": 27,
      "parameter_ids": 221
    }
  },
  "entries": []
}
```

### `meta`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `schema_version` | number | 契约版本，当前为 `3` |
| `generated_by` | string | 生成工具名称 |
| `stats` | object | 条目、变体、别名和稳定 ID 数量，用于完整性检查 |

### `entries[]`

每个 entry 由 GRIB2 的 `discipline`、`category`、`number` 三元组确定：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `parameter_id` | string | CedarKit 稳定参数 ID |
| `key` | object | 包含 `discipline`、`category`、`number` |
| `name` | string | CedarKit 通用变量名 |
| `aliases` | string[] | 变量别名，可选 |
| `external_names` | object | 外部服务变量名，可选 |
| `wgrib2_name` | string | wgrib2 变量名，可选 |
| `unit` | string | 单位，可选 |
| `description` / `description_cn` | string | 英文/中文描述，可选 |
| `typeOfLevel` / `level` | string / number | 层次信息，可选 |
| `remark` / `updated_at` | string | 维护信息 |
| `variants` | object[] | 带条件的参数变体，可选 |

外部名称通过命名空间保存。CMADaaS 名称位于
`external_names.cmadaas`，例如：

```json
{
  "name": "t",
  "external_names": {
    "cmadaas": "TEM"
  }
}
```

### `variants[]`

变体包含独立的 `parameter_id`、`name` 和 `when` 条件，也可以覆盖条目级的层次、单位
和描述字段。CMADaaS 外部名称属于基础 entry，变体继承其外部名称；因此变体无需重复
写入 `external_names`。

`when` 是由规范定义的键值对象，值为数字或字符串。前端会将其转换为可读文本，不能
在 JSON 或 YAML 中嵌入可执行表达式。

## 协议

本项目采用 Apache License 2.0，详细条款见 [LICENSE](LICENSE)。
