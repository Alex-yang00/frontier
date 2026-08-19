"use client";

interface FrontierMarkProps {
  className?: string;
  size?: number;
}

export function FrontierMark({ className, size = 40 }: FrontierMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Frontier"
    >
      <rect x="3" y="3" width="42" height="42" rx="8" fill="#0a0a0b" />
      <path d="M15 12v24M15 13h17M15 23h13" fill="none" stroke="#fffdf9" strokeWidth="4" strokeLinecap="square" />
      <path d="M31 27v9M27 31h9" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="square" />
    </svg>
  );
}
