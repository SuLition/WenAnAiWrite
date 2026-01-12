"""
HTTP 客户端工具 - 带重试机制
"""

import time
import requests
from typing import Optional, Dict, Any, Tuple

# 可重试的异常类型
RETRYABLE_EXCEPTIONS = (
    requests.exceptions.SSLError,
    requests.exceptions.ConnectionError,
    requests.exceptions.Timeout,
    requests.exceptions.ChunkedEncodingError,
)


def request_with_retry(
    method: str,
    url: str,
    headers: Optional[Dict] = None,
    data: Any = None,
    json: Any = None,
    timeout: int = 30,
    retries: int = 3,
    retry_delay: float = 1.0,
    **kwargs,
) -> Tuple[bool, Any]:
    """
    带重试机制的 HTTP 请求

    Args:
        method: 请求方法 (GET/POST/PUT/DELETE)
        url: 请求 URL
        headers: 请求头
        data: 请求体（原始数据）
        json: 请求体（JSON）
        timeout: 超时时间（秒）
        retries: 最大重试次数
        retry_delay: 重试间隔（秒）
        **kwargs: 其他 requests 参数

    Returns:
        (success, result): success 为 True 时 result 是 Response，False 时是错误信息
    """
    last_error = None

    for attempt in range(retries):
        try:
            response = requests.request(
                method=method.upper(),
                url=url,
                headers=headers,
                data=data,
                json=json,
                timeout=timeout,
                **kwargs,
            )
            return True, response

        except RETRYABLE_EXCEPTIONS as e:
            last_error = e
            print(
                f"[HTTPClient] Attempt {attempt + 1}/{retries} failed: {type(e).__name__}: {e}"
            )
            if attempt < retries - 1:
                time.sleep(retry_delay)
                continue

        except Exception as e:
            # 不可重试的错误，直接返回
            return False, str(e)

    return False, str(last_error)


def post_with_retry(url: str, **kwargs) -> Tuple[bool, Any]:
    """带重试的 POST 请求"""
    return request_with_retry("POST", url, **kwargs)


def get_with_retry(url: str, **kwargs) -> Tuple[bool, Any]:
    """带重试的 GET 请求"""
    return request_with_retry("GET", url, **kwargs)
