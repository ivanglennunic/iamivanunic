# Parallax Personal Website (Static)

Lightweight, host-anywhere personal site with scroll parallax layers and a Three.js interactive hero canvas.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

The static output is generated in `dist/`.

## Deploy (static hosting)

- **Any web host**: upload the contents of `dist/` to your hosting provider.
- **Netlify / Vercel (static)**: set build command to `npm run build` and publish directory to `dist/`.
- **GitHub Pages**: two common ways:
  - **A) Publish `dist/`** (simplest): build locally (`npm run build`) and publish the `dist/` folder using your preferred Pages workflow/tooling.
  - **B) GitHub Actions** (recommended): use a Pages workflow that runs `npm ci` + `npm run build` and deploys `dist/`.

### GitHub Pages base path note
If you deploy to `https://USERNAME.github.io/REPO/` (project pages), Vite usually needs a base path.

- Create `vite.config.js` with:

```js
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/REPO/',
})
```

If you deploy to a root domain (or a host that serves from `/`), you can skip this.

## Customize

- **Name + links**: edit `index.html` (search for `Ivan`, `ivanglennunic@gmail.com`, and social URLs if they change).
- **Resume**: replace `public/assets/resume.pdf` with your real resume (keep the same path so links keep working).
- **Colors**: tweak CSS variables in `src/styles.css` (notably `--accent` and `--accent2`).
