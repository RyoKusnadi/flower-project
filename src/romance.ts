import * as THREE from 'three'

interface ShootingStar {
  line: THREE.Line
  mat: THREE.LineBasicMaterial
  progress: number
  sx: number; sy: number; ex: number; ey: number
}

export function initRomance(canvas: HTMLCanvasElement): void {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100)
  cam.position.z = 6

  // ── Floating hearts (stay on sides, not blocking bouquet) ─────────────────
  const heartTex = makeHeartTex()
  const hearts = Array.from({ length: 32 }, (_, i) => {
    const mat = new THREE.SpriteMaterial({
      map: heartTex,
      transparent: true,
      opacity: Math.random() * 0.38 + 0.08,
    })
    const sp = new THREE.Sprite(mat)
    const sc = Math.random() * 0.24 + 0.06
    sp.scale.setScalar(sc)
    const side = i % 2 === 0 ? -1 : 1
    sp.position.set(
      side * (2.8 + Math.random() * 4.5),
      Math.random() * 14 - 7,
      -2.5 - Math.random() * 2,
    )
    sp.userData['vy'] = Math.random() * 0.005 + 0.0018
    sp.userData['side'] = side
    scene.add(sp)
    return sp
  })

  // ── Falling petals ─────────────────────────────────────────────────────────
  const petalTex = makePetalTex()
  const petals = Array.from({ length: 28 }, () => {
    const mat = new THREE.SpriteMaterial({
      map: petalTex,
      transparent: true,
      opacity: Math.random() * 0.32 + 0.08,
    })
    const sp = new THREE.Sprite(mat)
    const sw = Math.random() * 0.2 + 0.06
    sp.scale.set(sw, sw * 1.45, 1)
    sp.position.set(
      (Math.random() - 0.5) * 16,
      Math.random() * 14,
      -1.5 - Math.random() * 2.5,
    )
    sp.userData['vy'] = -(Math.random() * 0.004 + 0.0015)
    sp.userData['vx'] = (Math.random() - 0.5) * 0.0018
    sp.userData['t']  = Math.random() * Math.PI * 2
    scene.add(sp)
    return sp
  })

  // ── Bokeh glow orbs (deep background depth) ────────────────────────────────
  for (let i = 0; i < 14; i++) {
    const geo = new THREE.CircleGeometry(Math.random() * 0.45 + 0.18, 32)
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.88 + Math.random() * 0.1, 0.85, 0.6),
      transparent: true,
      opacity: Math.random() * 0.045 + 0.01,
    })
    const m = new THREE.Mesh(geo, mat)
    m.position.set(
      (Math.random() - 0.5) * 14,
      (Math.random() - 0.5) * 10,
      -4 - Math.random() * 4,
    )
    scene.add(m)
  }

  // ── Click-burst hearts (when bouquet is clicked) ───────────────────────────
  interface BurstHeart { sp: THREE.Sprite; vx: number; vy: number; life: number; max: number }
  const burstHearts: BurstHeart[] = []
  const burstTex = makeHeartTex()

  const spawnBurst = () => {
    for (let i = 0; i < 20; i++) {
      const mat = new THREE.SpriteMaterial({ map: burstTex, transparent: true, opacity: 0.9 })
      const sp = new THREE.Sprite(mat)
      const sc = Math.random() * 0.22 + 0.08
      sp.scale.setScalar(sc)
      sp.position.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2 - 1, 0)
      burstHearts.push({
        sp,
        vx: (Math.random() - 0.5) * 0.12,
        vy: Math.random() * 0.1 + 0.04,
        life: 0,
        max: 55 + Math.floor(Math.random() * 35),
      })
      scene.add(sp)
    }
  }

  // Expose burst to window so main.ts can trigger it
  ;(window as Window & { triggerBurst?: () => void }).triggerBurst = spawnBurst

  // ── Shooting stars ─────────────────────────────────────────────────────────
  let star: ShootingStar | null = null
  let starTimer = 220 + Math.random() * 280

  const newStar = (): ShootingStar => {
    const sx = -9, sy = 1.5 + Math.random() * 3.5
    const ex = 9,  ey = sy - 1.2 - Math.random() * 2.2
    const pts = [new THREE.Vector3(sx, sy, -0.5), new THREE.Vector3(sx, sy, -0.5)]
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0 })
    const line = new THREE.Line(geo, mat)
    scene.add(line)
    return { line, mat, progress: 0, sx, sy, ex, ey }
  }

  // ── Floating name tag (subtle, behind everything) ──────────────────────────
  const nameTex = makeNameTex()
  const nameSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: nameTex, transparent: true, opacity: 0.08 }),
  )
  nameSprite.scale.set(4, 1, 1)
  nameSprite.position.set(0, -3.5, -3)
  scene.add(nameSprite)

  // ── Render loop ────────────────────────────────────────────────────────────
  let frame = 0

  const loop = () => {
    requestAnimationFrame(loop)
    frame++

    // Hearts float up with gentle side sway
    hearts.forEach(h => {
      h.position.y += h.userData['vy'] as number
      h.position.x += Math.sin(h.position.y * 0.4 + frame * 0.006) * 0.003
      if (h.position.y > 8) {
        h.position.y = -8
        const side = h.userData['side'] as number
        h.position.x = side * (2.8 + Math.random() * 4.5)
      }
    })

    // Petals drift down with gentle drift
    petals.forEach(p => {
      p.userData['t'] = (p.userData['t'] as number) + 0.012
      p.position.y += p.userData['vy'] as number
      p.position.x += (p.userData['vx'] as number) + Math.sin(p.userData['t'] as number) * 0.002
      if (p.position.y < -8) {
        p.position.y = 8
        p.position.x = (Math.random() - 0.5) * 16
      }
    })

    // Burst hearts
    for (let i = burstHearts.length - 1; i >= 0; i--) {
      const b = burstHearts[i]
      b.life++
      const t = b.life / b.max
      b.sp.position.x += b.vx
      b.sp.position.y += b.vy
      b.vy -= 0.003
      b.sp.material.opacity = 1 - t
      if (b.life >= b.max) {
        scene.remove(b.sp)
        burstHearts.splice(i, 1)
      }
    }

    // Shooting star
    starTimer--
    if (starTimer <= 0 && !star) {
      star = newStar()
      starTimer = 260 + Math.random() * 360
    }
    if (star) {
      star.progress += 0.033
      if (star.progress >= 1) {
        scene.remove(star.line)
        star = null
      } else {
        const t  = star.progress
        const dx = star.ex - star.sx
        const dy = star.ey - star.sy
        const d  = Math.sqrt(dx * dx + dy * dy)
        const cx = star.sx + dx * t
        const cy = star.sy + dy * t
        const tl = 1.6
        const pts = [
          new THREE.Vector3(cx - (tl * dx) / d, cy - (tl * dy) / d, -0.5),
          new THREE.Vector3(cx, cy, -0.5),
        ]
        star.line.geometry.setFromPoints(pts)
        star.mat.opacity = t < 0.82 ? 0.88 : ((1 - t) / 0.18) * 0.88
      }
    }

    // Slow name tag pulse
    const nameMat = nameSprite.material as THREE.SpriteMaterial
    nameMat.opacity = 0.05 + Math.sin(frame * 0.018) * 0.03

    renderer.render(scene, cam)
  }

  loop()

  window.addEventListener('resize', () => {
    cam.aspect = innerWidth / innerHeight
    cam.updateProjectionMatrix()
    renderer.setSize(innerWidth, innerHeight)
  })
}

function makeHeartTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  ctx.shadowBlur = 10
  ctx.shadowColor = '#FF2255'
  ctx.fillStyle = '#FF4470'
  ctx.font = '52px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('♥', 32, 35)
  return new THREE.CanvasTexture(c)
}

function makePetalTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 32; c.height = 48
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(16, 24, 1, 16, 24, 18)
  g.addColorStop(0, 'rgba(245, 128, 96, 0.9)')
  g.addColorStop(1, 'rgba(210, 70, 50, 0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(16, 24, 10, 18, 0.3, 0, Math.PI * 2)
  ctx.fill()
  return new THREE.CanvasTexture(c)
}

function makeNameTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = 'rgba(255,180,200,1)'
  ctx.font = 'italic 38px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Rio  ♡  Audrey', 256, 64)
  return new THREE.CanvasTexture(c)
}
