# Edward Ranz V. Cardoza — Portfolio

Personal portfolio for Edward Ranz V. Cardoza, a Computer Science student at Cavite State University – Main Campus. Built with Astro and TypeScript.

## Local development

```bash
pnpm install
pnpm dev
```

Run `pnpm check` to validate the source and `pnpm build` to generate the static site in `dist/`. Project entries can be added in `src/data/projects.ts` when ready to publish. The site contains no fabricated projects.

The hero includes Contact Me and View Projects links. Navigation offers Technologies, Projects, About, and Contact; it scrolls with the page while the portfolio brand stays fixed.

Technologies use compact tiles with expandable learning stories. Entrance, scroll, and hover effects respect `prefers-reduced-motion`; no animation library is required. Existing sections, certificate previews, and project routing remain in place.

The section order is Home, Technologies, Projects, About, Education, Experience, Gallery, and Contact. Education includes CvSU college study (2025–present) followed by PCU–Dasmariñas Senior High School (2023–2025), without adding an unspecified strand. Home and Gallery have subtle static mesh gradients.

Desktop mouse users get a Mint-inspired pointer and hand. A difference-blended fill contrasts against actual background pixels, while the outline transitions between dark and light surfaces in 80ms. Position updates directly, without easing or a trailing animation; the overlay cannot intercept clicks. Text, resize, disabled, touch, forced-color, and unsupported-browser cursors remain native or use the existing SVG fallback. The cursor also works inside certificate previews.

Scroll reveals replay in both directions with separate entrance and exit thresholds to avoid boundary flicker. Keyboard-focused content stays visible, and reduced motion disables reveal animations, including when the preference changes during a visit. Certificate previews retain keyboard navigation and entrance/exit animations.

The CvSU logo is sourced from the [official university website](https://cvsu.edu.ph/wp-content/uploads/2018/01/CvSU-logo-trans.png), stored at `public/assets/cvsu-logo.png`, and displayed without changing its aspect ratio.
