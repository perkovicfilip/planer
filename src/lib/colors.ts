// Boja za novu aktivnost: što različitija od svih koje već postoje.

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const v = parseInt(n.slice(0, 6), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

function rgbToHex([r, g, b]: [number, number, number]) {
  return '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0) * 255, f(8) * 255, f(4) * 255]
}

function rgbToLab([r, g, b]: [number, number, number]): [number, number, number] {
  const lin = (c: number) => {
    c /= 255
    return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92
  }
  const R = lin(r)
  const G = lin(g)
  const B = lin(b)
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

function dist(a: string, b: string) {
  const [l1, a1, b1] = rgbToLab(hexToRgb(a))
  const [l2, a2, b2] = rgbToLab(hexToRgb(b))
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

const CANDIDATES: string[] = (() => {
  const out: string[] = []
  for (let h = 0; h < 360; h += 12) {
    out.push(rgbToHex(hslToRgb(h, 75, 48)))
    out.push(rgbToHex(hslToRgb(h, 70, 36)))
    out.push(rgbToHex(hslToRgb(h, 80, 62)))
  }
  return out
})()

/** Vrati boju koja je najdalje od svih postojećih (i dovoljno čitljiva sa belim tekstom). */
export function distinctColor(existing: string[]): string {
  const used = existing.filter((c) => /^#?[0-9a-f]{3,8}$/i.test(c))
  if (used.length === 0) return '#2563eb'
  let best = CANDIDATES[0]
  let bestScore = -1
  for (const c of CANDIDATES) {
    const score = Math.min(...used.map((u) => dist(c, u)))
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }
  return best
}
