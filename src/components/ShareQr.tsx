import { useMemo, useState } from "react";
import { Smartphone, ZoomIn } from "lucide-react";
import qrcode from "qrcode-generator";
import "./share-qr.css";

export interface ShareQrProps {
  url: string;
  title?: string;
}

type QrResult =
  | { image: string; reason?: never }
  | { image?: never; reason: "invalid" | "long" | "unavailable" };

/** Keep the complete URL, including its content fragment, on this device. */
export function createShareQr(url: string): QrResult {
  let normalized: string;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
      return { reason: "invalid" };
    // WHATWG serialization percent-encodes Unicode paths, queries and fragments.
    // The QR library receives ASCII bytes; Chinese content is preserved in the URL.
    normalized = parsed.href;
  } catch {
    return { reason: "invalid" };
  }

  // Bound work for large guide snapshots before trying automatic QR sizing.
  if (new TextEncoder().encode(normalized).byteLength > 4096)
    return { reason: "long" };

  try {
    const code = qrcode(0, "M");
    code.addData(normalized, "Byte");
    code.make();
    // Very dense symbols are unsuitable for this compact sharing surface.
    if (code.getModuleCount() > 101) return { reason: "long" };
    // Four-module quiet zone, rendered at 4px/module before display scaling.
    return { image: code.createDataURL(4, 16) };
  } catch {
    return { reason: "unavailable" };
  }
}

export default function ShareQr({ url, title }: ShareQrProps) {
  const qr = useMemo(() => createShareQr(url), [url]);
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const expanded = expandedUrl === url;

  if (!qr.image) {
    return (
      <aside className="share-qr share-qr-fallback" aria-label="手机打开提示">
        <Smartphone size={19} aria-hidden="true" />
        <div className="share-qr-copy">
          <h3>也可以在手机打开</h3>
          <p>
            {qr.reason === "long"
              ? "这份链接内容较多，暂不显示二维码。复制分享链接到手机即可打开。"
              : "二维码暂时不可用，复制分享链接到手机即可打开。"}
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`share-qr${expanded ? " share-qr-expanded" : ""}`}
      aria-label="扫码在手机打开"
    >
      <button
        type="button"
        className="share-qr-image-button"
        aria-label={expanded ? "缩小分享二维码" : "放大分享二维码"}
        aria-expanded={expanded}
        onClick={() => setExpandedUrl(expanded ? null : url)}
      >
        <img
          src={qr.image}
          width={140}
          height={140}
          alt={`${title || "分享内容"}的二维码`}
        />
      </button>
      <div className="share-qr-copy">
        <h3>
          <Smartphone size={17} aria-hidden="true" /> 用手机打开
        </h3>
        <p>用手机相机扫码，继续查看这份分享，无需登录。</p>
        <span className="share-qr-hint">
          <ZoomIn size={14} aria-hidden="true" />
          {expanded ? "再次点击二维码可收起" : "点击二维码可放大"}
        </span>
      </div>
    </aside>
  );
}
