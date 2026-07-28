"""params.json → 静态 HTML 站点构建。

数据契约：cemc-param-db 导出的 params.json（meta.schema_version 必须兼容）。
本模块只做展示层加工（三元组、URL、搜索索引、when 可读文本、discipline 标签），
不接触数据库；产物为纯静态文件，可部署到任意静态文件服务，file:// 直接打开亦可。
"""

import json
import shutil
from pathlib import Path

from jinja2 import Environment, PackageLoader, select_autoescape

#: 兼容的 params.json schema 版本（cemc-param-db exporter.JSON_SCHEMA_VERSION）
SUPPORTED_SCHEMA_VERSION = 1

#: WMO GRIB2 Table 0.0 常用 discipline 的中文标签（未知值回退为 "Discipline N"）
DISCIPLINE_NAMES = {
    0: "气象",
    1: "水文",
    2: "陆面",
    3: "卫星遥感",
    10: "海洋",
}

#: 默认路径相对当前工作目录解析（命令在仓库根目录执行，与 netlify.toml 一致；
#: 不能按包安装位置推导，否则非 editable 安装后会指向 site-packages）
DEFAULT_PARAMS_PATH = Path("params.json")
DEFAULT_OUT_DIR = Path("site")

_DETAIL_PAGE = "params/{d}/{c}/{n}.html"


def load_model(params_path: Path | str) -> dict:
    """读取 params.json 并装配展示模型（模板渲染所需的全部字段）。"""
    doc = json.loads(Path(params_path).read_text(encoding="utf-8"))
    version = doc.get("meta", {}).get("schema_version")
    if version != SUPPORTED_SCHEMA_VERSION:
        raise ValueError(
            f"params.json schema_version={version}，"
            f"本构建器仅支持 {SUPPORTED_SCHEMA_VERSION}；"
            f"请用匹配版本的 cemc-param-db 重新导出（export-json）"
        )

    entries = [_shape_entry(raw) for raw in doc["entries"]]
    return {
        "entries": entries,
        "stats": doc["meta"]["stats"],
        "disciplines": sorted(
            {(e["discipline"], e["discipline_label"]) for e in entries}
        ),
    }


def _shape_entry(raw: dict) -> dict:
    """原始 entry → 展示模型：补充三元组、URL、标签、搜索索引、when 可读文本。

    契约（params.json）中省略的可选字段在此统一落为 None，模板里的
    `is not none` 判断依赖这一约定；契约键名 typeOfLevel 映射为 type_of_level。
    """
    key = raw["key"]
    d, c, n = key["discipline"], key["category"], key["number"]
    variants = []
    for v in raw.get("variants", []):
        variants.append({
            "name": v["name"],
            "when": v["when"],
            "when_text": ", ".join(f"{k}={x}" for k, x in v["when"].items()),
            "aliases": v.get("aliases", []),
            "type_of_level": v.get("typeOfLevel"),
            "level": v.get("level"),
            "unit": v.get("unit"),
            "description": v.get("description"),
            "description_cn": v.get("description_cn"),
        })
    entry = {
        "discipline": d,
        "category": c,
        "number": n,
        "triplet": f"{d}.{c}.{n}",
        "discipline_label": DISCIPLINE_NAMES.get(d, f"Discipline {d}"),
        "detail_url": _DETAIL_PAGE.format(d=d, c=c, n=n),
        "name": raw["name"],
        "aliases": raw.get("aliases", []),
        "wgrib2_name": raw.get("wgrib2_name"),
        "unit": raw.get("unit"),
        "description": raw.get("description"),
        "description_cn": raw.get("description_cn"),
        "type_of_level": raw.get("typeOfLevel"),
        "level": raw.get("level"),
        "remark": raw.get("remark"),
        "updated_at": raw.get("updated_at"),
        "variants": variants,
    }
    entry["search_text"] = _search_text(entry)
    return entry


def _search_text(entry: dict) -> str:
    """列表页前端过滤用的预拼接索引：名称、wgrib2 名、别名、描述、三元组。"""
    parts = [
        entry["triplet"], entry["name"], entry.get("wgrib2_name"),
        entry.get("description"), entry.get("description_cn"),
        *entry["aliases"],
        *(v["name"] for v in entry["variants"]),
        *(a for v in entry["variants"] for a in v["aliases"]),
    ]
    return " ".join(p for p in parts if p).lower()


def build_site(params_path: Path | str = DEFAULT_PARAMS_PATH,
               out_dir: Path | str = DEFAULT_OUT_DIR,
               clean: bool = False) -> Path:
    """从 params.json 构建静态站点到 out_dir。

    clean=False（默认）：覆盖式更新，只重写本次生成的文件，不清理目录中
    可能残留的旧文件；clean=True：先删除整个输出目录再重新创建，保证产物
    与当前 params.json 严格一致。
    """
    out_dir = Path(out_dir)
    if clean and out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    context = load_model(params_path)

    env = Environment(
        loader=PackageLoader("cemc_param_web", "templates"),
        autoescape=select_autoescape(["html"]),
    )
    (out_dir / "index.html").write_text(
        env.get_template("index.html").render(root="", **context), encoding="utf-8"
    )
    detail_template = env.get_template("detail.html")
    for entry in context["entries"]:
        page = out_dir / entry["detail_url"]
        page.parent.mkdir(parents=True, exist_ok=True)
        page.write_text(
            # 详情页固定位于 params/d/c/ 下三级，根路径前缀相应回退
            detail_template.render(entry=entry, root="../../../", **context),
            encoding="utf-8",
        )

    # 数据快照随站点一并发布，供第三方脚本直接消费
    shutil.copy(params_path, out_dir / "params.json")
    static_src = Path(__file__).resolve().parent / "static"
    shutil.copytree(static_src, out_dir / "static", dirs_exist_ok=True)
    return out_dir
