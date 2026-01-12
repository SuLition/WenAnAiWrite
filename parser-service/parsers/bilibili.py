"""B站视频解析器"""

import os
import re
import time
import hashlib
import urllib.parse
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse

import requests

from utils import UrlParser


# B站 Cookie 配置（登录后获取，支持高清视频）
BILIBILI_COOKIE = os.environ.get("BILIBILI_COOKIE", "")

# WBI 签名算法的混淆表
MIXIN_KEY_ENC_TAB = [
    46,
    47,
    18,
    2,
    53,
    8,
    23,
    32,
    15,
    50,
    10,
    31,
    58,
    3,
    45,
    35,
    27,
    43,
    5,
    49,
    33,
    9,
    42,
    19,
    29,
    28,
    14,
    39,
    12,
    38,
    41,
    13,
    37,
    48,
    7,
    16,
    24,
    55,
    40,
    61,
    26,
    17,
    0,
    1,
    60,
    51,
    30,
    4,
    22,
    25,
    54,
    21,
    56,
    59,
    6,
    63,
    57,
    62,
    11,
    36,
    20,
    34,
    44,
    52,
]


class BilibiliParser:
    """B站视频解析器 - 使用WBI签名API获取高清视频流"""

    USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"

    # WebGL 指纹默认值
    DEFAULT_DM_IMG_STR = "V2ViR0wgMS"
    DEFAULT_DM_COVER_IMG_STR = "QU5HTEUgKEludGVsLCBJbnRlbChSKSBVSEQgR3JhcGhpY3MgNjMwICgweDAwMDA5QkM4KSBEaXJlY3QzRDExIHZzXzVfMCBwc181XzAsIEQzRDExKUdvb2dsZSBJbmMuIChJbnRlb"

    # 缓存设备标识 Cookie
    _device_cookies_cache = None

    @classmethod
    def _get_device_cookies(cls) -> str:
        """获取设备标识 Cookie (buvid3, buvid4, b_nut 等)"""
        if cls._device_cookies_cache:
            return cls._device_cookies_cache

        try:
            print("[Bilibili] 正在获取设备标识 Cookie...")
            resp = requests.get(
                "https://www.bilibili.com",
                headers={
                    "User-Agent": cls.USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                },
                timeout=10,
            )

            cookies_dict = {}
            for cookie in resp.cookies:
                cookies_dict[cookie.name] = cookie.value

            device_cookie = "; ".join([f"{k}={v}" for k, v in cookies_dict.items()])

            print(f"[Bilibili] 获取到设备 Cookie: {list(cookies_dict.keys())}")

            cls._device_cookies_cache = device_cookie
            return device_cookie
        except Exception as e:
            print(f"[Bilibili] 获取设备 Cookie 失败: {e}")
            return ""

    def __init__(self, url: str, cookie: str = None):
        self.url = url

        # 合并设备 Cookie 和用户 Cookie
        device_cookie = self._get_device_cookies()
        user_cookie = cookie or BILIBILI_COOKIE

        if device_cookie and user_cookie:
            self.cookie = f"{device_cookie}; {user_cookie}"
        elif user_cookie:
            self.cookie = user_cookie
        elif device_cookie:
            self.cookie = device_cookie
        else:
            self.cookie = ""

        # 检查 Cookie 是否包含关键字段 SESSDATA
        self.is_login = bool(self.cookie and "SESSDATA" in self.cookie)

        print(f"[Bilibili] Cookie 长度: {len(self.cookie) if self.cookie else 0}")
        print(
            f"[Bilibili] Cookie 包含 SESSDATA: {'SESSDATA' in self.cookie if self.cookie else False}"
        )
        print(
            f"[Bilibili] Cookie 包含 buvid3: {'buvid3' in self.cookie if self.cookie else False}"
        )
        print(f"[Bilibili] 登录状态判定: {self.is_login}")

        self.headers = {
            "User-Agent": self.USER_AGENT,
            "Referer": "https://www.bilibili.com/",
            "Origin": "https://www.bilibili.com",
        }
        if self.cookie:
            self.headers["Cookie"] = self.cookie

        self.bvid = self._extract_bvid(url)
        self.aid = None
        self.cid = None
        self.video_data = None
        self.wbi_keys = None

    def _extract_bvid(self, url: str) -> Optional[str]:
        """从URL中提取BV号"""
        patterns = [
            r"BV[a-zA-Z0-9]+",
            r"/video/(BV[a-zA-Z0-9]+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                bvid = match.group(0) if "BV" in match.group(0) else match.group(1)
                return bvid
        return None

    @staticmethod
    def fetch_redirect_url(url: str) -> Optional[str]:
        """获取B站短链接重定向后的真实URL"""
        return UrlParser.fetch_redirect_url(url, "bilibili.com")

    def _get_wbi_keys(self) -> tuple:
        """获取WBI签名密钥"""
        if self.wbi_keys:
            return self.wbi_keys

        try:
            resp = requests.get(
                "https://api.bilibili.com/x/web-interface/nav",
                headers=self.headers,
                timeout=10,
            )
            data = resp.json()

            wbi_img = data.get("data", {}).get("wbi_img", {})
            img_url = wbi_img.get("img_url", "")
            sub_url = wbi_img.get("sub_url", "")

            img_key = img_url.split("/")[-1].split(".")[0] if img_url else ""
            sub_key = sub_url.split("/")[-1].split(".")[0] if sub_url else ""

            if img_key and sub_key and len(img_key) >= 32 and len(sub_key) >= 32:
                self.wbi_keys = (img_key, sub_key)
                print(
                    f"[Bilibili] WBI keys obtained: img_key={img_key[:8]}..., sub_key={sub_key[:8]}..."
                )
                return self.wbi_keys
            else:
                print(
                    f"[Bilibili] WBI keys 无效: img_key长度={len(img_key)}, sub_key长度={len(sub_key)}"
                )
        except Exception as e:
            print(f"[Bilibili] 获取WBI密钥失败: {e}")

        return ("", "")

    def _get_mixin_key(self, img_key: str, sub_key: str) -> str:
        """生成混合密钥"""
        if not img_key or not sub_key:
            return ""
        orig = img_key + sub_key
        if len(orig) < 64:
            return ""
        return "".join([orig[i] for i in MIXIN_KEY_ENC_TAB])[:32]

    def _wbi_sign(self, params: dict) -> str:
        """生成WBI签名"""
        img_key, sub_key = self._get_wbi_keys()
        mixin_key = self._get_mixin_key(img_key, sub_key)

        # 添加必要参数
        curr_time = int(time.time())
        params["wts"] = curr_time
        params["dm_img_str"] = self.DEFAULT_DM_IMG_STR
        params["dm_cover_img_str"] = self.DEFAULT_DM_COVER_IMG_STR
        params["dm_img_list"] = "[]"

        # 按 key 排序
        sorted_params = sorted(params.items())

        # 过滤特殊字符并拼接
        chr_filter = "!'()*"
        query_parts = []
        for k, v in sorted_params:
            v_str = str(v) if v is not None else ""
            for char in chr_filter:
                v_str = v_str.replace(char, "")
            query_parts.append(
                f"{urllib.parse.quote(str(k), safe='')}={urllib.parse.quote(v_str, safe='')}"
            )

        query = "&".join(query_parts)

        # 计算MD5签名
        if mixin_key:
            w_rid = hashlib.md5((query + mixin_key).encode()).hexdigest()
            return query + "&w_rid=" + w_rid
        else:
            print(f"[Bilibili] 警告: mixin_key为空，使用无签名请求")
            return query

    def _get_video_info_api(self) -> bool:
        """通过API获取视频基本信息"""
        if not self.bvid:
            return False

        try:
            resp = requests.get(
                f"https://api.bilibili.com/x/web-interface/view?bvid={self.bvid}",
                headers=self.headers,
                timeout=10,
            )
            data = resp.json()

            if data.get("code") == 0:
                self.video_data = data.get("data", {})
                self.aid = self.video_data.get("aid")
                self.cid = self.video_data.get("cid")
                print(f"[Bilibili] 视频信息获取成功: aid={self.aid}, cid={self.cid}")
                return True
            else:
                print(f"[Bilibili] 获取视频信息失败: {data.get('message')}")
        except Exception as e:
            print(f"[Bilibili] 获取视频信息异常: {e}")

        return False

    def _get_play_url(self) -> Optional[dict]:
        """通过WBI签名API获取播放链接"""
        if not self.aid or not self.cid:
            return None

        try:
            params = {
                "avid": self.aid,
                "cid": self.cid,
                "qn": 127 if self.is_login else 64,
                "fnver": 0,
                "fnval": 4048 if self.is_login else 16,
                "fourk": 1,
            }

            print(
                f"[Bilibili] 登录状态: {'已登录' if self.is_login else '未登录'}, qn={params['qn']}, fnval={params['fnval']}"
            )

            signed_query = self._wbi_sign(params)
            url = f"https://api.bilibili.com/x/player/wbi/playurl?{signed_query}"

            print(f"[Bilibili] 请求播放链接: {url[:100]}...")

            resp = requests.get(url, headers=self.headers, timeout=10)
            data = resp.json()

            print(f"[Bilibili] API响应码: {data.get('code')}")
            print(f"[Bilibili] API消息: {data.get('message')}")

            if data.get("code") == 0:
                play_data = data.get("data", {})
                dash = play_data.get("dash", {})
                videos = dash.get("video", []) or []
                audios = dash.get("audio", []) or []

                print(f"[Bilibili] 播放链接获取成功")
                print(f"[Bilibili] 视频流数量: {len(videos)}")
                print(f"[Bilibili] 音频流数量: {len(audios)}")
                print(
                    f"[Bilibili] accept_quality: {play_data.get('accept_quality', [])}"
                )
                print(
                    f"[Bilibili] accept_description: {play_data.get('accept_description', [])}"
                )

                for i, v in enumerate(videos):
                    print(
                        f"[Bilibili] 视频流[{i}]: id={v.get('id')}, {v.get('width')}x{v.get('height')}, codecs={v.get('codecs', '')[:20]}"
                    )

                return play_data
            else:
                print(f"[Bilibili] 获取播放链接失败: {data.get('message')}")
        except Exception as e:
            print(f"[Bilibili] 获取播放链接异常: {e}")
            import traceback

            traceback.print_exc()

        return None

    def get_video_info(self) -> Optional[dict]:
        """获取完整视频信息"""
        if not self._get_video_info_api():
            return None

        play_data = self._get_play_url()

        try:
            # 基本信息
            title = self.video_data.get("title", "")
            desc = self.video_data.get("desc", "")
            cover = self.video_data.get("pic", "")
            if cover and cover.startswith("//"):
                cover = "https:" + cover

            # 作者信息
            owner = self.video_data.get("owner", {})
            author = owner.get("name", "")
            author_id = str(owner.get("mid", ""))
            author_avatar = owner.get("face", "")
            if author_avatar and author_avatar.startswith("//"):
                author_avatar = "https:" + author_avatar

            # 视频信息
            bvid = self.video_data.get("bvid", self.bvid or "")
            duration = self.video_data.get("duration", 0)
            pubdate = self.video_data.get("pubdate", 0)
            ctime = self.video_data.get("ctime", 0)

            # 分区信息
            tid = self.video_data.get("tid", 0)
            tid_v2 = self.video_data.get("tid_v2", 0)
            tname = self.video_data.get("tname", "")
            tname_v2 = self.video_data.get("tname_v2", "")

            # 其他基础信息
            copyright_type = self.video_data.get("copyright", 0)
            videos_count = self.video_data.get("videos", 1)
            state = self.video_data.get("state", 0)
            dynamic = self.video_data.get("dynamic", "")
            mission_id = self.video_data.get("mission_id", 0)
            season_id = self.video_data.get("season_id", 0)

            # 视频尺寸
            dimension = self.video_data.get("dimension", {})
            width = dimension.get("width", 0)
            height = dimension.get("height", 0)
            rotate = dimension.get("rotate", 0)

            # 统计数据
            stat = self.video_data.get("stat", {})
            # 原始数值
            view_count = stat.get("view", 0)
            like_count = stat.get("like", 0)
            reply_count = stat.get("reply", 0)
            danmaku_count = stat.get("danmaku", 0)
            coin_count = stat.get("coin", 0)
            favorite_count = stat.get("favorite", 0)
            share_count = stat.get("share", 0)
            # 格式化后的数值
            views = self._format_count(view_count)
            likes = self._format_count(like_count)
            comments = self._format_count(reply_count)
            danmaku = self._format_count(danmaku_count)
            coin = self._format_count(coin_count)
            favorite = self._format_count(favorite_count)
            shares = self._format_count(share_count)

            # 权限信息
            rights = self.video_data.get("rights", {})

            # 分P信息
            pages = self.video_data.get("pages", [])
            pages_info = []
            for page in pages:
                pages_info.append(
                    {
                        "cid": page.get("cid", 0),
                        "page": page.get("page", 1),
                        "part": page.get("part", ""),
                        "duration": page.get("duration", 0),
                        "dimension": page.get("dimension", {}),
                        "firstFrame": page.get("first_frame", ""),
                    }
                )

            # 字幕信息
            subtitle_data = self.video_data.get("subtitle", {})
            subtitles = []
            for sub in subtitle_data.get("list", []):
                subtitles.append(
                    {
                        "id": sub.get("id", 0),
                        "lan": sub.get("lan", ""),
                        "lanDoc": sub.get("lan_doc", ""),
                        "subtitleUrl": sub.get("subtitle_url", ""),
                        "type": sub.get("type", 0),
                        "aiType": sub.get("ai_type", 0),
                        "aiStatus": sub.get("ai_status", 0),
                    }
                )

            # 合集信息
            ugc_season = self.video_data.get("ugc_season", {})
            season_info = None
            if ugc_season:
                season_info = {
                    "id": ugc_season.get("id", 0),
                    "title": ugc_season.get("title", ""),
                    "cover": ugc_season.get("cover", ""),
                    "mid": ugc_season.get("mid", 0),
                    "intro": ugc_season.get("intro", ""),
                }

            # 视频/音频流
            video_url = ""
            audio_url = ""
            video_streams = []
            audio_stream = None

            if play_data:
                dash = play_data.get("dash", {})

                # 视频流
                videos = dash.get("video", []) or []
                if videos:
                    video_url = videos[0].get("baseUrl", "") or videos[0].get(
                        "base_url", ""
                    )

                    quality_map = {
                        127: ("8K", "8K 超高清"),
                        126: ("杜比视界", "杜比视界"),
                        125: ("HDR", "HDR 真彩色"),
                        120: ("4K", "4K 超清"),
                        116: ("1080P60", "1080P 60帧"),
                        112: ("1080P+", "1080P 高码率"),
                        80: ("1080P", "1080P 高清"),
                        74: ("720P60", "720P 60帧"),
                        64: ("720P", "720P 高清"),
                        32: ("480P", "480P 清晰"),
                        16: ("360P", "360P 流畅"),
                    }

                    for v in videos:
                        v_url = v.get("baseUrl", "") or v.get("base_url", "")
                        backup_urls = (
                            v.get("backupUrl", []) or v.get("backup_url", []) or []
                        )
                        width = v.get("width", 0)
                        height = v.get("height", 0)
                        quality_id = v.get("id", 0)
                        bandwidth = v.get("bandwidth", 0)
                        codecs = v.get("codecs", "")

                        short, name = quality_map.get(
                            quality_id, (f"{height}P", f"{height}P")
                        )
                        estimated_size = (
                            (bandwidth / 8) * duration if bandwidth and duration else 0
                        )

                        video_streams.append(
                            {
                                "id": quality_id,
                                "name": name,
                                "short": short,
                                "url": v_url,
                                "backupUrls": backup_urls,
                                "bitrate": bandwidth,
                                "width": width,
                                "height": height,
                                "codecs": codecs,
                                "size": self._format_size(estimated_size),
                                "sizeBytes": int(estimated_size),
                                "priority": quality_id,
                            }
                        )

                    # 按优先级排序，去重
                    video_streams.sort(key=lambda x: x["priority"], reverse=True)
                    seen_ids = set()
                    unique_streams = []
                    for s in video_streams:
                        if s["id"] not in seen_ids:
                            seen_ids.add(s["id"])
                            unique_streams.append(s)
                    video_streams = unique_streams

                # 音频流
                audios = dash.get("audio", []) or []
                dolby_data = dash.get("dolby") or {}
                dolby_audio = (
                    dolby_data.get("audio", []) or []
                    if isinstance(dolby_data, dict)
                    else []
                )
                flac_data = dash.get("flac") or {}
                flac_audio = (
                    flac_data.get("audio") if isinstance(flac_data, dict) else None
                )

                all_audios = audios + dolby_audio
                if flac_audio:
                    all_audios.append(flac_audio)

                if all_audios:
                    best_audio = max(
                        all_audios,
                        key=lambda x: x.get("bandwidth", 0) or x.get("id", 0),
                    )
                    audio_url = best_audio.get("baseUrl", "") or best_audio.get(
                        "base_url", ""
                    )
                    backup_urls = (
                        best_audio.get("backupUrl", [])
                        or best_audio.get("backup_url", [])
                        or []
                    )
                    bandwidth = best_audio.get("bandwidth", 0)

                    audio_stream = {
                        "url": audio_url,
                        "backupUrls": backup_urls,
                        "title": "",
                        "author": "",
                        "duration": duration,
                        "bitrate": bandwidth,
                        "uri": "",
                    }

            # 格式化发布时间
            create_time = (
                datetime.fromtimestamp(pubdate).strftime("%Y-%m-%d %H:%M:%S")
                if pubdate
                else ""
            )

            # 支持的清晰度列表
            accept_quality = play_data.get("accept_quality", []) if play_data else []
            accept_description = (
                play_data.get("accept_description", []) if play_data else []
            )

            print(
                f"[Bilibili] 解析完成: 视频流{len(video_streams)}个, 音频流{'1个' if audio_stream else '0个'}"
            )
            print(f"[Bilibili] 支持清晰度: {accept_description}")

            return {
                # 基础信息
                "bvid": bvid,
                "aid": self.aid,
                "cid": self.cid,
                "title": title,
                "desc": desc,
                "cover": cover,
                "videoUrl": video_url,
                "audioUrl": audio_url,
                "duration": duration,
                "platform": "bilibili",
                # 视频/音频流
                "videoStreams": video_streams,
                "audioStream": audio_stream,
                # 作者信息
                "author": author,
                "authorId": author_id,
                "authorAvatar": author_avatar,
                # 统计数据（格式化）
                "views": views,
                "likes": likes,
                "comments": comments,
                "danmaku": danmaku,
                "coin": coin,
                "favorite": favorite,
                "shares": shares,
                # 统计数据（原始数值）
                "stat": {
                    "view": view_count,
                    "like": like_count,
                    "reply": reply_count,
                    "danmaku": danmaku_count,
                    "coin": coin_count,
                    "favorite": favorite_count,
                    "share": share_count,
                },
                # 时间信息
                "createTime": create_time,
                "pubdate": pubdate,
                "ctime": ctime,
                # 分区信息
                "tid": tid,
                "tidV2": tid_v2,
                "tname": tname,
                "tnameV2": tname_v2,
                # 视频尺寸
                "dimension": {
                    "width": width,
                    "height": height,
                    "rotate": rotate,
                },
                # 其他信息
                "copyright": copyright_type,
                "videosCount": videos_count,
                "state": state,
                "dynamic": dynamic,
                "missionId": mission_id,
                "seasonId": season_id,
                # 权限信息
                "rights": rights,
                # 分P信息
                "pages": pages_info,
                # 字幕信息
                "subtitles": subtitles,
                # 合集信息
                "ugcSeason": season_info,
                # 清晰度信息
                "acceptQuality": accept_quality,
                "acceptDescription": accept_description,
                # 下载请求头
                "downloadHeaders": {
                    "Referer": "https://www.bilibili.com/",
                    "Origin": "https://www.bilibili.com",
                    "User-Agent": self.USER_AGENT,
                },
            }

        except Exception as e:
            print(f"[Bilibili] 获取视频信息错误: {e}")
            import traceback

            traceback.print_exc()
            return None

    def _format_count(self, count) -> str:
        """格式化数量"""
        if count is None:
            return "0"
        if isinstance(count, str):
            return count
        if count >= 100000000:
            return f"{count / 100000000:.1f}亿"
        if count >= 10000:
            return f"{count / 10000:.1f}万"
        return str(count)

    def _format_size(self, bytes_size: float) -> str:
        """格式化文件大小"""
        if bytes_size <= 0:
            return "未知"

        units = ["B", "KB", "MB", "GB"]
        unit_index = 0
        size = bytes_size

        while size >= 1024 and unit_index < len(units) - 1:
            size /= 1024
            unit_index += 1

        return f"{size:.1f}{units[unit_index]}"
