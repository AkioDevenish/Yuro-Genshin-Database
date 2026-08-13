"use client";

import { useId } from "react";

export function BrandMark({ size = 40 }: { size?: number }) {
  // These pages render the lockup twice (desktop hero + mobile card). A fixed
  // gradient id would collide, and the copy inside the `display:none` branch
  // wins the lookup — leaving the visible mark with nothing to paint with.
  const gradientId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={gradientId} x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6EE7B7" />
          <stop offset="0.55" stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${gradientId})`} opacity="0.16" />
      <rect
        x="2.75"
        y="2.75"
        width="42.5"
        height="42.5"
        rx="12.25"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.5"
        opacity="0.65"
      />
      <path
        d="M14 32.5V16a1 1 0 0 1 1-1h3.2a1 1 0 0 1 1 1v16.5"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M24.5 32.5V22l4.6 4.4 4.4-4.4v10.5"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="29.1" cy="16.6" r="2.1" fill="#E9B949" />
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark size={compact ? 32 : 40} />
      {!compact && (
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight text-white">IICA Inventory</div>
          <div className="whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-white/40">
            Asset & Stock Control
          </div>
        </div>
      )}
    </div>
  );
}
