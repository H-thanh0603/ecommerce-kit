"use client";

import Image from "next/image";

/**
 * Ảnh tối ưu toàn site (next/image). Quy ước:
 * - wrapper span giữ aspect/kích thước + bo góc (vì Image fill cần khung có size)
 * - imgClassName cho hiệu ứng hover (group-hover:scale-105...)
 * - src rỗng → khung xám, không crash build/runtime
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
  if (!src) return <span className={`block bg-line/50 ${className || ""}`} aria-label={alt} />;
  return (
    <span className={`relative block overflow-hidden ${className || ""}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes || "(max-width: 768px) 100vw, 50vw"}
        className={`object-cover ${imgClassName || ""}`}
        priority={Boolean(eager)}
      />
    </span>
  );
}
