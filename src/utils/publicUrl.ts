/**
 * Resolves a path under `public/` against Vite's configured base, so it
 * still works when the app is served from a GitHub Pages project path
 * (https://user.github.io/repo/) instead of a domain root. Never hardcode
 * a leading-slash path to a public asset - it breaks under a non-root base.
 */
export function publicUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
