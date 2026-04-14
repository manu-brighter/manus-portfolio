---
description: Scaffold a new MDX project under content/projects with all 4 locales + frontmatter template.
argument-hint: <slug>
---

Scaffold a new project with slug `$1`.

1. Validate: `$1` is kebab-case (`/^[a-z][a-z0-9-]*$/`) and no file exists yet
   at `content/projects/$1.de.mdx`.
2. Create four files, one per locale (`de`, `en`, `fr`, `it`), each using
   this frontmatter:

   ```mdx
   ---
   slug: "$1"
   locale: "<de|en|fr|it>"
   title: "…"
   year: 2026
   role: "…"
   stack: []
   heroImage: "/photos/$1/hero.avif"
   spotColor: "rose"  # one of: rose | amber | mint | violet
   draft: true
   ---

   # $1
   ```

3. Report the four created paths. Do **not** populate body content —
   that is an author task.
