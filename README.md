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

The section order is Home, Technologies, Projects, About, Education, Experience, Gallery, and Contact. Desktop users get native SVG cursors with black and white outlines; touch and forced-color environments keep system cursors. Certificate previews support keyboard navigation, entrance and exit animations, and reduced motion.

The CvSU logo is sourced from the [official university website](https://cvsu.edu.ph/wp-content/uploads/2018/01/CvSU-logo-trans.png), stored at `public/assets/cvsu-logo.png`, and displayed without changing its aspect ratio.
