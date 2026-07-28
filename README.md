# cemc-param-web

CEMC GRIB2 要素清单的**公开展示端**：从 `params.json` 构建纯静态站点
（对标 [ECMWF GRIB Parameter Database](https://codes.ecmwf.int/grib/param-db/)）。

数据来源：内部项目 `cemc-param-db`（SQLite 编辑真源）通过
`python -m cemc_param_db export-json` 导出 `params.json`。
**本仓库不维护数据**——`params.json` 的变更只接受来自内部导出的更新，
请勿手工编辑；JSON 的 PR diff 即发布前的内容审批。

```
cemc_param.db（内部）──export-json──> params.json（本仓库）──build──> site/ ──> Netlify
```

## 构建

```bash
pip install -e .                # 仅 jinja2 一个依赖
cemc-param-web build            # 读取 ./params.json，输出 ./site/
# 等价于 python -m cemc_param_web build
```

产物为纯静态文件（列表页 + 每条要素详情页 + params.json 快照），
无服务端、无前端框架，`file://` 直接打开亦可浏览（搜索为纯前端过滤）。

`build` 默认覆盖式更新（只重写生成的文件，不清理目录中的残留文件）；
加 `--clean` 先删除整个输出目录再重建，保证产物与当前 params.json 严格一致：

```bash
cemc-param-web build --clean
```

## 部署（GitHub + Netlify）

仓库根目录的 `netlify.toml` 已固化构建配置，无需在 Netlify 控制台手工填写：

- **Build command**：`pip install . && cemc-param-web build --clean`
- **Publish directory**：`site`
- **Python**：3.12

接入步骤：Netlify 控制台 → Add new site → Import an existing project →
选择本仓库的 GitHub 仓库，确认配置来自 `netlify.toml` 即可。此后每次
push 到主分支自动重新构建发布；发布内容变更的正确路径是：cemc-param-db 侧
维护数据 → `export-json` → 本仓库提交 `params.json` 的 PR（diff 即审批）→
合并后 Netlify 自动上线。

## 项目结构

```
cemc-param-web/
├── params.json                 # 数据快照（cemc-param-db 导出，schema_version 契约）
├── netlify.toml                # Netlify 构建/发布配置
├── src/cemc_param_web/
│   ├── build.py                # params.json → 展示模型 → 静态站点
│   ├── __main__.py             # CLI（cemc-param-web / python -m cemc_param_web）
│   ├── templates/              # Jinja2 模板
│   └── static/                 # style.css / search.js
└── tests/
    └── test_build.py
```

`params.json` 的 `meta.schema_version` 是两边升级的协调点：构建器只接受
兼容版本，契约变更需在 cemc-param-db 侧递增版本号。

## 测试

```bash
pip install -e ".[test]"
pytest
```
