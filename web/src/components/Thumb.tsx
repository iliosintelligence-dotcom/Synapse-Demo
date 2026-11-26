"use client";

import type { CSSProperties, ImgHTMLAttributes, SyntheticEvent } from "react";
import { isVideoUrl } from "@/lib/media";

/**
 * A listing picture: the photo as an <img>, exactly as before, or for a video its first frame (2026-11-26: videos showed
 * blank wherever a photo would show). The frame is the browser's own, from the first bytes of the file (preload=metadata,
 * #t=0.1), muted and never playing, so a thumbnail costs no more than a photo and needs nothing stored. The same way the
 * studio's upload grid already draws its videos. It fills the box an <img> would, since CSS written for `img` does not
 * reach a <video>.
 */
export function Thumb({ src, video, className, style, onError, alt = "", ...rest }: ImgHTMLAttributes<HTMLImageElement> & { src: string; video?: boolean }) {
  if (video || isVideoUrl(src)) {
    /* A caller's class sizes it (Tayo's 54px ticket picture); with no class it fills the box an <img> would have, since
       rules written as `.card img` do not reach a <video> (Greptile on #57). */
    const fill: CSSProperties = className
      ? { objectFit: "cover", display: "block", pointerEvents: "none", ...style }
      : { width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none", ...style };
    return (
      <video
        src={src.split("#")[0] + "#t=0.1"} muted playsInline preload="metadata" aria-label={alt || undefined}
        className={className} style={fill}
        onError={onError as unknown as (e: SyntheticEvent<HTMLVideoElement>) => void}
      />
    );
  }
  return <img src={src} alt={alt} className={className} style={style} onError={onError} {...rest} />;
}
