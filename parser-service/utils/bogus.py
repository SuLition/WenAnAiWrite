"""抖音签名工具"""

import os
import sys
import random
import urllib.parse

# PyInstaller 打包后需要手动设置 DLL 路径
MINI_RACER_AVAILABLE = False
MINI_RACER_ERROR = None
DEBUG_INFO = []  # 记录调试信息


def _log(msg):
    """记录调试信息"""
    DEBUG_INFO.append(msg)


try:
    if getattr(sys, "frozen", False):
        # 打包环境
        base_path = sys._MEIPASS
        _log(f"PyInstaller 环境, MEIPASS: {base_path}")

        # 检查 py_mini_racer 目录
        mini_racer_path = os.path.join(base_path, "py_mini_racer")
        dll_found = False

        if os.path.exists(mini_racer_path):
            _log(f"找到 py_mini_racer 目录")
            dll_path = os.path.join(mini_racer_path, "mini_racer.dll")
            if os.path.exists(dll_path):
                _log(f"找到 mini_racer.dll")
                dll_found = True
                if hasattr(os, "add_dll_directory"):
                    os.add_dll_directory(mini_racer_path)
                os.environ["PATH"] = (
                    mini_racer_path + os.pathsep + os.environ.get("PATH", "")
                )
            else:
                _log(f"py_mini_racer 目录中未找到 DLL")
        else:
            _log(f"未找到 py_mini_racer 目录")

        # 尝试根目录
        if not dll_found:
            root_dll = os.path.join(base_path, "mini_racer.dll")
            if os.path.exists(root_dll):
                _log(f"在根目录找到 mini_racer.dll")
                dll_found = True
                if hasattr(os, "add_dll_directory"):
                    os.add_dll_directory(base_path)
                os.environ["PATH"] = base_path + os.pathsep + os.environ.get("PATH", "")

        if not dll_found:
            # 列出所有目录帮助调试
            dirs = [
                d
                for d in os.listdir(base_path)
                if os.path.isdir(os.path.join(base_path, d))
            ]
            _log(f"MEIPASS 目录列表: {dirs[:20]}")
    else:
        _log("开发环境")

    from py_mini_racer import MiniRacer

    MINI_RACER_AVAILABLE = True
    _log("导入成功")

except Exception as e:
    import traceback

    MINI_RACER_ERROR = f"{str(e)}\n{traceback.format_exc()}"
    _log(f"导入失败: {e}")


class BogusUtils:
    """抖音签名工具"""

    def __init__(self):
        # 检查 MiniRacer 是否可用
        if not MINI_RACER_AVAILABLE:
            error_msg = (
                f"Native library not available. 调试信息: {'; '.join(DEBUG_INFO)}"
            )
            if MINI_RACER_ERROR:
                error_msg += f" | 错误: {MINI_RACER_ERROR}"
            raise RuntimeError(error_msg)

        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"

        # 加载 JS 签名代码 - 支持打包环境
        if getattr(sys, "frozen", False):
            # 打包环境：从 MEIPASS 加载
            js_path = os.path.join(sys._MEIPASS, "a_bogus.js")
        else:
            # 开发环境
            js_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "a_bogus.js",
            )

        if not os.path.exists(js_path):
            raise RuntimeError(f"a_bogus.js 未找到: {js_path}")

        with open(js_path, "r", encoding="utf-8") as f:
            js_code = f.read()

        self.ctx = MiniRacer()
        self.ctx.eval(js_code)

    def get_abogus(self, req_url: str, user_agent: str) -> str:
        """生成 a_bogus 签名"""
        query = urllib.parse.urlparse(req_url).query
        return self.ctx.call("generate_a_bogus", query, user_agent)

    def get_ms_token(self, length: int = 107) -> str:
        """生成随机 ms_token"""
        base_str = "ABCDEFGHIGKLMNOPQRSTUVWXYZabcdefghigklmnopqrstuvwxyz0123456789="
        return "".join(random.choice(base_str) for _ in range(length))
