"""命令行入口：cemc-param-web build / python -m cemc_param_web build"""

import argparse
import sys
from pathlib import Path

from cemc_param_web.build import DEFAULT_OUT_DIR, DEFAULT_PARAMS_PATH, build_site


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="cemc_param_web",
        description="从 params.json 构建 CEMC GRIB2 要素清单静态站点",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_build = sub.add_parser("build", help="构建静态站点")
    p_build.add_argument(
        "--params", type=Path, default=DEFAULT_PARAMS_PATH,
        help=f"params.json 路径（默认 {DEFAULT_PARAMS_PATH}）",
    )
    p_build.add_argument(
        "-o", "--out", type=Path, default=DEFAULT_OUT_DIR,
        help=f"站点输出目录（默认 {DEFAULT_OUT_DIR}）",
    )
    p_build.add_argument(
        "--clean", action="store_true",
        help="先删除整个输出目录再重新构建（默认覆盖式更新，不清理残留文件）",
    )

    args = parser.parse_args(argv)

    if args.command == "build":
        out = build_site(args.params, args.out, clean=args.clean)
        print(f"built {args.params} -> {out}")
        return 0

    return 2


if __name__ == "__main__":
    sys.exit(main())
