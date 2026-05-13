import { Gallery } from './gallery.ts'
import { runIntro } from './intro.ts'
import { initRomance } from './romance.ts'

const NS = 'http://www.w3.org/2000/svg'

const AFFIRMATIONS = [
  'You are my favorite person',
  "I'm lucky to have you",
  'Every flower reminds me of you',
  'Forever grateful for you 🌙',
  'So grateful to have you',
  'You make everything brighter',
  'Thank you for being you',
  'You are deeply loved',
  'My heart is full because of you',
  'You mean the world to me',
]

// ── SVG helper ────────────────────────────────────────────────────────────────

function s<T extends SVGElement>(tag: string, attrs: Record<string, string | number> = {}): T {
  const e = document.createElementNS(NS, tag) as T
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
  return e
}

// ── SVG defs (gradients + filters) ───────────────────────────────────────────

function addDefs(svg: SVGSVGElement): void {
  const defs = s('defs', {})

  const radGrad = (id: string, cx: string, cy: string, r: string, stops: [string, string][]) => {
    const g = s('radialGradient', { id, cx, cy, r, gradientUnits: 'objectBoundingBox' })
    stops.forEach(([offset, color]) => g.appendChild(s('stop', { offset, 'stop-color': color })))
    defs.appendChild(g)
  }
  const linGrad = (id: string, x1: string, y1: string, x2: string, y2: string, stops: [string, string][]) => {
    const g = s('linearGradient', { id, x1, y1, x2, y2, gradientUnits: 'objectBoundingBox' })
    stops.forEach(([offset, color]) => g.appendChild(s('stop', { offset, 'stop-color': color })))
    defs.appendChild(g)
  }

  // Vivid flower colors — warm coral-red
  radGrad('roseOuter', '38%', '28%', '72%', [['0%', '#FFAA80'], ['45%', '#E03825'], ['100%', '#8B0A12']])
  radGrad('roseMid',   '38%', '28%', '72%', [['0%', '#CC3820'], ['100%', '#6A0E10']])
  radGrad('roseInner', '38%', '28%', '72%', [['0%', '#A82010'], ['100%', '#500505']])
  linGrad('lilyPetal', '30%', '0%', '70%', '100%', [['0%', '#FFB880'], ['40%', '#FF8848'], ['100%', '#D83C2C']])
  radGrad('pomPetal',  '45%', '22%', '68%', [['0%', '#FF9060'], ['55%', '#CC2E18'], ['100%', '#980C06']])
  // Rich teal leaves
  linGrad('leafFill',  '30%', '0%', '70%', '100%', [['0%', '#0A9080'], ['45%', '#22C8AA'], ['100%', '#087060']])
  linGrad('bbStem',    '0%', '0%', '100%', '0%', [['0%', '#2A7858'], ['100%', '#1C6048']])

  // Warm flower glow
  const flt = s('filter', { id: 'fglow', x: '-35%', y: '-35%', width: '170%', height: '170%' })
  flt.appendChild(s('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: '5', result: 'blur' }))
  flt.appendChild(s('feFlood', { 'flood-color': '#FF4820', 'flood-opacity': '0.5', result: 'color' }))
  flt.appendChild(s('feComposite', { in: 'color', in2: 'blur', operator: 'in', result: 'shadow' }))
  const fmerge = s('feMerge', {})
  fmerge.appendChild(s('feMergeNode', { in: 'shadow' }))
  fmerge.appendChild(s('feMergeNode', { in: 'SourceGraphic' }))
  flt.appendChild(fmerge)
  defs.appendChild(flt)

  // Teal leaf shadow
  const leafFlt = s('filter', { id: 'lfglow', x: '-20%', y: '-20%', width: '140%', height: '140%' })
  leafFlt.appendChild(s('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: '3', result: 'b' }))
  leafFlt.appendChild(s('feFlood', { 'flood-color': '#021A18', 'flood-opacity': '0.6', result: 'c' }))
  leafFlt.appendChild(s('feComposite', { in: 'c', in2: 'b', operator: 'in', result: 'sh' }))
  const lm = s('feMerge', {})
  lm.appendChild(s('feMergeNode', { in: 'sh' }))
  lm.appendChild(s('feMergeNode', { in: 'SourceGraphic' }))
  leafFlt.appendChild(lm)
  defs.appendChild(leafFlt)

  svg.insertBefore(defs, svg.firstChild)
}

// ── Starfield ─────────────────────────────────────────────────────────────────

function initStars(): void {
  const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement
  const ctx = canvas.getContext('2d')!
  let stars: [number, number, number, number][] = []

  const populate = () => {
    stars = Array.from({ length: 160 }, () => [
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      Math.random() * 1.4 + 0.2,
      Math.random() * 0.65 + 0.1,
    ])
  }
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const [x, y, r, a] of stars) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 210, 165, ${a})`; ctx.fill()
    }
  }
  const resize = () => {
    canvas.width = innerWidth; canvas.height = innerHeight
    populate(); draw()
  }
  window.addEventListener('resize', resize); resize()
}

// ── SVG sparkles ──────────────────────────────────────────────────────────────

interface Sparkle { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; color: string }

function initSparkles(svg: SVGSVGElement, origins: { x: number; y: number }[]): void {
  const pool: Sparkle[] = []
  const colors = ['#FFD700', '#FFA07A', '#FF6347', '#FFE4B5', '#FFDAB9', '#FFB6C1']
  const g = s<SVGGElement>('g', {})
  svg.appendChild(g)

  const tick = () => {
    if (Math.random() < 0.3) {
      const o = origins[Math.floor(Math.random() * origins.length)]
      pool.push({ x: o.x + (Math.random() - 0.5) * 55, y: o.y + (Math.random() - 0.5) * 28,
        vx: (Math.random() - 0.5) * 0.6, vy: -(Math.random() * 0.85 + 0.2),
        life: 0, max: 75 + Math.random() * 55, r: Math.random() * 2.4 + 0.7,
        color: colors[Math.floor(Math.random() * colors.length)] })
    }
    g.innerHTML = ''
    for (let i = pool.length - 1; i >= 0; i--) {
      const sp = pool[i]; sp.life++
      if (sp.life > sp.max) { pool.splice(i, 1); continue }
      const t = sp.life / sp.max
      const alpha = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75
      g.appendChild(s<SVGCircleElement>('circle', {
        cx: sp.x + sp.vx * sp.life, cy: sp.y + sp.vy * sp.life,
        r: sp.r * (1 - t * 0.45), fill: sp.color, opacity: alpha.toFixed(2),
      }))
    }
    requestAnimationFrame(tick)
  }
  tick()
}

// ── Flower components ─────────────────────────────────────────────────────────

function makeStem(x1: number, y1: number, x2: number, y2: number, cpx?: number): SVGPathElement {
  const cx = cpx ?? (x1 + x2) / 2
  const cy = (y1 + y2) / 2 + 20
  return s('path', { d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
    stroke: '#1A6858', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' })
}

// ── Lush teal leaf ────────────────────────────────────────────────────────────
function makeLeaf(x: number, y: number, angle: number, sw = 36, sh = 75): SVGGElement {
  const g = s<SVGGElement>('g', { transform: `translate(${x},${y}) rotate(${angle})`, filter: 'url(#lfglow)' })

  g.appendChild(s('path', {
    d: `M 0,0 C ${sw*0.9} ${-sh*0.2} ${sw*1.08} ${-sh*0.58} ${sw*0.15} ${-sh}
        C 0 ${-sh*1.04} ${-sw*0.15} ${-sh}
        C ${-sw*1.08} ${-sh*0.58} ${-sw*0.9} ${-sh*0.2} 0,0 Z`,
    fill: 'url(#leafFill)', stroke: '#065A50', 'stroke-width': '1.1',
  }))
  // Midrib
  g.appendChild(s('path', { d: `M 0,0 C 2 ${-sh*0.45} 1 ${-sh*0.78} 0 ${-sh}`,
    stroke: '#054840', 'stroke-width': '1.5', fill: 'none' }))
  // Side veins
  const veinData: [number, number, number, number][] = [
    [0, -sh*0.22, sw*0.72, -sh*0.38],
    [0, -sh*0.45, sw*0.62, -sh*0.58],
    [0, -sh*0.65, sw*0.4,  -sh*0.76],
  ]
  veinData.forEach(([x1, y1, x2, y2]) => {
    g.appendChild(s('path', { d: `M ${x1},${y1} C ${x2*0.4},${y1} ${x2*0.8},${(y1+y2)/2} ${x2},${y2}`,
      stroke: '#054840', 'stroke-width': '1', fill: 'none', opacity: '0.65' }))
    g.appendChild(s('path', { d: `M ${x1},${y1} C ${-x2*0.4},${y1} ${-x2*0.8},${(y1+y2)/2} ${-x2},${y2}`,
      stroke: '#054840', 'stroke-width': '1', fill: 'none', opacity: '0.65' }))
  })
  return g
}

// ── Rose (Mawar) — 6-ring layered petals ─────────────────────────────────────
function makeRose(cx: number, cy: number): SVGGElement {
  const g = s<SVGGElement>('g', { transform: `translate(${cx},${cy})`, filter: 'url(#fglow)' })

  g.appendChild(s('circle', { r: 52, fill: '#3A0508', opacity: 0.5 }))

  const petals = (n: number, offset: number, path: string, fill: string, opacity = 1) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 360 + offset
      g.appendChild(s('path', { d: path, fill, opacity, transform: `rotate(${a})` }))
    }
  }
  const highlights = (n: number, offset: number, d: string) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 360 + offset
      g.appendChild(s('path', { d, stroke: '#FFCCA8', 'stroke-width': '2', fill: 'none', opacity: '0.4', transform: `rotate(${a})` }))
    }
  }

  // Outer 6 — large swept-back coral petals
  petals(6, 0,  'M 0,4 C -28,-6 -34,-44 -14,-67 C -5,-80 5,-80 14,-67 C 34,-44 28,-6 0,4', 'url(#roseOuter)', 0.92)
  highlights(6, 0, 'M 0,-16 C -5,-38 -4,-58 0,-74')

  // Mid-outer 6
  petals(6, 30, 'M 0,3 C -21,-5 -26,-36 -11,-57 C -4,-68 4,-68 11,-57 C 26,-36 21,-5 0,3', 'url(#roseMid)', 0.95)
  highlights(6, 30, 'M 0,-14 C -4,-32 -3,-50 0,-63')

  // Inner 5
  petals(5, 18, 'M 0,2 C -15,-3 -18,-27 -9,-45 C -3,-55 3,-55 9,-45 C 18,-27 15,-3 0,2', 'url(#roseInner)', 0.97)

  // Bud 4
  petals(4, 9,  'M 0,1 C -8,-2 -9,-17 -5,-29 C -2,-37 2,-37 5,-29 C 9,-17 8,-2 0,1', '#7A1010')

  // Innermost 3
  petals(3, 0,  'M 0,0 C -4,-1 -5,-9 -2,-16 C -1,-21 1,-21 2,-16 C 5,-9 4,-1 0,0', '#540808')

  g.appendChild(s('circle', { r: 8, fill: '#3A0606' }))
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    g.appendChild(s('circle', { cx: Math.cos(a)*5, cy: Math.sin(a)*5, r: 1.6, fill: '#FFB840' }))
  }
  g.appendChild(s('circle', { r: 2.5, fill: '#FFD060' }))
  return g
}

// ── Lily — wide swept petals ──────────────────────────────────────────────────
function makeLily(cx: number, cy: number): SVGGElement {
  const g = s<SVGGElement>('g', { transform: `translate(${cx},${cy})`, filter: 'url(#fglow)' })

  const petalPath = 'M 0,5 C -22,-12 -28,-62 0,-88 C 28,-62 22,-12 0,5'
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 360
    g.appendChild(s('path', { d: petalPath, fill: 'url(#lilyPetal)', opacity: '0.93', transform: `rotate(${a})` }))
    g.appendChild(s('path', { d: 'M 0,-8 C -3,-34 -2,-62 0,-84',
      stroke: '#FFCCA8', 'stroke-width': '2.5', fill: 'none', opacity: '0.55', transform: `rotate(${a})` }))
    g.appendChild(s('path', { d: 'M 0,-24 C -9,-38 -13,-58 -9,-74',
      stroke: '#FFA880', 'stroke-width': '1.1', fill: 'none', opacity: '0.32', transform: `rotate(${a})` }))
    g.appendChild(s('path', { d: 'M 0,-24 C 9,-38 13,-58 9,-74',
      stroke: '#FFA880', 'stroke-width': '1.1', fill: 'none', opacity: '0.32', transform: `rotate(${a})` }))
    // Freckle dots (4 per petal)
    for (let d = 0; d < 4; d++) {
      const dist = 28 + d * 13
      const ox = (Math.random() - 0.5) * 8
      g.appendChild(s('circle', { cx: ox, cy: -dist,
        r: 1.3, fill: '#C03820', opacity: '0.48', transform: `rotate(${a})` }))
    }
  }

  for (let i = 0; i < 6; i++) {
    const a = ((i + 0.5) / 6) * 360
    const rad = (a * Math.PI) / 180
    const ex = Math.cos(rad) * 22, ey = Math.sin(rad) * 22
    g.appendChild(s('line', { x1: 0, y1: 0, x2: ex, y2: ey,
      stroke: '#B04028', 'stroke-width': '1.5', opacity: '0.9' }))
    g.appendChild(s('ellipse', { cx: ex, cy: ey, rx: 3, ry: 2.2, fill: '#FFD060' }))
  }

  g.appendChild(s('circle', { r: 11, fill: '#C04030', opacity: '0.95' }))
  g.appendChild(s('circle', { r: 6.5, fill: '#E06040' }))
  g.appendChild(s('circle', { r: 3, fill: '#FFD060' }))
  return g
}

// ── Baby's Breath — dense branching ──────────────────────────────────────────
function makeBabysBreath(cx: number, cy: number): SVGGElement {
  const g = s<SVGGElement>('g', { transform: `translate(${cx},${cy})` })

  const branches: [number, number, number, number][] = [
    [0, 0, -18, -30], [0, 0, 8, -32], [0, 0, 2, -38],
    [-18, -30, -30, -54], [-18, -30, -8, -56],
    [8, -32, 22, -58], [8, -32, 5, -56],
    [2, -38, -10, -62], [2, -38, 12, -64],
    [-30, -54, -38, -74], [-8, -56, -16, -76], [-16, -76, -6, -90],
    [22, -58, 32, -78], [5, -56, 14, -76], [14, -76, 5, -90],
    [-38, -74, -44, -90], [-8, -56, -3, -78],
    [0, -38, -5, -60], [-5, -60, -14, -80], [-5, -60, 4, -80],
    [0, -38, 7, -62], [7, -62, 0, -80], [7, -62, 16, -78],
    [-16, -76, -24, -90], [14, -76, 22, -90],
    [-3, -78, -10, -94], [4, -80, 10, -96],
  ]

  branches.forEach(([x1, y1, x2, y2]) => {
    g.appendChild(s('line', { x1, y1, x2, y2, stroke: 'url(#bbStem)', 'stroke-width': '1.2', opacity: '0.88' }))
  })

  branches.forEach(([, , x2, y2]) => {
    const isLeaf = !branches.some(([bx1, by1]) => bx1 === x2 && by1 === y2)
    if (!isLeaf) return
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * 360
      const px = Math.cos((pa * Math.PI) / 180) * 4.5 + x2
      const py = Math.sin((pa * Math.PI) / 180) * 4.5 + y2
      g.appendChild(s('ellipse', { cx: px, cy: py, rx: 2.8, ry: 2.8, fill: '#FFF0E6', opacity: '0.88' }))
    }
    g.appendChild(s('circle', { cx: x2, cy: y2, r: 3.8, fill: '#FFF8F0', opacity: '0.97' }))
    g.appendChild(s('circle', { cx: x2, cy: y2, r: 2, fill: '#FFE8C0', opacity: '0.95' }))
    g.appendChild(s('circle', { cx: x2, cy: y2, r: 1, fill: '#FFC070' }))
  })

  return g
}

// ── Pom Pom — fuller spherical chrysanthemum ──────────────────────────────────
function makePomPom(cx: number, cy: number): SVGGElement {
  const g = s<SVGGElement>('g', { transform: `translate(${cx},${cy})`, filter: 'url(#fglow)' })

  g.appendChild(s('circle', { r: 40, fill: '#380508', opacity: 0.48 }))

  const petal = (n: number, offset: number, path: string, fill: string, opacity = 0.92) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 360 + offset
      g.appendChild(s('path', { d: path, fill, opacity, transform: `rotate(${a})` }))
    }
  }

  petal(28, 0,    'M 0,0 C -6,-10 -5.5,-28 0,-34 C 5.5,-28 6,-10 0,0', 'url(#pomPetal)', 0.9)
  petal(24, 7.5,  'M 0,0 C -5,-8 -4.5,-22 0,-27 C 4.5,-22 5,-8 0,0', '#D03520')
  petal(18, 10,   'M 0,0 C -3.5,-6 -3.2,-17 0,-21 C 3.2,-17 3.5,-6 0,0', '#B82010')
  petal(14, 13,   'M 0,0 C -2.5,-4.5 -2.3,-13 0,-15.5 C 2.3,-13 2.5,-4.5 0,0', '#9A1808')
  petal(10, 18,   'M 0,0 C -1.8,-3 -1.6,-9 0,-11 C 1.6,-9 1.8,-3 0,0', '#7A1208')

  g.appendChild(s('circle', { r: 7.5, fill: '#420506' }))
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    g.appendChild(s('circle', { cx: Math.cos(a)*4.2, cy: Math.sin(a)*4.2, r: 1.2, fill: '#FFB840' }))
  }
  g.appendChild(s('circle', { r: 2, fill: '#FFD060' }))
  return g
}

// ── Bouquet ───────────────────────────────────────────────────────────────────

type FlowerFn = (cx: number, cy: number) => SVGGElement

function makePlant(
  id: string, bx: number, by: number, hx: number, hy: number,
  flowerFn: FlowerFn, stemCpx?: number,
): SVGGElement {
  const g = s<SVGGElement>('g', { id, class: 'plant' })
  g.appendChild(makeStem(bx, by, hx, hy, stemCpx))
  g.appendChild(flowerFn(hx, hy))
  g.style.transformBox = 'fill-box'
  g.style.transformOrigin = '50% 100%'
  return g
}

function buildBouquet(container: HTMLElement): void {
  const svg = s<SVGSVGElement>('svg', { id: 'bouquet-svg', viewBox: '0 0 420 540', xmlns: NS })

  addDefs(svg)

  // ── Lush teal leaves — back row large, mid row medium, accent small ──
  const leavesG = s<SVGGElement>('g', { class: 'leaves-group' })
  leavesG.style.transformBox = 'fill-box'
  leavesG.style.transformOrigin = '50% 100%'
  ;[
    // Back row — large sweeping teal leaves
    [116, 490, -58, 44, 92], [148, 492, -42, 42, 88], [180, 494, -22, 40, 84],
    [212, 494, -2,  38, 82], [244, 492, 18,  40, 84], [276, 488, 40,  42, 88],
    [306, 483, 62,  40, 84],
    // Mid row
    [136, 490, -72, 28, 60], [162, 492, -30, 26, 56], [194, 493, -10, 25, 54],
    [228, 493, 8,   26, 56], [260, 490, 30,  26, 56], [290, 485, 52,  26, 54],
    // Accent
    [155, 491, -50, 20, 44], [265, 489, 48,  20, 42],
  ].forEach(([x, y, a, sw, sh]) => leavesG.appendChild(makeLeaf(x, y, a, sw, sh)))
  svg.appendChild(leavesG)

  // ── Plants ──
  const plants = [
    makePlant('plant-lily',   162, 495, 100, 118, makeLily,        138),
    makePlant('plant-bb1',    185, 495, 155, 245, makeBabysBreath, 170),
    makePlant('plant-rose',   210, 497, 212,  62, makeRose,        208),
    makePlant('plant-bb2',    235, 494, 276, 238, makeBabysBreath, 255),
    makePlant('plant-pompom', 258, 493, 322, 130, makePomPom,      290),
  ]
  plants.forEach((p) => svg.appendChild(p))

  initSparkles(svg, [
    { x: 100, y: 118 }, { x: 212, y: 62 }, { x: 322, y: 130 },
    { x: 155, y: 245 }, { x: 276, y: 238 },
  ])

  svg.addEventListener('click', () => {
    const burst = (window as Window & { triggerBurst?: () => void }).triggerBurst
    if (burst) burst()
  })

  container.appendChild(svg)
}

// ── Affirmation pills ─────────────────────────────────────────────────────────

interface PillPos { top?: string; bottom?: string; left?: string; right?: string }

const POSITIONS: PillPos[] = [
  { top: '6%',    left: '2%'  }, { top: '4%',    right: '3%' },
  { top: '22%',   right: '1%' }, { top: '38%',   right: '1%' },
  { bottom: '26%', right: '2%' }, { bottom: '12%', right: '3%' },
  { top: '16%',   left: '1%'  }, { top: '32%',   left: '1%'  },
  { bottom: '30%', left: '2%' }, { bottom: '16%', left: '1%' },
]

function initAffirmations(container: HTMLElement, gallery: Gallery): void {
  const photoCount = 6
  AFFIRMATIONS.forEach((text, i) => {
    const pill = document.createElement('div')
    pill.className = 'pill'
    pill.textContent = text
    pill.style.animationDelay = `${(i * 0.38).toFixed(2)}s`
    const pos = POSITIONS[i % POSITIONS.length]
    if (pos.top)    pill.style.top    = pos.top
    if (pos.bottom) pill.style.bottom = pos.bottom
    if (pos.left)   pill.style.left   = pos.left
    if (pos.right)  pill.style.right  = pos.right
    pill.addEventListener('click', () => {
      gallery.open(i % photoCount)
    })
    container.appendChild(pill)
  })
}

// ── Entry ─────────────────────────────────────────────────────────────────────

function initMainScene(): void {
  initStars()
  initRomance(document.getElementById('romance-canvas') as HTMLCanvasElement)

  const gallery = new Gallery([
    new URL('./assets/photos/photo1.jpg', import.meta.url).href,
    new URL('./assets/photos/photo2.jpg', import.meta.url).href,
    new URL('./assets/photos/photo3.jpg', import.meta.url).href,
    new URL('./assets/photos/photo4.jpg', import.meta.url).href,
    new URL('./assets/photos/photo5.jpg', import.meta.url).href,
    new URL('./assets/photos/photo6.jpg', import.meta.url).href,
  ])

  buildBouquet(document.getElementById('bouquet-container')!)
  initAffirmations(document.getElementById('affirmations-container')!, gallery)

  const fadeEl = document.getElementById('scene-fadein')!
  fadeEl.classList.add('hidden')
  setTimeout(() => {
    fadeEl.remove()
    document.getElementById('bouquet-svg')?.classList.add('blooming')
  }, 1400)
}

document.addEventListener('DOMContentLoaded', () => {
  runIntro(initMainScene)
})
