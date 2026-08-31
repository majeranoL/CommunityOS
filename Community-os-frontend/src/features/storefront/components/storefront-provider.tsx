import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useStorefrontCommunity } from '@/features/storefront/hooks/use-storefront'
import { StorefrontContext } from '@/features/storefront/storefront-context'

function hexToOklch(hex: string): string | null {
  if (!hex || !hex.startsWith('#')) return null
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const linear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  const rl = linear(r),
    gl = linear(g),
    bl = linear(b)

  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl

  const lc = Math.cbrt(l),
    mc = Math.cbrt(m),
    sc = Math.cbrt(s)
  const L = 0.2104542553 * lc + 0.793617785 * mc - 0.0040720468 * sc
  const a = 1.9779984951 * lc - 2.428592205 * mc + 0.4505937099 * sc
  const b2 = 0.0259040371 * lc + 0.7827717662 * mc - 0.808675766 * sc

  const C = Math.sqrt(a * a + b2 * b2)
  const h = Math.atan2(b2, a) * (180 / Math.PI)

  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${((h % 360) + 360) % 360})`
}

const STYLE_ID = 'communityos-storefront-branding'

function injectStorefrontStyle(branding: {
  primaryColor?: string | null
  accentColor?: string | null
}) {
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = STYLE_ID
    document.head.appendChild(styleEl)
  }

  const lightRules: string[] = []
  const darkRules: string[] = []

  if (branding.primaryColor) {
    const oklch = hexToOklch(branding.primaryColor)
    if (oklch) {
      const rule = `--primary:${oklch};--ring:${oklch};`
      lightRules.push(rule)
      darkRules.push(rule)
    }
  }

  if (branding.accentColor) {
    const oklch = hexToOklch(branding.accentColor)
    if (oklch) {
      const rule = `--accent:${oklch};`
      lightRules.push(rule)
      darkRules.push(rule)
    }
  }

  if (lightRules.length === 0 && darkRules.length === 0) {
    removeStorefrontStyle()
    return
  }

  styleEl.textContent = `:root{${lightRules.join('')}}.dark{${darkRules.join('')}}`
}

function removeStorefrontStyle() {
  document.getElementById(STYLE_ID)?.remove()
}

export function StorefrontProvider({
  slug,
  children,
}: {
  slug: string | undefined
  children: ReactNode
}) {
  const { data: community } = useStorefrontCommunity(slug)

  useEffect(() => {
    if (!community) return
    injectStorefrontStyle(community.branding)

    let link: HTMLLinkElement | null = null
    const logoUrl = community.branding.logoUrl
    if (logoUrl) {
      link = document.createElement('link')
      link.rel = 'icon'
      link.href = logoUrl
      document.head.appendChild(link)
    }

    return () => {
      removeStorefrontStyle()
      link?.remove()
    }
  }, [community])

  return (
    <StorefrontContext.Provider value={community ?? null}>
      {children}
    </StorefrontContext.Provider>
  )
}
