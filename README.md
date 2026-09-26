# Edward Ranz V. Cardoza — Portfolio

Personal portfolio for Edward Ranz V. Cardoza, a Computer Science student at Cavite State University – Main Campus. Built with Astro and TypeScript.

## Local development

```bash
pnpm install
pnpm dev
```

Run `pnpm check` to validate the source and `pnpm build` to generate the static site in `dist/`. Project entries can be added in `src/data/projects.ts` when ready to publish. The site contains no fabricated projects.

The hero includes a Contact Me link and a Download CV button. The CV button stays disabled, with a “CV coming soon” note, until a real file is available. To enable it, place your CV in `public/assets/` and set `cvUrl` in `src/data/profile.ts` to its public path (for example, `/assets/cv.pdf`).

Technologies use compact tiles with expandable learning stories. Entrance, scroll, and hover effects respect `prefers-reduced-motion`; no animation library is required. Existing sections, certificate previews, and project routing remain in place.
