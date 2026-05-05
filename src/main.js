import './styles.css'
import { initButtonRipple, initMagneticButtons, initParallax, initReveal, initScrollSpy } from './motion.js'

const root = document.documentElement
const metaTheme = document.getElementById('theme-color-meta')
const themeBtn = document.getElementById('theme-toggle')
const THEME_KEY = 'theme'

function getTheme() {
  return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

function applyTheme(theme) {
  root.setAttribute('data-theme', theme)
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch (_) {}
  if (metaTheme) metaTheme.setAttribute('content', theme === 'light' ? '#ffffff' : '#0b0d12')
  if (themeBtn) {
    themeBtn.textContent = theme === 'light' ? 'Dark' : 'Light'
    themeBtn.setAttribute(
      'aria-label',
      theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme',
    )
  }
}

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    applyTheme(getTheme() === 'light' ? 'dark' : 'light')
  })
}
applyTheme(getTheme())

const yearEl = document.querySelector('#year')
if (yearEl) yearEl.textContent = String(new Date().getFullYear())

initReveal()
initParallax()
initMagneticButtons()
initButtonRipple()
initScrollSpy()

const heroCanvas = document.querySelector('#hero-canvas')
if (heroCanvas) {
  // Keep Three.js out of the initial bundle; load only when needed.
  const load = async () => {
    const { initHeroCanvas } = await import('./hero-canvas.js')
    initHeroCanvas(heroCanvas)
  }

  let loaded = false
  const doLoad = () => {
    if (loaded) return
    loaded = true
    load()
  }

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  if (reduce) {
    // Respect reduced motion; don't load WebGL at all.
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          doLoad()
          io.disconnect()
        }
      },
      { rootMargin: '200px 0px 200px 0px', threshold: 0.01 },
    )
    io.observe(heroCanvas)
  } else if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => doLoad(), { timeout: 1200 })
  } else {
    setTimeout(() => doLoad(), 300)
  }
}
