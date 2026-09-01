"use client";

interface FrontierMarkProps {
  className?: string;
  size?: number;
}

export function FrontierMark({ className, size = 40 }: FrontierMarkProps) {
  return (
    <span className={className} style={{ display: 'inline-flex', width: size, height: size }} role="img" aria-label="Frontier">
      <img src="/logo/frontier-mark.svg" alt="" width={size} height={size} className="block dark:hidden" />
      <img src="/logo/frontier-mark-on-dark.svg" alt="" width={size} height={size} className="hidden dark:block" />
    </span>
  );
}
