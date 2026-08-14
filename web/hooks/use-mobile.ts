import * as React from 'react'

const MOBILE_BREAKPOINT = 768

/**
 * Detects if the viewport is mobile-sized (< 768px).
 *
 * Uses matchMedia for efficient resize detection. Returns undefined
 * during SSR/initial render, then boolean after hydration.
 *
 * @returns true if viewport width < 768px, false otherwise
 *
 * @example
 * const isMobile = useIsMobile();
 * return isMobile ? <MobileNav /> : <DesktopNav />;
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener('change', onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return !!isMobile
}
