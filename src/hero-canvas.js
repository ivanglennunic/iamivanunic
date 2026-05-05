import * as THREE from 'three'

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

function isLowPower() {
  const mem = navigator.deviceMemory || 0
  return mem && mem <= 4
}

export function initHeroCanvas(canvas) {
  if (!(canvas instanceof HTMLCanvasElement)) return
  if (prefersReducedMotion()) return

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(55, 1, 0.01, 100)
  camera.position.set(0, 0, 3.2)

  const group = new THREE.Group()
  scene.add(group)

  const nodeCount = isLowPower() ? 70 : 110
  const maxLinksPerNode = isLowPower() ? 4 : 6
  const linkRadius = 0.55

  const positions = new Float32Array(nodeCount * 3)
  const velocities = new Float32Array(nodeCount * 3)

  const rand = (a, b) => a + Math.random() * (b - a)
  for (let i = 0; i < nodeCount; i++) {
    const ix = i * 3
    positions[ix + 0] = rand(-1.1, 1.1)
    positions[ix + 1] = rand(-0.7, 0.7)
    positions[ix + 2] = rand(-0.2, 0.2)
    velocities[ix + 0] = rand(-0.06, 0.06)
    velocities[ix + 1] = rand(-0.05, 0.05)
    velocities[ix + 2] = rand(-0.02, 0.02)
  }

  const pointsGeo = new THREE.BufferGeometry()
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const readVar = (name, fallback = '') =>
    getComputedStyle(document.documentElement).getPropertyValue(name)?.trim() || fallback

  const pointsMat = new THREE.PointsMaterial({
    size: 0.018,
    color: new THREE.Color('#4fd1ff'),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(pointsGeo, pointsMat)
  group.add(points)

  const maxSegments = nodeCount * maxLinksPerNode
  const linePositions = new Float32Array(maxSegments * 2 * 3)
  const lineAlphas = new Float32Array(maxSegments * 2)

  const linesGeo = new THREE.BufferGeometry()
  linesGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
  linesGeo.setAttribute('alpha', new THREE.BufferAttribute(lineAlphas, 1))

  const linesMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color('#4fd1ff') },
      uOpacity: { value: 0.38 },
    },
    vertexShader: `
      attribute float alpha;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(uColor, uOpacity * vAlpha);
      }
    `,
  })

  const lines = new THREE.LineSegments(linesGeo, linesMat)
  group.add(lines)

  const syncHeroTheme = () => {
    const root = document.documentElement
    const isLight = root.getAttribute('data-theme') === 'light'
    const net = readVar('--hero-network')
    const colorStr = net || readVar('--accent', '#4fd1ff')
    const col = new THREE.Color(colorStr)
    pointsMat.color.copy(col)
    linesMat.uniforms.uColor.value.copy(col)

    const po = Number(readVar('--hero-network-opacity', isLight ? '0.48' : '0.85'))
    pointsMat.opacity = Number.isFinite(po) ? Math.min(1, Math.max(0.05, po)) : (isLight ? 0.48 : 0.85)

    const lo = Number(readVar('--hero-line-opacity', isLight ? '0.26' : '0.38'))
    linesMat.uniforms.uOpacity.value = Number.isFinite(lo) ? Math.min(1, Math.max(0.02, lo)) : (isLight ? 0.26 : 0.38)

    if (isLight) {
      pointsMat.blending = THREE.NormalBlending
      linesMat.blending = THREE.NormalBlending
      pointsMat.depthWrite = true
      linesMat.depthWrite = true
    } else {
      pointsMat.blending = THREE.AdditiveBlending
      linesMat.blending = THREE.AdditiveBlending
      pointsMat.depthWrite = false
      linesMat.depthWrite = false
    }
    pointsMat.needsUpdate = true
    linesMat.needsUpdate = true
  }

  syncHeroTheme()
  const themeObserver = new MutationObserver(() => syncHeroTheme())
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  const pointer = { x: 0, y: 0, active: false }
  const onPointerMove = (e) => {
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    pointer.x = (x - 0.5) * 2
    pointer.y = -(y - 0.5) * 2
    pointer.active = true
  }
  const onPointerLeave = () => {
    pointer.active = false
  }
  canvas.addEventListener('pointermove', onPointerMove, { passive: true })
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true })

  const resize = () => {
    const rect = canvas.getBoundingClientRect()
    const w = Math.max(1, Math.floor(rect.width))
    const h = Math.max(1, Math.floor(rect.height))
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()

  let running = true
  const onVis = () => {
    running = document.visibilityState === 'visible'
  }
  document.addEventListener('visibilitychange', onVis)

  const clock = new THREE.Clock()
  let lastFrame = 0
  const targetFps = isLowPower() ? 40 : 60
  const minFrameMs = 1000 / targetFps

  function step() {
    requestAnimationFrame(step)
    if (!running) return

    const now = performance.now()
    if (now - lastFrame < minFrameMs) return
    lastFrame = now

    const dt = Math.min(0.032, clock.getDelta())

    // Drift + bounds
    for (let i = 0; i < nodeCount; i++) {
      const ix = i * 3
      positions[ix + 0] += velocities[ix + 0] * dt
      positions[ix + 1] += velocities[ix + 1] * dt
      positions[ix + 2] += velocities[ix + 2] * dt

      // Soft wrap with small random nudges
      if (positions[ix + 0] > 1.2) positions[ix + 0] = -1.2
      if (positions[ix + 0] < -1.2) positions[ix + 0] = 1.2
      if (positions[ix + 1] > 0.8) positions[ix + 1] = -0.8
      if (positions[ix + 1] < -0.8) positions[ix + 1] = 0.8
    }
    pointsGeo.attributes.position.needsUpdate = true

    // Links
    let seg = 0
    const pr = pointer.active ? 0.12 : 0
    const px = pointer.x * 0.9
    const py = pointer.y * 0.55

    for (let i = 0; i < nodeCount; i++) {
      let linked = 0
      const ix = i * 3
      const ax = positions[ix + 0] + px * pr
      const ay = positions[ix + 1] + py * pr
      const az = positions[ix + 2]

      for (let j = i + 1; j < nodeCount; j++) {
        if (linked >= maxLinksPerNode) break
        const jx = j * 3
        const bx = positions[jx + 0]
        const by = positions[jx + 1]
        const bz = positions[jx + 2]

        const dx = ax - bx
        const dy = ay - by
        const dz = az - bz
        const d2 = dx * dx + dy * dy + dz * dz
        if (d2 > linkRadius * linkRadius) continue

        const t = 1 - Math.sqrt(d2) / linkRadius
        const alpha = Math.max(0, Math.min(1, t))

        const p = seg * 6
        linePositions[p + 0] = ax
        linePositions[p + 1] = ay
        linePositions[p + 2] = az
        linePositions[p + 3] = bx
        linePositions[p + 4] = by
        linePositions[p + 5] = bz

        const a = seg * 2
        lineAlphas[a + 0] = alpha
        lineAlphas[a + 1] = alpha

        seg++
        linked++
        if (seg >= maxSegments) break
      }
      if (seg >= maxSegments) break
    }

    linesGeo.setDrawRange(0, seg * 2)
    linesGeo.attributes.position.needsUpdate = true
    linesGeo.attributes.alpha.needsUpdate = true

    // Gentle group sway toward pointer
    if (pointer.active) {
      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, pointer.x * 0.16, 0.06)
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, pointer.y * 0.12, 0.06)
    } else {
      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, 0, 0.04)
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, 0, 0.04)
    }

    renderer.render(scene, camera)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  step()

  return () => {
    themeObserver.disconnect()
    ro.disconnect()
    document.removeEventListener('visibilitychange', onVis)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerleave', onPointerLeave)
    renderer.dispose()
    pointsGeo.dispose()
    pointsMat.dispose()
    linesGeo.dispose()
    linesMat.dispose()
  }
}

