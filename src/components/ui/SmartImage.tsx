"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Ảnh tối ưu toàn site (next/image). Quy ước:
 * - wrapper span giữ aspect/kích thước + bo góc (vì Image fill cần khung có size)
 * - imgClassName cho hiệu ứng hover (group-hover:scale-105...)
 * - src rỗng hoặc tải lỗi → khung xám có icon, không crash build/runtime
 */
export function SmartImage({
  src,
  alt,
  className,
  imgClassName,
  sizes,
  eager,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  eager?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const broken = !src || failedSrc === src;
  if (broken) {
    return (
      <span
        className={`flex items-center justify-center bg-line/50 ${className || ""}`}
        role="img"
        aria-label={alt}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-1/4 w-1/4 max-h-10 max-w-10 text-muted/50" aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="M4 18l5-5 3.5 3.5L16 13l4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className={`relative block overflow-hidden ${className || ""}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes || "(max-width: 768px) 100vw, 50vw"}
        className={`object-cover ${imgClassName || ""}`}
        priority={Boolean(eager)}
        onError={() => setFailedSrc(src)}
      />
    </span>
  );
}
