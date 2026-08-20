# Luna task: verify recovered hero/sidebar consistency

Working directory: `/Users/peteromalley/Documents/banodoco-workspace/banodoco-website`

Read-only. Verify the current intentional visual changes are present and
internally connected without judging or reverting them.

Expected recovered blob IDs:

- `main.js`: `569e4d2ce3c11abecd61781a2166513dd3d43fe7`
- `journey/cards/cards.css`: `030cf9f33175e716f3aefe55ce549c47bcdc5f64`

Check:

- Exact blob IDs match.
- Every new CSS variable used by the sidebar/icon-tab animation is written by
  current JavaScript along the intended arrival path, or report missing links.
- The landscape hero calculation and resize reapplication remain syntactically
  and logically reachable.
- No structural-refactor import/export change prevents the behavior.

Rules: do not edit, reset, restore, checkout, stash, clean, or run heavy browser
tests. Run syntax/search/focused static checks only.

Return PASS/FAIL with exact file:line evidence and minimal missing actions.
