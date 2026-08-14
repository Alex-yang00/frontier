"use client"

/**
 * SubscriptionBadge -- small visual indicator for a user's subscription tier.
 *
 * Usage:
 *   <SubscriptionBadge tier="free" />
 *   <SubscriptionBadge tier="premium" />
 */

type Tier = "free" | "premium" | "api_developer" | "api_business" | "api_enterprise"

interface SubscriptionBadgeProps {
  tier: Tier
}

const TIER_CONFIG: Record<Tier, { label: string; className: string }> = {
  free: {
    label: "Free",
    className:
      "bg-gray-100 text-gray-700 border-gray-200",
  },
  premium: {
    label: "Premium",
    className:
      "bg-amber-50 text-amber-800 border-amber-300",
  },
  api_developer: {
    label: "Developer",
    className:
      "bg-blue-50 text-blue-800 border-blue-300",
  },
  api_business: {
    label: "Business",
    className:
      "bg-purple-50 text-purple-800 border-purple-300",
  },
  api_enterprise: {
    label: "Enterprise",
    className:
      "bg-emerald-50 text-emerald-800 border-emerald-300",
  },
}

export default function SubscriptionBadge({ tier }: SubscriptionBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  )
}
