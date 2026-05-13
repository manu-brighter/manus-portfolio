/**
 * Harden a value for inline embedding inside a `<script>` tag.
 *
 * `JSON.stringify` does not escape `</script>` or `<!--`, so a string
 * that ever contained those sequences would break out of the script
 * context. By replacing every `<` with its `<` escape we keep the
 * JSON byte-identical for inputs that don't contain those sequences,
 * and neutralise the breakout for inputs that do — pure defence-in-
 * depth ahead of the SF-1 CSP rollout.
 *
 * Used by both the locale-detect bootstrap (`src/app/page.tsx`) and the
 * JSON-LD injection in `src/app/[locale]/layout.tsx`.
 */
export const escapeForScript = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, "\\u003c");
