#!/usr/bin/env python3
"""
打包 parser-service 为独立可执行文件
使用 PyInstaller 将 FastAPI 服务打包成 exe
"""

import os
import sys
import shutil
import subprocess


def main():
    # 当前目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(current_dir)

    print("=" * 60)
    print("开始打包 parser-service")
    print("=" * 60)

    # 检查 PyInstaller 是否安装
    try:
        import PyInstaller

        print(f"[OK] PyInstaller 版本: {PyInstaller.__version__}")
    except ImportError:
        print("[!] PyInstaller 未安装，正在安装...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
        print("[OK] PyInstaller 安装完成")

    # 清理旧的构建文件
    for folder in ["build", "dist"]:
        if os.path.exists(folder):
            print(f"[清理] 删除 {folder}/")
            shutil.rmtree(folder)

    # 查找 py_mini_racer 的 DLL 文件
    mini_racer_dll = None
    try:
        import py_mini_racer

        mr_dir = os.path.dirname(py_mini_racer.__file__)
        dll_path = os.path.join(mr_dir, "mini_racer.dll")
        if os.path.exists(dll_path):
            mini_racer_dll = dll_path
            print(f"[OK] 找到 mini_racer.dll: {dll_path}")
    except ImportError:
        print("[!] py_mini_racer 未安装")

    # PyInstaller 参数
    pyinstaller_args = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--onefile",
        "--name",
        "backend_server",
        "--console",
        "--noconfirm",
        "--add-data",
        f"a_bogus.js{os.pathsep}.",
        "--hidden-import",
        "uvicorn.logging",
        "--hidden-import",
        "uvicorn.protocols",
        "--hidden-import",
        "uvicorn.protocols.http",
        "--hidden-import",
        "uvicorn.protocols.http.auto",
        "--hidden-import",
        "uvicorn.protocols.websockets",
        "--hidden-import",
        "uvicorn.protocols.websockets.auto",
        "--hidden-import",
        "uvicorn.lifespan",
        "--hidden-import",
        "uvicorn.lifespan.on",
        "--hidden-import",
        "uvicorn.lifespan.off",
        "--hidden-import",
        "email.mime.text",
        "--hidden-import",
        "email.mime.multipart",
        "--hidden-import",
        "py_mini_racer",
        "--collect-all",
        "uvicorn",
        "--collect-all",
        "fastapi",
        "--collect-all",
        "starlette",
        "--collect-all",
        "py_mini_racer",
        "main.py",
    ]

    # 添加 mini_racer.dll 到根目录（py_mini_racer 库在根目录查找 DLL）
    if mini_racer_dll:
        idx = pyinstaller_args.index("main.py")
        pyinstaller_args.insert(idx, f"{mini_racer_dll}{os.pathsep}.")
        pyinstaller_args.insert(idx, "--add-binary")

    print("\n[打包] 执行 PyInstaller...")
    print(f"命令: {' '.join(pyinstaller_args[2:])}")
    print()

    # 执行打包
    result = subprocess.run(pyinstaller_args, cwd=current_dir)

    if result.returncode != 0:
        print("\n[错误] 打包失败!")
        sys.exit(1)

    # 检查输出
    exe_path = os.path.join(current_dir, "dist", "backend_server.exe")
    if os.path.exists(exe_path):
        size_mb = os.path.getsize(exe_path) / 1024 / 1024
        print(f"\n[成功] 打包完成!")
        print(f"  输出: {exe_path}")
        print(f"  大小: {size_mb:.1f} MB")

        # 复制到 Tauri 目标目录
        tauri_target = os.path.join(current_dir, "..", "src-tauri", "binaries")
        os.makedirs(tauri_target, exist_ok=True)

        target_exe = os.path.join(tauri_target, "backend_server.exe")
        shutil.copy2(exe_path, target_exe)
        print(f"  已复制到: {target_exe}")
    else:
        print("\n[错误] exe 文件未生成!")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("打包完成! 下一步:")
    print("1. 运行 npm run tauri:build 构建桌面应用")
    print("2. 确保 backend_server.exe 在应用同目录下")
    print("=" * 60)


if __name__ == "__main__":
    main()
