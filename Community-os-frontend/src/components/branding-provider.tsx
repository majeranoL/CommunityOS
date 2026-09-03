import { useEffect } from 'react'
import { useBranding } from '@/features/branding/hooks/use-branding'
import { useAuthStore } from '@/store/auth-store'

function hexToOklch(hex: string): string | null {
  if (!hex || !hex.startsWith('#')) return null
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const rl = linear(r), gl = linear(g), bl = linear(b)

  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl

  const lc = Math.cbrt(l), mc = Math.cbrt(m), sc = Math.cbrt(s)
  const L = 0.2104542553 * lc + 0.7936177850 * mc - 0.0040720468 * sc
  const a = 1.9779984951 * lc - 2.4285922050 * mc + 0.4505937099 * sc
  const b2 = 0.0259040371 * lc + 0.7827717662 * mc - 0.8086757660 * sc

  const C = Math.sqrt(a * a + b2 * b2)
  const h = Math.atan2(b2, a) * (180 / Math.PI)

  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${((h % 360) + 360) % 360})`
}

const STYLE_ID = 'communityos-branding'

function injectBrandingStyle(branding: {
  primaryColor?: string | null
  accentColor?: string | null
  sidebarColor?: string | null
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
      lightRules.push(`--primary:${oklch};--ring:${oklch};--sidebar-ring:${oklch};`)
      darkRules.push(`--primary:${oklch};--ring:${oklch};--sidebar-ring:${oklch};`)
    }
  }

  if (branding.accentColor) {
    const oklch = hexToOklch(branding.accentColor)
    if (oklch) {
      lightRules.push(`--accent:${oklch};--sidebar-accent:${oklch};`)
      darkRules.push(`--accent:${oklch};--sidebar-accent:${oklch};`)
    }
  }

  if (branding.sidebarColor) {
    const hex = branding.sidebarColor
    if (hex.startsWith('#')) {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      const brightness = (r * 299 + g * 587 + b * 114) / 1000
      const isLight = brightness > 128

      lightRules.push(`--sidebar:${hexToOklch(hex)};`)

      if (isLight) {
        const darkBg = `oklch(0.205 0.006 285.885)`
        const darkFg = `oklch(0.985 0 0)`
        darkRules.push(`--sidebar:${darkBg};--sidebar-foreground:${darkFg};--sidebar-accent:oklch(0.372 0.044 257.287);--sidebar-accent-foreground:${darkFg};--sidebar-border:oklch(1 0 0 / 10%);--sidebar-ring:oklch(0.623 0.214 259.815);`)
      } else {
        darkRules.push(`--sidebar:${hexToOklch(hex)};`)
      }
    }
  }

  if (lightRules.length === 0 && darkRules.length === 0) {
    removeBrandingStyle()
    return
  }

  styleEl.textContent = `:root{${lightRules.join('')}}.dark{${darkRules.join('')}}`
}

function removeBrandingStyle() {
  const el = document.getElementById(STYLE_ID)
  if (el) el.remove()
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((state) => state.status)
  const { data: branding } = useBranding(status === 'authenticated')

  useEffect(() => {
    if (status !== 'authenticated' || !branding) return

    const hasCustomColors = branding.primaryColor || branding.accentColor || branding.sidebarColor
    if (hasCustomColors) {
      injectBrandingStyle(branding)
    } else {
      removeBrandingStyle()
    }

    if (branding.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = branding.faviconUrl
    }

    return () => removeBrandingStyle()
  }, [status, branding])

  return <>{children}</>
}
