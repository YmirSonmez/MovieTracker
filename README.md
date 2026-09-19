# MovieTracker

## Design skills

This project uses two Claude Code skill sources for frontend/UI work, installed under `.claude/skills/`:

- **[taste-skill](https://github.com/Leonxlnx/taste-skill)** — anti-slop frontend skills (`design-taste-frontend`, `minimalist-ui`, `industrial-brutalist-ui`, `brandkit`, image-generation variants, etc.). Tracked in `skills-lock.json`; update with `npx skills update`.
- **[awesome-design-md](https://github.com/VoltAgent/awesome-design-md)** — vendored catalog of 70+ real-world `DESIGN.md` files (Spotify, Pinterest, Apple, Stripe, ...) for concrete visual-direction references, wrapped as `.claude/skills/awesome-design-md/SKILL.md`.

When building any screen, default to `design-taste-frontend` for layout/motion rules and pick a matching `DESIGN.md` from `awesome-design-md` for concrete tokens (colors, type, spacing) — see that skill's `SKILL.md` for guidance on which catalog entries fit a poster/media-grid app like this one.
