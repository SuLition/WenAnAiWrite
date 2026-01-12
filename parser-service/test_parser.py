#!/usr/bin/env python3
"""
解析功能测试工具
用于快速测试抖音、B站、小红书链接的解析功能
"""

import sys
import json
import re
from typing import Optional

from utils import UrlParser
from parsers import DouyinParser, BilibiliParser, XiaohongshuParser


def detect_platform(url: str) -> Optional[str]:
    """
    自动识别链接所属平台
    
    Args:
        url: 链接地址
        
    Returns:
        平台名称: douyin/bilibili/xiaohongshu/None
    """
    url_lower = url.lower()
    
    if "douyin.com" in url_lower or "v.douyin.com" in url_lower:
        return "douyin"
    elif "bilibili.com" in url_lower or "b23.tv" in url_lower:
        return "bilibili"
    elif "xiaohongshu.com" in url_lower or "xhslink.com" in url_lower:
        return "xiaohongshu"
    
    return None


def test_parse(url: str, cookie: str = None) -> dict:
    """
    测试解析单个链接
    
    Args:
        url: 要解析的链接
        cookie: 可选的 Cookie
        
    Returns:
        解析结果字典
    """
    result = {
        "success": False,
        "platform": None,
        "url": url,
        "data": None,
        "error": None
    }
    
    try:
        # 提取 URL
        extracted_url = UrlParser.get_url(url)
        if not extracted_url:
            extracted_url = url
        
        # 识别平台
        platform = detect_platform(extracted_url)
        result["platform"] = platform
        
        if not platform:
            result["error"] = "无法识别链接所属平台"
            return result
        
        print(f"\n[测试] 平台: {platform}")
        print(f"[测试] 原始链接: {url[:80]}...")
        print(f"[测试] 提取链接: {extracted_url[:80]}...")
        
        # 根据平台选择解析器
        if platform == "douyin":
            # 处理短链接
            if "v.douyin.com" in extracted_url:
                real_url = DouyinParser.fetch_redirect_url(extracted_url)
                if real_url:
                    extracted_url = real_url
                    print(f"[测试] 重定向: {real_url[:80]}...")
            
            parser = DouyinParser(extracted_url)
            data = parser.get_video_info()
            
        elif platform == "bilibili":
            # 处理短链接
            if "b23.tv" in extracted_url:
                real_url = BilibiliParser.fetch_redirect_url(extracted_url)
                if real_url:
                    extracted_url = real_url
                    print(f"[测试] 重定向: {real_url[:80]}...")
            
            parser = BilibiliParser(extracted_url, cookie)
            data = parser.get_video_info()
            
        elif platform == "xiaohongshu":
            # 处理短链接
            if "xhslink.com" in extracted_url:
                real_url = XiaohongshuParser.fetch_redirect_url(extracted_url)
                if real_url:
                    extracted_url = real_url
                    print(f"[测试] 重定向: {real_url[:80]}...")
            
            parser = XiaohongshuParser(extracted_url)
            data = parser.get_video_info()
        else:
            data = None
        
        if data:
            result["success"] = True
            result["data"] = data
        else:
            result["error"] = "解析返回空数据"
            
    except Exception as e:
        result["error"] = str(e)
        import traceback
        traceback.print_exc()
    
    return result


def print_result(result: dict):
    """格式化输出解析结果"""
    print("\n" + "=" * 60)
    
    if result["success"]:
        print("✓ 解析成功")
        print("=" * 60)
        
        data = result["data"]
        
        # 基本信息
        print(f"\n【基本信息】")
        print(f"  标题: {data.get('title', 'N/A')}")
        print(f"  作者: {data.get('author', 'N/A')}")
        print(f"  平台: {result['platform']}")
        
        # 视频信息
        if data.get("videoUrl") or data.get("videoStreams"):
            print(f"\n【视频信息】")
            print(f"  时长: {data.get('duration', 0)} 秒")
            
            if data.get("videoStreams"):
                print(f"  清晰度选项: {len(data['videoStreams'])} 个")
                for i, stream in enumerate(data["videoStreams"][:3]):
                    name = stream.get("name", stream.get("short", f"流{i}"))
                    size = stream.get("size", "未知")
                    print(f"    - {name}: {size}")
            
            video_url = data.get("videoUrl", "")
            if video_url:
                print(f"  视频链接: {video_url[:60]}...")
        
        # 图片信息（小红书图文）
        if data.get("images"):
            print(f"\n【图片信息】")
            print(f"  图片数量: {len(data['images'])} 张")
        
        # 音频信息
        if data.get("audioStream"):
            print(f"\n【音频信息】")
            audio = data["audioStream"]
            print(f"  音频链接: {audio.get('url', 'N/A')[:60]}...")
        
        # 统计数据
        print(f"\n【统计数据】")
        print(f"  点赞: {data.get('likes', 'N/A')}")
        print(f"  评论: {data.get('comments', 'N/A')}")
        if data.get("collects"):
            print(f"  收藏: {data.get('collects', 'N/A')}")
        if data.get("shares"):
            print(f"  分享: {data.get('shares', 'N/A')}")
        
    else:
        print("✗ 解析失败")
        print("=" * 60)
        print(f"  平台: {result['platform'] or '未识别'}")
        print(f"  错误: {result['error']}")
    
    print("\n" + "=" * 60)


def print_json(result: dict):
    """输出原始 JSON 数据"""
    print("\n【原始数据 JSON】")
    print(json.dumps(result, ensure_ascii=False, indent=2))


def interactive_mode():
    """交互模式"""
    print("\n" + "=" * 60)
    print("  解析功能测试工具 - 交互模式")
    print("  支持: 抖音、B站、小红书")
    print("  输入 'q' 退出, 'json' 切换JSON输出")
    print("=" * 60)
    
    show_json = False
    
    while True:
        try:
            url = input("\n请输入链接: ").strip()
            
            if not url:
                continue
            
            if url.lower() == 'q':
                print("退出测试工具")
                break
            
            if url.lower() == 'json':
                show_json = not show_json
                print(f"JSON输出: {'开启' if show_json else '关闭'}")
                continue
            
            result = test_parse(url)
            print_result(result)
            
            if show_json and result["success"]:
                print_json(result)
                
        except KeyboardInterrupt:
            print("\n退出测试工具")
            break
        except Exception as e:
            print(f"错误: {e}")


def main():
    """命令行入口"""
    args = sys.argv[1:]
    
    if not args:
        # 无参数，进入交互模式
        interactive_mode()
        return
    
    # 有参数，批量测试
    print(f"\n批量测试 {len(args)} 个链接")
    
    success_count = 0
    for i, url in enumerate(args, 1):
        print(f"\n--- 测试 {i}/{len(args)} ---")
        result = test_parse(url)
        print_result(result)
        if result["success"]:
            success_count += 1
    
    print(f"\n测试完成: {success_count}/{len(args)} 成功")


if __name__ == "__main__":
    main()
