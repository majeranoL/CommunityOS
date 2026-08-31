export function storefrontUrl(slug: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/c/${encodeURIComponent(slug)}`
}
