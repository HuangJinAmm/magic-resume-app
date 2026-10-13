/**
 * Shared image proxy used by both the SSR route (/api/proxy/image) and the
 * desktop client bridge. Bypasses hotlink protection when importing avatars or
 * pasted image URLs.
 */
export async function handleImageProxy(
  request: Request,
  fetcher: typeof fetch = fetch
): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return Response.json({ error: "缺少图片URL参数" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return Response.json({ error: "图片URL格式不正确" }, { status: 400 });
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return Response.json({ error: "只支持HTTP和HTTPS协议" }, { status: 400 });
    }

    let response: Response;
    try {
      response = await fetcher(imageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept:
            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          Referer: parsedUrl.origin
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      return Response.json({ error: `获取图片失败: ${message}` }, { status: 500 });
    }

    if (!response.ok) {
      return Response.json(
        { error: `获取图片失败: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    let imageBuffer: ArrayBuffer;
    try {
      imageBuffer = await response.arrayBuffer();
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      return Response.json({ error: `读取图片内容失败: ${message}` }, { status: 500 });
    }

    if (imageBuffer.byteLength === 0) {
      return Response.json({ error: "图片内容为空" }, { status: 400 });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new Response(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Surrogate-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return Response.json({ error: `处理图片请求时出错: ${message}` }, { status: 500 });
  }
}