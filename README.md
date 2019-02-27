# Usage

1. `npm i gcanti/docs-ts -D`

2. `npm i doctoc -D`

3. `npm i rimraf -D`

4. `mkdir docs`

5. add `docs/index.md` with

```
---
title: Home
---

<!-- START doctoc -->
<!-- END doctoc -->
```

5. add `docs/_config.yml`

```yml
remote_theme: pmarsceill/just-the-docs

# Enable or disable the site search
search_enabled: true

# Aux links for the upper right navigation
aux_links:
  '<name> on GitHub':
    - '//github.com/gcanti/<name>'
```

6. add `docs.ts`

```ts
import { main } from 'docs-ts'

main('src/**/*.ts', 'docs').run()
```

7. add to `package.json`

```json
"doctoc": "doctoc docs",
"docs": "rimraf rm -rf docs/**/*.md!docs/index.md && ts-node docs.ts && npm run doctoc"
```
