# Edward Ranz V. Cardoza — Portfolio

Personal portfolio for Edward Ranz V. Cardoza, a Computer Science student at Cavite State University – Main Campus. Built with Astro and TypeScript.

## Local development

```bash
pnpm install
pnpm dev
```

Run `pnpm check` to validate the source and `pnpm build` to generate the static site in `dist/`. Project entries can be added in `src/data/projects.ts` when ready to publish. The site contains no fabricated projects.

The split hero includes Contact Me, View Projects, and Download CV. Navigation and the theme switch scroll with the page while the portfolio brand stays fixed. The theme switch is at the top right, follows the operating system until a choice is made, and stores that choice in local storage. Both palettes have their own readable surfaces and accent text.

Technologies use compact tiles with expandable learning stories. Entrance, scroll, and hover effects respect `prefers-reduced-motion`; no animation library is required. Existing sections, certificate previews, and project routing remain in place.

The section order is Home, Technologies, Projects, About, Education, Experience, Gallery, and Contact. Education includes CvSU college study (2025–present) followed by PCU–Dasmariñas Senior High School (2023–2025), without adding an unspecified strand. Home and Gallery have subtle static mesh gradients.

Desktop mouse users get a Mint-inspired pointer and hand. A difference-blended fill contrasts against actual background pixels, while the outline transitions between dark and light surfaces in 80ms. Position updates directly, without easing or a trailing animation; the overlay cannot intercept clicks. Text, resize, disabled, touch, forced-color, and unsupported-browser cursors remain native or use the existing SVG fallback. The cursor also works inside certificate previews.

Scroll reveals replay in both directions with separate entrance and exit thresholds to avoid boundary flicker. Keyboard-focused content stays visible, and reduced motion disables reveal animations, including when the preference changes during a visit. It also uses native cursors and skips the preloader. Certificate previews retain keyboard navigation and entrance/exit animations.

The initial RANZ preloader waits for fonts and the hero portrait, with a 1.5-second escape timer for failed assets or scripts. It adds no minimum waiting period. Below-fold certificate images use WebP thumbnails; full-size WebP previews load only when opened. The portrait uses 350px and 700px responsive variants. Original assets remain available as sources.

The supplied CV is unchanged, including its older information. Replace `public/assets/Edward-Ranz-Cardoza-CV.pdf` to update it, or change the download path and filename in `src/data/site.ts`. The PDF is intended to be publicly downloadable.

GitHub cards show public Sincooo repositories and refresh from the public REST API when the section approaches the viewport. Contributions refresh through the read-only Vercel function `api/github.mjs`, first when visible and then every five minutes while the page and section are visible. Vercel caches the response for five minutes. This follows GitHub's own contribution-reporting delay rather than promising instant updates. No token or paid service is needed. A saved, dated snapshot remains visible if either service is unavailable. Static local preview uses the saved calendar. Run `pnpm github:refresh` before a release to update both snapshots in `src/data/github.json`. The calendar retains daily counts in a keyboard-accessible disclosure.

The CvSU logo is sourced from the [official university website](https://cvsu.edu.ph/wp-content/uploads/2018/01/CvSU-logo-trans.png), stored at `public/assets/cvsu-logo.png`, and displayed without changing its aspect ratio.
