"""cemc-param-web 构建测试：params.json → 静态站点。

自含 fixture（内联 params.json），不依赖 cemc-param-db。
"""

import json
from pathlib import Path

import pytest

from cemc_param_web.build import build_site, load_model

FIXTURE_DOC = {
    "meta": {
        "schema_version": 1,
        "generated_by": "cemc-param-db",
        "stats": {"entries": 2, "variants": 1, "aliases": 2},
    },
    "entries": [
        {
            "key": {"discipline": 0, "category": 0, "number": 0},
            "name": "t",
            "aliases": ["2t"],
            "wgrib2_name": "TMP",
            "unit": "K",
            "description": "Temperature",
            "description_cn": "温度",
            "remark": "测试条目",
            "updated_at": "2026-07-28 00:00:00",
            "variants": [
                {
                    "name": "t2m",
                    "aliases": ["t_2m"],
                    "when": {"first_level_type": 103, "first_level": 2},
                    "typeOfLevel": "heightAboveGround",
                    "level": 2,
                }
            ],
        },
        {
            "key": {"discipline": 10, "category": 0, "number": 4},
            "name": "sst",
            "updated_at": "2026-07-28 00:00:00",
        },
    ],
}


@pytest.fixture(scope="module")
def params_path(tmp_path_factory):
    path = tmp_path_factory.mktemp("data") / "params.json"
    path.write_text(json.dumps(FIXTURE_DOC, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")
    return path


@pytest.fixture(scope="module")
def site_dir(params_path, tmp_path_factory):
    return build_site(params_path, tmp_path_factory.mktemp("site") / "out")


class TestLoadModel:
    def test_presentation_fields_shaped(self, params_path):
        model = load_model(params_path)
        t = model["entries"][0]
        assert t["triplet"] == "0.0.0"
        assert t["detail_url"] == "params/0/0/0.html"
        assert t["discipline_label"] == "气象"
        assert t["variants"][0]["when_text"] == "first_level_type=103, first_level=2"
        assert model["stats"]["entries"] == 2

    def test_search_text_covers_alias_and_variant(self, params_path):
        t = load_model(params_path)["entries"][0]
        for needle in ("2t", "t2m", "t_2m", "温度", "0.0.0", "tmp"):
            assert needle.lower() in t["search_text"]

    def test_schema_version_mismatch_rejected(self, tmp_path):
        bad = tmp_path / "bad.json"
        doc = {**FIXTURE_DOC, "meta": {**FIXTURE_DOC["meta"], "schema_version": 999}}
        bad.write_text(json.dumps(doc), encoding="utf-8")
        with pytest.raises(ValueError, match="schema_version"):
            load_model(bad)


class TestBuildSite:
    def test_artifacts_exist(self, site_dir):
        assert (site_dir / "index.html").is_file()
        assert (site_dir / "params" / "0" / "0" / "0.html").is_file()
        assert (site_dir / "params" / "10" / "0" / "4.html").is_file()
        assert (site_dir / "params.json").is_file()
        assert (site_dir / "static" / "style.css").is_file()
        assert (site_dir / "static" / "search.js").is_file()

    def test_index_has_search_index(self, site_dir):
        html = (site_dir / "index.html").read_text(encoding="utf-8")
        assert 'data-search="' in html
        assert "2t" in html
        assert 'data-discipline="10"' in html

    def test_detail_page_content(self, site_dir):
        html = (site_dir / "params" / "0" / "0" / "0.html").read_text(encoding="utf-8")
        assert "t2m" in html
        assert "first_level_type=103, first_level=2" in html
        assert "heightAboveGround / 2" in html  # 契约 typeOfLevel → 模板 type_of_level
        assert "测试条目" in html
        assert "../../../static/style.css" in html

    def test_missing_optional_fields_not_rendered(self, site_dir):
        """契约中省略的可选字段不得渲染出空行（sst 无 level/typeOfLevel）。"""
        html = (site_dir / "params" / "10" / "0" / "4.html").read_text(encoding="utf-8")
        assert "<th>level</th>" not in html
        assert "<th>typeOfLevel</th>" not in html

    def test_rebuild_idempotent(self, params_path, site_dir):
        first = (site_dir / "index.html").read_text(encoding="utf-8")
        build_site(params_path, site_dir)
        assert (site_dir / "index.html").read_text(encoding="utf-8") == first

    def test_clean_removes_stale_files(self, params_path, tmp_path):
        """clean=False 保留残留文件，clean=True 先删输出目录再重建。"""
        out = tmp_path / "out"
        build_site(params_path, out)
        stale = out / "stale.html"
        stale.write_text("旧产物", encoding="utf-8")

        build_site(params_path, out)  # 默认覆盖式更新
        assert stale.is_file()

        build_site(params_path, out, clean=True)
        assert not stale.exists()
        assert (out / "index.html").is_file()  # 重建完整
