"""小红书视频/图文解析器"""

import os
import re
import json
import urllib.parse
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse, parse_qs

import requests
from bs4 import BeautifulSoup

from utils import UrlParser


# 小红书 Cookie 配置（需要登录后获取）
XHS_COOKIE = os.environ.get('XHS_COOKIE', '')


def set_xhs_cookie(cookie: str):
    """设置小红书 Cookie"""
    global XHS_COOKIE
    XHS_COOKIE = cookie


def get_xhs_cookie() -> str:
    """获取小红书 Cookie"""
    return XHS_COOKIE


class XiaohongshuParser:
    """小红书视频/图文解析器"""
    
    def __init__(self, url: str, cookie: str = None):
        # 统一 URL 格式: /discovery/item/ -> /explore/
        url = self._normalize_url(url)
        self.url = url
        self.cookie = cookie or XHS_COOKIE
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Referer': 'https://www.xiaohongshu.com/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Ch-Ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        }
        if self.cookie:
            self.headers['Cookie'] = self.cookie
        self.data = None
        self.note_id = self._get_note_id(url)
    
    def _normalize_url(self, url: str) -> str:
        """统一 URL 格式"""
        try:
            parsed = urlparse(url)
            path = parsed.path
            
            # /discovery/item/xxx -> /explore/xxx
            if '/discovery/item/' in path:
                note_id = path.split('/discovery/item/')[-1].split('?')[0].split('/')[0]
                query_params = parse_qs(parsed.query)
                new_params = []
                if 'xsec_token' in query_params:
                    new_params.append(f"xsec_token={query_params['xsec_token'][0]}")
                if 'xsec_source' in query_params:
                    new_params.append(f"xsec_source={query_params['xsec_source'][0]}")
                
                new_url = f"https://www.xiaohongshu.com/explore/{note_id}"
                if new_params:
                    new_url += '?' + '&'.join(new_params)
                print(f"[XHS] URL normalized: {url} -> {new_url}")
                return new_url
            
            return url
        except Exception as e:
            print(f"[XHS] URL normalize error: {e}")
            return url
    
    def _get_note_id(self, url: str) -> Optional[str]:
        """从 URL 中提取笔记 ID"""
        try:
            parsed_url = urlparse(url)
            path_segments = parsed_url.path.strip('/').split('/')
            if path_segments:
                return path_segments[-1].split('?')[0]
            return None
        except Exception:
            return None
    
    @staticmethod
    def fetch_redirect_url(url: str) -> Optional[str]:
        """获取重定向后的真实 URL"""
        return UrlParser.fetch_redirect_url(url, 'xiaohongshu.com')
    
    def parse(self) -> bool:
        """解析页面数据"""
        try:
            resp = requests.get(self.url, headers=self.headers, timeout=10)
            resp.raise_for_status()
            html_content = resp.text
            
            # 使用 BeautifulSoup 搜索 script 标签
            page_obj = BeautifulSoup(html_content, 'html.parser')
            script_tags = page_obj.find_all('script')
            for script in script_tags:
                if script.string and '__INITIAL_STATE__' in script.string:
                    pattern = re.compile(r'window\.__INITIAL_STATE__\s*=\s*(\{.*\})', re.DOTALL)
                    match = pattern.search(script.string)
                    if match:
                        json_data = match.group(1)
                        json_data = json_data.rstrip(';')
                        json_data = json_data.replace('undefined', 'null')
                        self.data = json.loads(json_data)
                        return True
            
            # 备用方案：直接使用正则匹配
            pattern = re.compile(r'window\.__INITIAL_STATE__\s*=\s*(\{.*\})', re.DOTALL)
            match = pattern.search(html_content)
            if match:
                json_data = match.group(1)
                json_data = json_data.rstrip(';')
                json_data = json_data.replace('undefined', 'null')
                self.data = json.loads(json_data)
                return True
            
            print(f"[XHS] Failed to find __INITIAL_STATE__ in page")
            return False
            
        except Exception as e:
            print(f"[XHS] Parse error: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def get_video_info(self) -> Optional[dict]:
        """获取完整视频信息"""
        if not self.data:
            if not self.parse():
                return None
        
        if not self.data:
            return None
        
        try:
            first_note_id = self.data.get('note', {}).get('firstNoteId')
            if not first_note_id:
                print(f"[XHS] firstNoteId not found. Data keys: {list(self.data.keys())}")
                print(f"[XHS] Note keys: {list(self.data.get('note', {}).keys())}")
                # 尝试从 noteDetailMap 中获取第一个 note
                note_detail_map = self.data.get('note', {}).get('noteDetailMap', {})
                if note_detail_map:
                    first_note_id = list(note_detail_map.keys())[0]
                    print(f"[XHS] Using first key from noteDetailMap: {first_note_id}")
                else:
                    print(f"[XHS] 解析失败：小红书需要登录 Cookie 才能获取笔记数据")
                    return None
            
            note_detail = self.data['note']['noteDetailMap'].get(first_note_id, {}).get('note', {})
            if not note_detail:
                return None
            
            # 基本信息
            title = note_detail.get('title', '')
            desc = note_detail.get('desc', '')
            note_type = note_detail.get('type', '')
            is_video = note_type == 'video'
            
            # 作者信息
            user = note_detail.get('user', {})
            author = user.get('nickname', '')
            author_id = user.get('userId', '')
            author_avatar = user.get('avatar', '')
            
            # 统计数据
            interact_info = note_detail.get('interactInfo', {})
            likes = interact_info.get('likedCount', '0')
            comments = interact_info.get('commentCount', '0')  # 从 interactInfo 获取
            collects = interact_info.get('collectedCount', '0')
            shares = interact_info.get('shareCount', '0')
            
            # 封面图
            image_list = note_detail.get('imageList', [])
            cover_url = ''
            if image_list:
                cover_url = image_list[0].get('urlDefault', '')
                cover_url = cover_url.replace('\\u002F', '/')
            
            # 视频 URL
            video_url = ''
            video_streams = []
            audio_stream = None
            duration = 0
            
            if is_video:
                video_data = note_detail.get('video', {})
                
                # 方法1: 从 media.stream 获取视频流
                media = video_data.get('media', {})
                stream_data = media.get('stream', {})
                
                h264_streams = stream_data.get('h264', [])
                if h264_streams:
                    for idx, stream in enumerate(h264_streams):
                        master_url = stream.get('masterUrl', '')
                        backup_urls = stream.get('backupUrls', [])
                        if master_url:
                            video_url = master_url
                            duration = stream.get('duration', 0) // 1000
                            
                            size_bytes = stream.get('size', 0)
                            if size_bytes > 1024 * 1024:
                                size_str = f"{size_bytes / 1024 / 1024:.1f}MB"
                            elif size_bytes > 1024:
                                size_str = f"{size_bytes / 1024:.1f}KB"
                            else:
                                size_str = f"{size_bytes}B"
                            
                            quality_type = stream.get('qualityType', 'HD')
                            quality_name = {'SD': '标清', 'HD': '高清', 'FHD': '超清', 'UHD': '4K'}.get(quality_type, quality_type)
                            
                            video_streams.append({
                                'id': idx,
                                'name': quality_name,
                                'short': quality_type,
                                'url': master_url,
                                'backupUrls': backup_urls,
                                'bitrate': stream.get('avgBitrate', 0),
                                'width': stream.get('width', 0),
                                'height': stream.get('height', 0),
                                'size': size_str,
                                'sizeBytes': size_bytes,
                                'priority': 2,
                            })
                    
                    if video_url:
                        audio_stream = {
                            'url': video_url,
                            'backupUrls': backup_urls if backup_urls else [video_url],
                            'title': '',
                            'author': '',
                            'duration': duration,
                            'uri': '',
                            'isVideoAudio': True,
                        }
                
                # 方法2: 从 consumer.originVideoKey 获取
                if not video_url:
                    consumer = video_data.get('consumer', {})
                    origin_video_key = consumer.get('originVideoKey', '')
                    if origin_video_key:
                        origin_video_key = origin_video_key.replace('\\u002F', '/')
                        video_url = f"http://sns-video-bd.xhscdn.com/{origin_video_key}"
                        duration = video_data.get('capa', {}).get('duration', 0)
                        
                        video_streams = [{
                            'id': 0,
                            'name': '高清',
                            'short': 'HD',
                            'url': video_url,
                            'backupUrls': [video_url],
                            'bitrate': 0,
                            'width': video_data.get('width', 0),
                            'height': video_data.get('height', 0),
                            'size': '未知',
                            'sizeBytes': 0,
                            'priority': 2,
                        }]
                        
                        audio_stream = {
                            'url': video_url,
                            'backupUrls': [video_url],
                            'title': '',
                            'author': '',
                            'duration': duration,
                            'uri': '',
                            'isVideoAudio': True,
                        }
            
            # 图片列表
            images = []
            for img in image_list:
                img_url = img.get('urlDefault', '')
                if img_url:
                    img_url = img_url.replace('\\u002F', '/')
                    images.append(img_url)
            
            # 标签
            tag_list = note_detail.get('tagList', [])
            hashtags = []
            for tag in tag_list:
                tag_name = tag.get('name', '')
                if tag_name:
                    hashtags.append({
                        'id': tag.get('id', ''),
                        'name': tag_name
                    })
            
            # 发布时间
            time_val = note_detail.get('time', 0)
            create_time = ''
            if time_val:
                try:
                    create_time = datetime.fromtimestamp(time_val / 1000).strftime('%Y-%m-%d %H:%M:%S')
                except:
                    pass
            
            # 分辨率
            width = video_streams[0].get('width', 0) if video_streams else 0
            height = video_streams[0].get('height', 0) if video_streams else 0
            dimension = f'{width}x{height}' if width and height else ''
            
            return {
                'noteId': first_note_id,
                'title': title or desc[:50] if desc else '无标题',
                'desc': desc,
                'cover': cover_url,
                'videoUrl': video_url,
                'duration': duration,
                'platform': 'xiaohongshu',
                'isNote': not is_video,
                'isVideo': is_video,
                'images': images,
                
                'videoStreams': video_streams,
                'audioStream': audio_stream,
                
                'author': author,
                'authorId': author_id,
                'authorAvatar': author_avatar,
                
                'likes': str(likes),
                'comments': str(comments),
                'collects': str(collects),
                'shares': str(shares),
                
                'createTime': create_time,
                'hashtags': hashtags,
                
                # 统一格式字段（与 B站/抖音保持一致）
                'dimension': dimension,
                'width': width,
                'height': height,
            }
            
        except Exception as e:
            print(f"[XHS] Get video info error: {e}")
            import traceback
            traceback.print_exc()
            return None
