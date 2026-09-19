---
name: awesome-design-md
description: Curated catalog of 70+ real-world DESIGN.md files (Spotify, Netflix-adjacent media apps, Pinterest, Apple, Stripe, etc.) extracted from popular products. Use when starting a new UI/frontend surface in MovieTracker and you need a concrete, battle-tested visual direction (colors, type scale, spacing, component styling) instead of inventing one from scratch, or when the user asks to make a screen "look like X".
---

# awesome-design-md

Vendored from https://github.com/VoltAgent/awesome-design-md (MIT, see `LICENSE`), so it works offline.

## What DESIGN.md is

A plain-text design system spec: color palette, type hierarchy, component styling, spacing, motion, and guardrails, written for an AI agent to read and follow — the visual counterpart to an `AGENTS.md`.

## How to use this in MovieTracker

1. Browse `design-md/` — one folder per source (e.g. `spotify`, `pinterest`, `apple`, `stripe`, `netflix`-style media apps aren't literal but `spotify`/`pinterest` are the closest analogs for a poster/media-grid app like a movie tracker).
2. Pick the folder whose visual language fits the surface you're building (dark, poster-grid, media-library feel → start with `spotify` or `pinterest`; clean editorial → `apple`; data-dense → `linear.app` or `notion`).
3. Read that folder's `DESIGN.md` in full before writing UI code.
4. Either:
   - Copy it to the project root as `DESIGN.md` if it should govern the whole app's look, or
   - Just follow it as a one-off reference for the screen you're building, without copying it in.
5. Combine with the `design-taste-frontend` skill in this repo: use `design-taste-frontend` for layout/motion/anti-slop rules, and a `DESIGN.md` from this catalog for the concrete token values (colors, type, spacing) so the two don't contradict each other. When they conflict, the project's own `DESIGN.md` (if one has been adopted at the root) wins.
6. Never invent a design system for a new MovieTracker screen without first checking whether one of these catalogs already solves it.

To pull a fresher or additional entry later: `git clone https://github.com/VoltAgent/awesome-design-md` and copy the relevant `design-md/<name>/` folder in here.
