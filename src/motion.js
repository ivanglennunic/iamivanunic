const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

export function initReveal() {
  const reduce = prefersReducedMotion()
  const els = [...document.querySelectorAll('.reveal')]
  if (!els.length) return

  if (reduce) {
    for (const el of els) el.classList.add('is-in')
    return
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        io.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
  )

  for (const el of els) io.observe(el)
}

export function initParallax() {
  const reduce = prefersReducedMotion()
  const layers = [...document.querySelectorAll('[data-parallax]')]
  if (!layers.length) return
  if (reduce) return

  let raf = 0
  const onScroll = () => {
    if (raf) return
    raf = window.requestAnimationFrame(() => {
      raf = 0
      const y = window.scrollY || 0
      for (const layer of layers) {
        const speed = Number(layer.getAttribute('data-parallax') || 0)
        const offset = y * speed
        layer.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`
      }
    })
  }

  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
}

export function initMagneticButtons() {
  const reduce = prefersReducedMotion()
  const btns = [...document.querySelectorAll('[data-magnetic]')]
  if (!btns.length) return
  if (reduce) return

  const strength = 14
  const onMove = (e) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (e.clientX - cx) / (rect.width / 2)
    const dy = (e.clientY - cy) / (rect.height / 2)
    const tx = clamp(dx, -1, 1) * strength
    const ty = clamp(dy, -1, 1) * strength
    el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`
  }

  const onLeave = (e) => {
    e.currentTarget.style.transform = ''
  }

  for (const btn of btns) {
    btn.addEventListener('pointermove', onMove)
    btn.addEventListener('pointerleave', onLeave)
  }
}

export function initButtonRipple() {
  const reduce = prefersReducedMotion()
  const btns = [...document.querySelectorAll('.btn')]
  if (!btns.length) return
  if (reduce) return

  for (const btn of btns) {
    btn.classList.add('btn--ripple')
    btn.addEventListener(
      'pointerdown',
      (e) => {
        if (e.button !== undefined && e.button !== 0) return
        const el = e.currentTarget
        const rect = el.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        el.style.setProperty('--rx', `${x.toFixed(0)}px`)
        el.style.setProperty('--ry', `${y.toFixed(0)}px`)
        el.dataset.rippling = '1'
        window.setTimeout(() => {
          delete el.dataset.rippling
        }, 520)
      },
      { passive: true },
    )
  }
}

export function initScrollSpy() {
  const links = [...document.querySelectorAll('.navLinks a[href^="#"]')]
  if (!links.length) return

  const idToLink = new Map(
    links
      .map((a) => [a.getAttribute('href')?.slice(1), a])
      .filter(([id]) => Boolean(id)),
  )

  const sections = [...idToLink.keys()]
    .map((id) => document.getElementById(id))
    .filter(Boolean)

  if (!sections.length) return

  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting)
      if (!visible.length) return
      visible.sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0))
      const id = visible[0].target.id
      for (const [k, a] of idToLink.entries()) a.toggleAttribute('data-active', k === id)
    },
    { rootMargin: '-40% 0px -55% 0px', threshold: [0.01, 0.1, 0.25] },
  )

  for (const s of sections) io.observe(s)
}

