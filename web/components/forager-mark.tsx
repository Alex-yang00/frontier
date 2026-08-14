"use client";

interface ForagerMarkProps {
  className?: string;
  size?: number;
}

export function ForagerMark({ className, size = 40 }: ForagerMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Forager"
    >
      <rect x="3" y="3" width="42" height="42" rx="8" fill="#1c1a17" />
      <path d="M15 12v24M15 13h17M15 23h13" fill="none" stroke="#fffdf9" strokeWidth="4" strokeLinecap="square" />
      <path d="M31 27v9M27 31h9" fill="none" stroke="#c0512f" strokeWidth="3" strokeLinecap="square" />
    </svg>
  );
}
