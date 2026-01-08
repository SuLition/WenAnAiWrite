#!/usr/bin/env python3
"""
视频解析服务 - 支持抖音、B站、小红书
"""

import os
import base64
import shutil
import tempfile
import subprocess
import warnings
from typing import Optional

import requests
import urllib3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from utils import UrlParser
from parsers import DouyinParser, BilibiliParser, XiaohongshuParser
from parsers.xiaohongshu import get_xhs_cookie, set_xhs_cookie

warnings.filterwarnings("ignore", category=urllib3.exceptions.InsecureRequestWarning)

# B站 Cookie 配置
BILIBILI_COOKIE = os.environ.get('BILIBILI_COOKIE', '')


# ==================== FastAPI 应用 ====================

app = FastAPI(
    title="视频解析服务",
    description="支持抖音、B站、小红书视频解析 API",
    version="2.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== 请求/响应模型 ====================

class ParseRequest(BaseModel):
    url: str
    cookie: Optional[str] = None


class CookieRequest(BaseModel):
    cookie: str


class ParseResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
    needCookie: Optional[bool] = None


class ExtractAudioRequest(BaseModel):
    video_url: str
    platform: str = 'xiaohongshu'


class ExtractAudioResponse(BaseModel):
    success: bool
    message: str
    audio_base64: Optional[str] = None
    audio_size: Optional[int] = None
    duration: Optional[int] = None


# ==================== 健康检查 ====================

@app.get("/")
async def root():
    """健康检查"""
    return {"status": "ok", "service": "video-parser"}


@app.get("/health")
async def health():
    """健康检查"""
    return {"status": "healthy", "xhs_cookie_configured": bool(get_xhs_cookie())}


# ==================== Cookie 配置 ====================

@app.post("/config/xhs-cookie")
async def config_xhs_cookie(request: CookieRequest):
    """配置小红书 Cookie"""
    set_xhs_cookie(request.cookie)
    return {"success": True, "message": "Cookie 配置成功"}


@app.get("/config/xhs-cookie")
async def get_xhs_cookie_status():
    """获取小红书 Cookie 配置状态"""
    cookie = get_xhs_cookie()
    return {
        "configured": bool(cookie),
        "cookie_preview": cookie[:50] + "..." if len(cookie) > 50 else cookie
    }


@app.post("/config/bilibili-cookie")
async def config_bilibili_cookie(request: CookieRequest):
    """配置B站 Cookie"""
    global BILIBILI_COOKIE
    BILIBILI_COOKIE = request.cookie
    return {"success": True, "message": "B站 Cookie 配置成功"}


@app.get("/config/bilibili-cookie")
async def get_bilibili_cookie_status():
    """获取B站 Cookie 配置状态"""
    return {
        "configured": bool(BILIBILI_COOKIE),
        "cookie_preview": BILIBILI_COOKIE[:50] + "..." if len(BILIBILI_COOKIE) > 50 else BILIBILI_COOKIE
    }


# ==================== 抖音解析 ====================

@app.post("/parse", response_model=ParseResponse)
async def parse_douyin(request: ParseRequest):
    """解析抖音视频"""
    try:
        url = request.url.strip()
        
        # 从文本中提取 URL
        extracted_url = UrlParser.get_url(url)
        if not extracted_url:
            extracted_url = url
        
        # 检查是否是短链接，需要重定向
        if 'v.douyin.com' in extracted_url or not ('douyin.com/video' in extracted_url or 'douyin.com/note' in extracted_url):
            real_url = DouyinParser.fetch_redirect_url(extracted_url)
            if real_url:
                extracted_url = real_url
        
        # 解析视频
        parser = DouyinParser(extracted_url)
        video_info = parser.get_video_info()
        
        if video_info:
            return ParseResponse(success=True, message="解析成功", data=video_info)
        else:
            return ParseResponse(success=False, message="解析失败，请检查链接是否正确")
    
    except Exception as e:
        print(f"[Douyin] Parse error: {e}")
        import traceback
        traceback.print_exc()
        return ParseResponse(success=False, message=f"解析出错: {str(e)}")


# ==================== B站解析 ====================

@app.post("/parse/bilibili", response_model=ParseResponse)
async def parse_bilibili(request: ParseRequest):
    """解析B站视频"""
    try:
        url = request.url.strip()
        cookie = request.cookie
        
        print("="*60)
        print("[Bilibili API] 收到解析请求")
        print("="*60)
        
        # 从文本中提取 URL
        extracted_url = UrlParser.get_url(url)
        if not extracted_url:
            extracted_url = url
        
        print(f"[Bilibili API] 原始输入: {url[:100]}..." if len(url) > 100 else f"[Bilibili API] 原始输入: {url}")
        print(f"[Bilibili API] 提取URL: {extracted_url}")
        print(f"[Bilibili API] Cookie长度: {len(cookie) if cookie else 0}")
        
        if cookie:
            print(f"[Bilibili API] Cookie包含 SESSDATA: {'SESSDATA' in cookie}")
            print(f"[Bilibili API] Cookie包含 bili_jct: {'bili_jct' in cookie}")
            print(f"[Bilibili API] Cookie包含 DedeUserID: {'DedeUserID' in cookie}")
        
        # 检查是否是短链接，需要重定向
        if 'b23.tv' in extracted_url:
            real_url = BilibiliParser.fetch_redirect_url(extracted_url)
            if real_url:
                extracted_url = real_url
                print(f"[Bilibili] Redirect URL: {extracted_url}")
        
        # 解析视频
        parser = BilibiliParser(extracted_url, cookie)
        video_info = parser.get_video_info()
        
        if video_info:
            return ParseResponse(success=True, message="解析成功", data=video_info)
        else:
            return ParseResponse(success=False, message="解析失败，请检查链接是否正确")
    
    except Exception as e:
        print(f"[Bilibili] Parse error: {e}")
        import traceback
        traceback.print_exc()
        return ParseResponse(success=False, message=f"解析出错: {str(e)}")


# ==================== 小红书解析 ====================

@app.post("/parse/xiaohongshu", response_model=ParseResponse)
async def parse_xiaohongshu(request: ParseRequest):
    """解析小红书视频/图文"""
    try:
        url = request.url.strip()
        
        # 从文本中提取 URL
        extracted_url = UrlParser.get_url(url)
        if not extracted_url:
            extracted_url = url
        
        print(f"[XHS] Extracted URL: {extracted_url}")
        
        real_url = extracted_url
        
        # 判断链接类型
        if 'xhslink.com' in extracted_url:
            real_url = XiaohongshuParser.fetch_redirect_url(extracted_url)
            if not real_url:
                return ParseResponse(success=False, message="短链接解析失败，请检查链接是否有效")
            print(f"[XHS] Short link redirect: {real_url}")
        elif 'xiaohongshu.com' in extracted_url:
            real_url = extracted_url
            print(f"[XHS] Long link: {real_url}")
        else:
            return ParseResponse(success=False, message="不支持的链接格式")
        
        print(f"[XHS] Final URL: {real_url}")
        
        # 解析视频 - 添加重试机制
        max_attempts = 3
        video_info = None
        last_error = None
        
        for attempt in range(max_attempts):
            try:
                parser = XiaohongshuParser(real_url)
                video_info = parser.get_video_info()
                if video_info and (video_info.get('videoUrl') or video_info.get('images')):
                    break
                print(f"[XHS] Attempt {attempt + 1} failed, retrying...")
            except Exception as e:
                last_error = e
                print(f"[XHS] Attempt {attempt + 1} error: {e}")
        
        if video_info:
            return ParseResponse(success=True, message="解析成功", data=video_info)
        else:
            error_msg = "解析失败，请检查链接是否有效"
            if last_error:
                error_msg += f" ({str(last_error)})"
            return ParseResponse(success=False, message=error_msg)
    
    except Exception as e:
        print(f"[XHS] Parse error: {e}")
        import traceback
        traceback.print_exc()
        return ParseResponse(success=False, message=f"解析出错: {str(e)}")


# ==================== 音频提取 ====================

@app.post("/extract-audio", response_model=ExtractAudioResponse)
async def extract_audio(request: ExtractAudioRequest):
    """从视频中提取音频（使用 FFmpeg）"""
    video_url = request.video_url
    platform = request.platform
    
    # 检查 FFmpeg 是否可用
    ffmpeg_path = shutil.which('ffmpeg')
    if not ffmpeg_path:
        return ExtractAudioResponse(success=False, message="FFmpeg 未安装，无法提取音频")
    
    temp_dir = None
    try:
        temp_dir = tempfile.mkdtemp(prefix='audio_extract_')
        video_path = os.path.join(temp_dir, 'video.mp4')
        audio_path = os.path.join(temp_dir, 'audio.mp3')
        
        print(f"[ExtractAudio] Downloading video from: {video_url[:60]}...")
        
        # 下载视频
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.xiaohongshu.com/' if platform == 'xiaohongshu' else 'https://www.douyin.com/'
        }
        
        resp = requests.get(video_url, headers=headers, stream=True, timeout=60)
        resp.raise_for_status()
        
        with open(video_path, 'wb') as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
        
        video_size = os.path.getsize(video_path)
        print(f"[ExtractAudio] Video downloaded: {video_size / 1024 / 1024:.1f}MB")
        
        # 使用 FFmpeg 提取音频
        cmd = [
            ffmpeg_path,
            '-i', video_path,
            '-vn',
            '-acodec', 'libmp3lame',
            '-ab', '64k',
            '-ar', '16000',
            '-ac', '1',
            '-y',
            audio_path
        ]
        
        print(f"[ExtractAudio] Running FFmpeg...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode != 0:
            print(f"[ExtractAudio] FFmpeg error: {result.stderr}")
            return ExtractAudioResponse(success=False, message=f"FFmpeg 提取失败: {result.stderr[:200]}")
        
        if not os.path.exists(audio_path):
            return ExtractAudioResponse(success=False, message="音频提取失败，未生成音频文件")
        
        audio_size = os.path.getsize(audio_path)
        print(f"[ExtractAudio] Audio extracted: {audio_size / 1024:.1f}KB")
        
        with open(audio_path, 'rb') as f:
            audio_data = f.read()
        
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        estimated_duration = int(audio_size * 8 / 64000)
        
        return ExtractAudioResponse(
            success=True,
            message="音频提取成功",
            audio_base64=audio_base64,
            audio_size=audio_size,
            duration=estimated_duration
        )
        
    except requests.exceptions.Timeout:
        return ExtractAudioResponse(success=False, message="视频下载超时")
    except Exception as e:
        print(f"[ExtractAudio] Error: {e}")
        import traceback
        traceback.print_exc()
        return ExtractAudioResponse(success=False, message=f"音频提取失败: {str(e)}")
    finally:
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except:
                pass


# ==================== API 代理 ====================

class ProxyRequest(BaseModel):
    """API 代理请求"""
    url: str
    method: str = 'GET'
    headers: Optional[dict] = None
    body: Optional[str] = None


from fastapi import Query
from fastapi.responses import StreamingResponse


@app.get("/proxy-audio")
async def proxy_audio(url: str = Query(...), platform: str = Query('bilibili')):
    """音频代理 - 解决跨域问题"""
    try:
        # 根据平台设置请求头
        if platform == 'bilibili':
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.bilibili.com',
                'Origin': 'https://www.bilibili.com',
            }
        elif platform == 'douyin':
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.douyin.com',
            }
        elif platform == 'xiaohongshu':
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.xiaohongshu.com',
            }
        else:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        
        print(f"[Proxy Audio] Platform: {platform}, URL: {url[:80]}...")
        
        # 请求音频
        resp = requests.get(url, headers=headers, stream=True, timeout=30)
        resp.raise_for_status()
        
        # 获取内容类型
        content_type = resp.headers.get('Content-Type', 'audio/mpeg')
        content_length = resp.headers.get('Content-Length')
        
        # 返回流式响应
        def generate():
            for chunk in resp.iter_content(chunk_size=8192):
                yield chunk
        
        response_headers = {
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
        }
        if content_length:
            response_headers['Content-Length'] = content_length
        
        return StreamingResponse(
            generate(),
            media_type=content_type,
            headers=response_headers
        )
        
    except requests.exceptions.Timeout:
        return {'success': False, 'message': '音频请求超时'}
    except Exception as e:
        print(f"[Proxy Audio] Error: {e}")
        return {'success': False, 'message': str(e)}


@app.post("/proxy/bilibili")
async def proxy_bilibili(request: ProxyRequest):
    """B站 API 代理"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.bilibili.com',
            'Origin': 'https://www.bilibili.com',
            'Accept': 'application/json',
        }
        if request.headers:
            headers.update(request.headers)
        
        if request.method.upper() == 'GET':
            resp = requests.get(request.url, headers=headers, timeout=15)
        else:
            resp = requests.post(request.url, headers=headers, data=request.body, timeout=15)
        
        return {
            'success': True,
            'status': resp.status_code,
            'data': resp.json() if resp.headers.get('content-type', '').startswith('application/json') else resp.text,
            'cookies': dict(resp.cookies)
        }
    except Exception as e:
        print(f"[Proxy Bilibili] Error: {e}")
        return {'success': False, 'message': str(e)}


@app.post("/proxy/tencent")
async def proxy_tencent(request: ProxyRequest):
    """腾讯云 API 代理"""
    try:
        headers = {
            'Content-Type': 'application/json; charset=utf-8',
        }
        if request.headers:
            headers.update(request.headers)
        
        # body 是 JSON 字符串，需要编码为 bytes
        body_data = request.body.encode('utf-8') if request.body else None
        
        print(f"[Proxy Tencent] URL: {request.url}")
        print(f"[Proxy Tencent] Headers: {list(headers.keys())}")
        
        resp = requests.post(
            request.url,
            headers=headers,
            data=body_data,
            timeout=30
        )
        
        print(f"[Proxy Tencent] Response status: {resp.status_code}")
        
        return {
            'success': True,
            'status': resp.status_code,
            'data': resp.json()
        }
    except Exception as e:
        import traceback
        print(f"[Proxy Tencent] Error: {e}")
        traceback.print_exc()
        return {'success': False, 'message': str(e)}


@app.post("/proxy/doubao")
async def proxy_doubao(request: ProxyRequest):
    """豆包 AI API 代理"""
    try:
        headers = {
            'Content-Type': 'application/json',
        }
        if request.headers:
            headers.update(request.headers)
        
        # body 是 JSON 字符串，需要编码为 bytes
        body_data = request.body.encode('utf-8') if request.body else None
        
        resp = requests.post(
            request.url,
            headers=headers,
            data=body_data,
            timeout=60
        )
        
        return {
            'success': True,
            'status': resp.status_code,
            'data': resp.json()
        }
    except Exception as e:
        print(f"[Proxy Doubao] Error: {e}")
        return {'success': False, 'message': str(e)}


# ==================== 主程序 ====================

if __name__ == "__main__":
    import sys
    import uvicorn
    
    # 检测是否是 PyInstaller 打包后的环境
    if getattr(sys, 'frozen', False):
        # 生产环境（打包后）：直接传入 app 对象
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=3721,
            reload=False,
            log_level="info"
        )
    else:
        # 开发环境：使用字符串导入，支持热重载
        uvicorn.run(
            "main:app",
            host="127.0.0.1",
            port=3721,
            reload=False,
            log_level="info"
        )
