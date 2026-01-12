"""URL 解析工具"""

import re
import urllib.parse
from urllib.parse import urlparse
from typing import Optional

import requests


class UrlParser:
    """URL 解析工具"""

    @staticmethod
    def get_url(text: str) -> Optional[str]:
        """从文本中提取 URL"""
        url_pattern = re.compile(
            r"\bhttps?:\/\/(?:www\.|[-a-zA-Z0-9.@:%_+~#=]{1,256}\.[a-zA-Z0-9()]{1,6})\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)?"
        )
        match = url_pattern.search(text)
        if match:
            url = match.group()
            # 去除末尾可能包含的中文标点符号
            url = url.rstrip("、，。；：！？")
            return url
        return None

    @staticmethod
    def get_video_id(url: str) -> Optional[str]:
        """从 URL 中提取视频 ID"""
        try:
            parsed_url = urlparse(url)
            path_segments = parsed_url.path.strip("/").split("/")
            if path_segments:
                return path_segments[-1]
            return None
        except Exception:
            return None

    @staticmethod
    def fetch_redirect_url(url: str, target_domain: str = None) -> Optional[str]:
        """获取重定向后的真实 URL

        Args:
            url: 原始 URL
            target_domain: 目标域名（如 douyin.com, bilibili.com）
        """
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        try:
            for _ in range(5):
                resp = requests.get(
                    url, headers=headers, allow_redirects=False, timeout=5
                )
                redirect_url = resp.headers.get("location")
                if redirect_url:
                    if not redirect_url.startswith("http"):
                        redirect_url = urllib.parse.urljoin(url, redirect_url)
                    # 检查是否是目标域名
                    domain = urlparse(redirect_url).netloc
                    if target_domain and target_domain in domain:
                        return redirect_url
                    url = redirect_url
                else:
                    break
            return url
        except Exception as e:
            print(f"Redirect error: {e}")
            return url
