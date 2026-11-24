"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface BackButtonProps {
  href?: string;
  label?: string;
  className?: string;
}

export function BackButton({ href, label = "Back", className = "" }: BackButtonProps) {
  const router = useRouter();

  if (href) {
    return (
      <Link href={href} className={`btn btn-back ${className}`}>
        <span aria-hidden="true" style={{ fontSize: "14px", lineHeight: 1 }}>←</span>
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`btn btn-back ${className}`}
      aria-label={label}
    >
      <span aria-hidden="true" style={{ fontSize: "14px", lineHeight: 1 }}>←</span>
      <span>{label}</span>
    </button>
  );
}
