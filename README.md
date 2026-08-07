# Four Oceans Group — Landing Page

Marketing landing page for **Four Oceans Group**, a Pretoria-based procurement and cross-border logistics company connecting South Africa and Zimbabwe.

Four Oceans Group sources genuine building materials, groceries, automotive parts and household appliances in South Africa and delivers them door to door in Zimbabwe, alongside cross-border freight, storage and relocation services (student storage, Hatfield move-outs, full household relocations).

**Live site:** _added after first deploy_

## Tech stack

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies — the page ships exactly as written.

- `index.html` — page markup
- `styles.css` — all styling (design tokens live at the top as CSS custom properties)
- `script.js` — mobile nav toggle, quote form handling, scroll-reveal animation, and a small Canvas 2D generative background behind the "Who We Serve" section
- `assets/` — hero photography, the brand mark, and the poster campaign gallery images
- `amplify.yml` — build spec for AWS Amplify Hosting (static passthrough, no build commands needed)

## Running locally

No install, no build. Any static file server works, for example:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Deployment

Hosted on **AWS Amplify**, connected to the `main` branch of this repo. Every push to `main` triggers an automatic build and deploy — there's nothing to run manually.

## Brand

- Colours: deep navy `#0B2340`, gold `#CC9A3C`, teal `#1C8C86` — see the `:root` custom properties in `styles.css` for the full token set.
- Fonts: [Archivo](https://fonts.google.com/specimen/Archivo) (display/UI), [Bebas Neue](https://fonts.google.com/specimen/Bebas+Neue) (hero headline), [Inter](https://fonts.google.com/specimen/Inter) (body), via Google Fonts.
- Tagline: "Connecting Africa · Delivering Possibilities"
