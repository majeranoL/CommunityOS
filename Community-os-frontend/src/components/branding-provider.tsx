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

function applyBranding(branding: {
  primaryColor?: string | null
  accentColor?: string | null
  sidebarColor?: string | null
} | undefined) {
  if (!branding) return

  const root = document.documentElement

  if (branding.primaryColor) {
    const oklch = hexToOklch(branding.primaryColor)
    if (oklch) {
      root.style.setProperty('--primary', oklch)
      root.style.setProperty('--ring', oklch)
      root.style.setProperty('--sidebar-ring', oklch)
    }
  }

  if (branding.accentColor) {
    const oklch = hexToOklch(branding.accentColor)
    if (oklch) {
      root.style.setProperty('--accent', oklch)
      root.style.setProperty('--sidebar-accent', oklch)
    }
  }

  if (branding.sidebarColor) {
    const oklch = hexToOklch(branding.sidebarColor)
    if (oklch) {
      root.style.setProperty('--sidebar', oklch)
    }
  }
}

function clearBranding() {
  const root = document.documentElement
  root.style.removeProperty('--primary')
  root.style.removeProperty('--ring')
  root.style.removeProperty('--sidebar-ring')
  root.style.removeProperty('--accent')
  root.style.removeProperty('--sidebar-accent')
  root.style.removeProperty('--sidebar')
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((state) => state.status)
  const { data: branding } = useBranding()

  useEffect(() => {
    if (status !== 'authenticated' || !branding) return

    const hasCustomColors = branding.primaryColor || branding.accentColor || branding.sidebarColor
    if (hasCustomColors) {
      applyBranding(branding)
    } else {
      clearBranding()
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

    return () => clearBranding()
  }, [status, branding])

  return <>{children}</>
}
