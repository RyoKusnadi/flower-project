import * as THREE from 'three'

export function runIntro(onComplete: () => void): void {
  const canvas = document.createElement('canvas')
  canvas.id = 'intro-canvas'
  document.body.appendChild(canvas)

  const overlay = document.createElement('div')
  overlay.id = 'intro-overlay'
  overlay.innerHTML = `
    <div class="intro-content">
      <p class="intro-to">To: Audrey Arnelia</p>
      <p class="intro-sub">Rio's Most Favorite Girl ♡</p>
      <button class="intro-btn">OPEN ♡</button>
    </div>
  `
  document.body.appendChild(overlay)

  // ── Three.js setup ─────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setClearColor(0x030000)

  const scene = new THREE.Scene()
  const cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100)
  cam.position.z = 6

  // ── Heart sprites ──────────────────────────────────────────────────────────
  const heartTex = makeHeartTex('#FF5577')
  const hearts = Array.from({ length: 60 }, () => {
    const mat = new THREE.SpriteMaterial({
      map: heartTex,
      transparent: true,
      opacity: 0,
      color: new THREE.Color().setHSL(Math.random() * 0.08 + 0.91, 0.9, 0.65),
    })
    const sp = new THREE.Sprite(mat)
    const sc = Math.random() * 0.32 + 0.07
    sp.scale.setScalar(sc)
    sp.position.set(
      (Math.random() - 0.5) * 16,
      Math.random() * 16 - 8,
      (Math.random() - 0.5) * 4,
    )
    sp.userData['vy'] = Math.random() * 0.007 + 0.003
    sp.userData['to'] = Math.random() * 0.55 + 0.1
    scene.add(sp)
    return sp
  })

  // ── Sparkle particle system ────────────────────────────────────────────────
  const N = 800
  const posData = new Float32Array(N * 3)
  const velData = new Float32Array(N * 2)
  for (let i = 0; i < N; i++) {
    posData[i * 3]     = (Math.random() - 0.5) * 14
    posData[i * 3 + 1] = Math.random() * 14 - 7
    posData[i * 3 + 2] = (Math.random() - 0.5) * 5
    velData[i * 2]     = (Math.random() - 0.5) * 0.004
    velData[i * 2 + 1] = Math.random() * 0.007 + 0.001
  }
  const pGeo = new THREE.BufferGeometry()
  const posAttr = new THREE.Float32BufferAttribute(posData, 3)
  pGeo.setAttribute('position', posAttr)
  const pMat = new THREE.PointsMaterial({ color: 0xFFCCDD, size: 0.055, transparent: true, opacity: 0 })
  scene.add(new THREE.Points(pGeo, pMat))

  // ── Pulse ring (bursts when text appears) ──────────────────────────────────
  const rings: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; scale: number }[] = []
  const spawnRing = () => {
    const geo = new THREE.RingGeometry(0.05, 0.1, 64)
    const mat = new THREE.MeshBasicMaterial({ color: 0xFF3366, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(0, 0, 0)
    scene.add(mesh)
    rings.push({ mesh, mat, scale: 0.1 })
  }

  // ── State ──────────────────────────────────────────────────────────────────
  let frame = 0
  let opacity = 0
  let exiting = false
  let running = true

  const btn = overlay.querySelector('.intro-btn') as HTMLButtonElement
  btn.addEventListener('click', () => { exiting = true })

  // ── Loop ───────────────────────────────────────────────────────────────────
  const loop = () => {
    if (!running) return
    requestAnimationFrame(loop)
    frame++

    // Global fade in / out
    if (!exiting) opacity = Math.min(opacity + 0.013, 1)
    else          opacity = Math.max(opacity - 0.03, 0)

    // Show text overlay
    if (!exiting) {
      if (frame === 55)  overlay.classList.add('visible')
      if (frame === 170) btn.classList.add('visible')
    }

    // Sync overlay opacity on exit
    if (exiting) overlay.style.opacity = String(opacity)

    if (exiting && opacity <= 0) {
      running = false
      canvas.remove()
      overlay.remove()
      onComplete()
      return
    }

    // Periodic pulse rings
    if (frame % 90 === 0) spawnRing()

    // Update rings
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]
      r.scale += 0.06
      r.mesh.scale.setScalar(r.scale)
      r.mat.opacity = Math.max(0, 0.8 - r.scale * 0.065) * opacity
      if (r.mat.opacity <= 0) {
        scene.remove(r.mesh)
        rings.splice(i, 1)
      }
    }

    // Update hearts
    hearts.forEach(h => {
      h.material.opacity = (h.userData['to'] as number) * opacity
      h.position.y += h.userData['vy'] as number
      h.position.x += Math.sin(h.position.y * 0.3 + frame * 0.007) * 0.005
      if (h.position.y > 8.5) {
        h.position.y = -8.5
        h.position.x = (Math.random() - 0.5) * 16
      }
    })

    // Update sparkles
    pMat.opacity = 0.78 * opacity
    for (let i = 0; i < N; i++) {
      posData[i * 3]     += velData[i * 2]
      posData[i * 3 + 1] += velData[i * 2 + 1]
      if (posData[i * 3 + 1] > 8) {
        posData[i * 3 + 1] = -8
        posData[i * 3]     = (Math.random() - 0.5) * 14
      }
    }
    posAttr.needsUpdate = true

    renderer.render(scene, cam)
  }

  loop()

  window.addEventListener('resize', () => {
    cam.aspect = innerWidth / innerHeight
    cam.updateProjectionMatrix()
    renderer.setSize(innerWidth, innerHeight)
  })
}

function makeHeartTex(color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  ctx.shadowBlur = 14
  ctx.shadowColor = color
  ctx.fillStyle = color
  ctx.font = '52px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('♥', 32, 35)
  return new THREE.CanvasTexture(c)
}
