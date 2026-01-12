"""抖音视频解析器"""

import copy
from datetime import datetime
from typing import Optional

import requests

from utils import BogusUtils, UrlParser


class DouyinParser:
    """抖音视频解析器"""

    def __init__(self, url: str):
        self.url = url
        self.utils = BogusUtils()
        self.headers = {
            "sec-ch-ua": '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
            "Accept": "application/json, text/plain, */*",
            "sec-ch-ua-mobile": "?0",
            "User-Agent": self.utils.user_agent,
            "sec-ch-ua-platform": '"Windows"',
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }
        self.ms_token = self.utils.get_ms_token()
        self.ttwid = "1%7CvDWCB8tYdKPbdOlqwNTkDPhizBaV9i91KjYLKJbqurg%7C1723536402%7C314e63000decb79f46b8ff255560b29f4d8c57352dad465b41977db4830b4c7e"
        self.webid = "7307457174287205926"
        self.aweme_id = UrlParser.get_video_id(url)
        self.data = None
        self.is_note = "/note/" in url

    @staticmethod
    def fetch_redirect_url(url: str) -> Optional[str]:
        """获取重定向后的真实 URL"""
        return UrlParser.fetch_redirect_url(url, "douyin.com")

    def parse(self) -> Optional[dict]:
        """解析视频数据"""
        if not self.aweme_id:
            return None

        referer_url = (
            f"https://www.douyin.com/video/{self.aweme_id}?previous_page=web_code_link"
        )
        play_url = f"https://www.douyin.com/aweme/v1/web/aweme/detail/?device_platform=webapp&aid=6383&channel=channel_pc_web&aweme_id={self.aweme_id}&update_version_code=170400&pc_client_type=1&version_code=190500&version_name=19.5.0&cookie_enabled=true&screen_width=1536&screen_height=864&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=127.0.0.0&browser_online=true&engine_name=Blink&engine_version=127.0.0.0&os_name=Windows&os_version=10&cpu_core_num=8&device_memory=8&platform=PC&downlink=1.25&effective_type=4g&round_trip_time=50&webid={self.webid}&msToken={self.ms_token}"

        headers = copy.deepcopy(self.headers)
        headers["Referer"] = referer_url
        headers["Cookie"] = (
            f"ttwid={self.ttwid}; UIFID_TEMP=973a3fd64dcc46a3490fd9b60d4a8e663b34df4ccc4bbcf97643172fb712d8b085a6744acabbffda742bf60a364e4bd6ba5522889cc6f6598b4ea0b83bec2c70bac5163dec36cdb8fb58ea1ae00a413d; s_v_web_id=verify_lzhq5z5k_lbhbXlzb_o9V2_4SQt_8VKz_WZhdN8ARwLk5; home_can_add_dy_2_desktop=%220%22; dy_swidth=1536; dy_sheight=864; stream_recommend_feed_params=%22%7B%5C%22cookie_enabled%5C%22%3Atrue%2C%5C%22screen_width%5C%22%3A1536%2C%5C%22screen_height%5C%22%3A864%2C%5C%22browser_online%5C%22%3Atrue%2C%5C%22cpu_core_num%5C%22%3A8%2C%5C%22device_memory%5C%22%3A8%2C%5C%22downlink%5C%22%3A10%2C%5C%22effective_type%5C%22%3A%5C%224g%5C%22%2C%5C%22round_trip_time%5C%22%3A50%7D%22; csrf_session_id=c25ac0fd3e72f260d4d666d4e5b59401; IsDouyinActive=false"
        )

        abogus = self.utils.get_abogus(play_url, self.utils.user_agent)
        url = f"{play_url}&a_bogus={abogus}"

        try:
            response = requests.get(url, headers=headers, verify=False, timeout=10)
            if response.text:
                self.data = response.json()

                return self.data
        except Exception as e:
            print(f"[Douyin] Parse error: {e}")

        return None

    def get_video_info(self) -> Optional[dict]:
        """获取完整视频信息"""
        if not self.data:
            self.parse()

        if not self.data or "aweme_detail" not in self.data:
            return None

        detail = self.data.get("aweme_detail", {})
        video_data = detail.get("video", {})
        author = detail.get("author", {})
        statistics = detail.get("statistics", {})
        music = detail.get("music", {})

        # 获取视频 URL
        video_url = self._get_video_url(video_data)

        # 获取封面 URL
        cover_url = self._get_cover_url(video_data, detail)

        # 获取图片列表（图文笔记）
        images = self._get_images(detail)

        # 获取视频流列表（多清晰度）
        video_streams = self._get_video_streams(video_data)

        # 获取音频流
        audio_stream = self._get_audio_stream(video_data, music)

        # 格式化统计数据
        def format_count(count):
            if count is None:
                return "0"
            if count >= 10000:
                return f"{count / 10000:.1f}万"
            return str(count)

        # 提取话题标签
        hashtags = []
        text_extra = detail.get("text_extra") or []
        for item in text_extra:
            if item and item.get("hashtag_name"):
                hashtags.append(
                    {
                        "id": item.get("hashtag_id", ""),
                        "name": item.get("hashtag_name", ""),
                    }
                )

        # 格式化发布时间
        create_time = detail.get("create_time", 0)
        create_time_str = (
            datetime.fromtimestamp(create_time).strftime("%Y-%m-%d %H:%M:%S")
            if create_time
            else ""
        )

        # 获取视频尺寸
        width = video_data.get("width", 0)
        height = video_data.get("height", 0)
        dimension = f"{width}x{height}" if width and height else ""

        # 获取视频时长（毫秒）
        duration_ms = video_data.get("duration", 0)
        duration_sec = duration_ms // 1000 if duration_ms else 0

        # 修复播放量显示问题：从statistics获取原始数值
        play_count = statistics.get("play_count", 0)
        print(
            f"[Douyin] 统计数据 - 播放: {play_count}, 点赞: {statistics.get('digg_count', 0)}, 评论: {statistics.get('comment_count', 0)}"
        )

        return {
            "awemeId": self.aweme_id,
            "title": detail.get("desc", ""),
            "cover": cover_url,
            "videoUrl": video_url,
            "duration": duration_sec,
            "durationMs": duration_ms,
            "platform": "douyin",
            "isNote": self.is_note or len(images) > 0,
            "images": images,
            # 视频流和音频流
            "videoStreams": video_streams,
            "audioStream": audio_stream,
            # 作者信息
            "author": author.get("nickname", ""),
            "authorId": author.get("uid", ""),
            "authorAvatar": (
                (author.get("avatar_thumb") or {}).get("url_list", [""])[0]
                if author.get("avatar_thumb")
                else ""
            ),
            "authorSignature": author.get("signature", ""),
            "authorWorks": format_count(author.get("aweme_count", 0)),
            # 统计数据
            "views": format_count(play_count),
            "viewsRaw": play_count,
            "likes": format_count(statistics.get("digg_count", 0)),
            "comments": format_count(statistics.get("comment_count", 0)),
            "shares": format_count(statistics.get("share_count", 0)),
            "collects": format_count(statistics.get("collect_count", 0)),
            # 其他信息
            "createTime": create_time_str,
            "createTimeRaw": create_time,
            "dimension": dimension,
            "width": width,
            "height": height,
            "hashtags": hashtags,
            # 权限
            "allowDownload": detail.get("status", {}).get("allow_download", True),
            "allowDuet": detail.get("status", {}).get("allow_duet", True),
            "allowStitch": detail.get("status", {}).get("allow_stitch", True),
            "allowShare": detail.get("status", {}).get("allow_share", True),
            # 游戏信息
            "gameInfo": self._get_game_info(detail),
            # 合集信息
            "mixInfo": self._get_mix_info(detail),
            # 音乐信息
            "musicInfo": self._get_music_info(music),
        }

    def _get_video_url(self, video_data: dict) -> Optional[str]:
        """获取视频 URL"""
        # 方式1: 从 bit_rate 获取高清视频
        bit_rate = video_data.get("bit_rate")
        if bit_rate and len(bit_rate) > 0:
            play_addr_list = bit_rate[0].get("play_addr", {}).get("url_list", [])
            if len(play_addr_list) > 2:
                return play_addr_list[2]
            elif len(play_addr_list) > 0:
                return play_addr_list[0]

        # 方式2: 从 play_addr 直接获取
        play_addr = video_data.get("play_addr", {}).get("url_list", [])
        if play_addr:
            return play_addr[0]

        return None

    def _get_cover_url(self, video_data: dict, detail: dict) -> Optional[str]:
        """获取封面 URL"""
        # 方式1: 从 cover_original_scale 获取
        cover_scale = video_data.get("cover_original_scale") or {}
        cover = cover_scale.get("url_list") or []
        if cover:
            return cover[0]

        # 方式2: 从 cover 获取
        cover_obj = video_data.get("cover") or {}
        cover = cover_obj.get("url_list") or []
        if cover:
            return cover[0]

        # 方式3: 如果是图文笔记，返回第一张图片
        images = detail.get("images") or []
        if images and len(images) > 0:
            url_list = (images[0].get("url_list") if images[0] else None) or []
            if url_list:
                return url_list[0]

        return None

    def _get_images(self, detail: dict) -> list:
        """获取图文笔记的所有图片"""
        images = detail.get("images") or []
        image_urls = []
        for img in images:
            if img:
                url_list = img.get("url_list", [])
                if url_list:
                    image_urls.append(url_list[0])
        return image_urls

    def _get_game_info(self, detail: dict) -> Optional[dict]:
        """获取游戏信息"""
        game_tag = detail.get("game_tag_info")
        if game_tag:
            return {
                "name": game_tag.get("game_name", ""),
                "contentType": game_tag.get("content_type_name", ""),
            }
        return None

    def _get_mix_info(self, detail: dict) -> Optional[dict]:
        """获取合集信息"""
        mix_info = detail.get("mix_info")
        if mix_info:
            return {
                "id": mix_info.get("mix_id", ""),
                "name": mix_info.get("mix_name", ""),
                "desc": mix_info.get("desc", ""),
                "currentEp": mix_info.get("statis", {}).get("current_episode", 0),
                "totalEp": mix_info.get("statis", {}).get("updated_to_episode", 0),
            }
        return None

    def _get_video_streams(self, video_data: dict) -> list:
        """获取多清晰度视频流"""
        streams = []

        # 清晰度映射 - 完整版
        quality_map = {
            "low": {"name": "流畅", "short": "360P", "priority": 0},
            "lower": {"name": "流畅", "short": "360P", "priority": 0},
            "lowest": {"name": "极速", "short": "240P", "priority": -1},
            "normal": {"name": "标清", "short": "480P", "priority": 1},
            "high": {"name": "高清", "short": "720P", "priority": 2},
            "higher": {"name": "超清", "short": "1080P", "priority": 3},
            "highest": {"name": "蓝光", "short": "1080P+", "priority": 4},
            "adapt_540_1": {"name": "清晰", "short": "540P", "priority": 1},
            "adapt_720_1": {"name": "高清", "short": "720P", "priority": 2},
            "adapt_1080_1": {"name": "超清", "short": "1080P", "priority": 3},
            "adapt_2k_1": {"name": "2K", "short": "2K", "priority": 4},
            "adapt_4k_1": {"name": "4K", "short": "4K", "priority": 5},
            "adapt_low_540_0": {"name": "流畅", "short": "540P", "priority": 1},
            "adapt_low_720_0": {"name": "流畅", "short": "720P", "priority": 2},
            "adapt_low_1080_0": {"name": "流畅", "short": "1080P", "priority": 3},
            "adapt_lower_540_1": {"name": "极速", "short": "540P", "priority": 0},
            "adapt_lower_720_1": {"name": "极速", "short": "720P", "priority": 1},
            "adapt_lower_1080_1": {"name": "极速", "short": "1080P", "priority": 2},
            "adapt_lowest_540_1": {"name": "省流", "short": "540P", "priority": 0},
            "adapt_lowest_720_1": {"name": "省流", "short": "720P", "priority": 1},
            "adapt_lowest_1080_1": {"name": "省流", "short": "1080P", "priority": 2},
            "low_540_0": {"name": "流畅", "short": "540P", "priority": 1},
            "low_720_0": {"name": "流畅", "short": "720P", "priority": 2},
            "low_1080_0": {"name": "流畅", "short": "1080P", "priority": 3},
            "lower_540_0": {"name": "极速", "short": "540P", "priority": 0},
            "lower_720_0": {"name": "极速", "short": "720P", "priority": 1},
            "lower_1080_0": {"name": "极速", "short": "1080P", "priority": 2},
            "normal_540_0": {"name": "标清", "short": "540P", "priority": 1},
            "normal_720_0": {"name": "标清", "short": "720P", "priority": 2},
            "normal_1080_0": {"name": "标清", "short": "1080P", "priority": 3},
        }

        def parse_quality_name(gear_name: str, width: int, height: int) -> dict:
            """智能解析清晰度名称"""
            if gear_name in quality_map:
                return quality_map[gear_name]

            resolution = max(width, height)
            if resolution >= 2160:
                return {"name": "4K 超高清", "short": "4K", "priority": 5}
            elif resolution >= 1440:
                return {"name": "2K 高清", "short": "2K", "priority": 4}
            elif resolution >= 1080:
                return {"name": "超清", "short": "1080P", "priority": 3}
            elif resolution >= 720:
                return {"name": "高清", "short": "720P", "priority": 2}
            elif resolution >= 540:
                return {"name": "清晰", "short": "540P", "priority": 1}
            elif resolution >= 480:
                return {"name": "标清", "short": "480P", "priority": 1}
            elif resolution >= 360:
                return {"name": "流畅", "short": "360P", "priority": 0}
            else:
                return {"name": "普通", "short": f"{resolution}P", "priority": 0}

        # 从 bit_rate 获取多清晰度视频
        bit_rate_list = video_data.get("bit_rate") or []
        duration_ms = video_data.get("duration", 0)

        for br in bit_rate_list:
            if not br:
                continue

            gear_name = br.get("gear_name", "")
            quality_type = br.get("quality_type", 0)
            bit_rate_val = br.get("bit_rate", 0)

            play_addr = br.get("play_addr") or {}
            url_list = play_addr.get("url_list") or []

            if not url_list:
                continue

            video_url = url_list[2] if len(url_list) > 2 else url_list[0]

            width = play_addr.get("width", 0) or br.get("width", 0)
            height = play_addr.get("height", 0) or br.get("height", 0)

            quality_info = parse_quality_name(gear_name, width, height)

            estimated_size = (
                (bit_rate_val / 8) * (duration_ms / 1000)
                if bit_rate_val and duration_ms
                else 0
            )

            streams.append(
                {
                    "id": quality_type,
                    "name": quality_info["name"],
                    "short": quality_info["short"],
                    "url": video_url,
                    "backupUrls": url_list,
                    "bitrate": bit_rate_val,
                    "width": width,
                    "height": height,
                    "size": self._format_size(estimated_size),
                    "sizeBytes": int(estimated_size),
                    "priority": quality_info["priority"],
                }
            )

        # 如果没有 bit_rate，从 play_addr 获取
        if not streams:
            play_addr = video_data.get("play_addr") or {}
            url_list = play_addr.get("url_list") or []
            if url_list:
                video_url = url_list[2] if len(url_list) > 2 else url_list[0]
                streams.append(
                    {
                        "id": 0,
                        "name": "默认画质",
                        "short": "SD",
                        "url": video_url,
                        "backupUrls": url_list,
                        "bitrate": 0,
                        "width": video_data.get("width", 0),
                        "height": video_data.get("height", 0),
                        "size": "未知",
                        "sizeBytes": 0,
                        "priority": 0,
                    }
                )

        # 按优先级排序，高清在前
        streams.sort(key=lambda x: x["priority"], reverse=True)

        # 按分辨率去重
        resolution_map = {}
        for stream in streams:
            short = stream["short"]
            if short not in resolution_map:
                resolution_map[short] = stream
            else:
                if stream["sizeBytes"] > resolution_map[short]["sizeBytes"]:
                    resolution_map[short] = stream

        unique_streams = list(resolution_map.values())
        unique_streams.sort(key=lambda x: x["priority"], reverse=True)

        return unique_streams

    def _get_audio_stream(self, video_data: dict, music: dict) -> Optional[dict]:
        """获取音频流"""
        # 方式1：从 music 字段获取独立音频流
        if music and isinstance(music, dict):
            play_url = music.get("play_url") or {}
            url_list = play_url.get("url_list") or []
            uri = play_url.get("uri", "")

            if url_list:
                audio_url = url_list[0]
                print(f"[Douyin Audio] 使用独立音频流: {audio_url[:80]}...")
                return {
                    "url": audio_url,
                    "backupUrls": url_list,
                    "title": music.get("title", ""),
                    "author": music.get("author", ""),
                    "duration": music.get("duration", 0),
                    "uri": uri,
                    "isVideoAudio": False,
                }

        print(f"[Douyin Audio] 没有独立音频流，使用视频内嵌音轨")

        # 方式2：从视频 bit_rate 中获取
        bit_rate_list = video_data.get("bit_rate") or []
        if bit_rate_list:
            br = bit_rate_list[0]
            if br:
                play_addr = br.get("play_addr") or {}
                url_list = play_addr.get("url_list") or []
                if url_list:
                    video_url = url_list[2] if len(url_list) > 2 else url_list[0]
                    return {
                        "url": video_url,
                        "backupUrls": url_list,
                        "title": music.get("title", "") if music else "",
                        "author": music.get("author", "") if music else "",
                        "duration": (
                            video_data.get("duration", 0) // 1000
                            if video_data.get("duration")
                            else 0
                        ),
                        "uri": "",
                        "isVideoAudio": True,
                    }

        # 方式3：从 play_addr 直接获取
        play_addr = video_data.get("play_addr") or {}
        url_list = play_addr.get("url_list") or []
        if url_list:
            video_url = url_list[0]
            return {
                "url": video_url,
                "backupUrls": url_list,
                "title": music.get("title", "") if music else "",
                "author": music.get("author", "") if music else "",
                "duration": (
                    video_data.get("duration", 0) // 1000
                    if video_data.get("duration")
                    else 0
                ),
                "uri": "",
                "isVideoAudio": True,
            }

        return None

    def _get_music_info(self, music: dict) -> Optional[dict]:
        """获取音乐信息"""
        if not music:
            return None

        cover = (
            music.get("cover_large")
            or music.get("cover_medium")
            or music.get("cover_thumb")
            or {}
        )
        cover_url = (cover.get("url_list") or [""])[0] if cover else ""

        return {
            "id": music.get("mid", ""),
            "title": music.get("title", ""),
            "author": music.get("author", ""),
            "album": music.get("album", ""),
            "duration": music.get("duration", 0),
            "cover": cover_url,
            "isOriginal": music.get("is_original", False),
        }

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
