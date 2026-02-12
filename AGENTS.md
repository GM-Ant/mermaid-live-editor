## Repository Overview

- Tech stack: Svelte 5, SvelteKit 2, TypeScript, Tailwind CSS 4, Vite, Vitest, Playwright
- Package manager: pnpm (v10.10.0)
- Node version: >=20.19.0
- App aliasing: `$lib` (SvelteKit default) and `$/...` -> `src/lib/...`

## Build / Lint / Test Commands

### Build Commands

- `pnpm build` - Production build (outputs to `docs/` for GitHub Pages)
- `pnpm preview` - Preview production build
- `pnpm dev` - Start dev server on port 3000
- `pnpm dev:force` - Start dev server with `MERMAID_LOCAL=true` and `--force`

### Lint Commands

- `pnpm lint` - Run Prettier check + ESLint (does not write files)
- `pnpm lint:fix` - Auto-fix all linting issues (runs Prettier --write + ESLint --fix)
- `pnpm format` - Run Prettier formatting only

### Test Commands

- `pnpm test` - Run ALL tests (unit + E2E)
- `pnpm test:unit` - Run unit tests with Vitest
- `pnpm test:e2e` - Run E2E tests with Playwright
- `npx vitest src/lib/foo.test.ts` - Run a single unit test file
- `npx playwright test tests/foo.spec.ts` - Run a single E2E test file
- `pnpm test:unit:ui` - Vitest UI mode for debugging
- `pnpm test:e2e:ui` - Playwright UI mode for debugging
- `pnpm test:e2e:debug` - Playwright debug mode
- `pnpm test:unit:coverage` - Generate unit test coverage

## Code Style Guidelines

### Svelte 5 Components

- Use `<script lang="ts">` for instance logic and `<script lang="ts" module>` for type definitions
- Use Svelte 5 runes: `$state`, `$props`, `$derived`, `$effect`
- Component props destructured with: `let { prop, ...rest }: Props = $props()`
- Use `$bindable()` for two-way bindings
- Use `class={cn(...)}` utility for conditional Tailwind classes
- Use tailwind-variants (`tv()`) for component variant styling
- Prefer `class` over `className` for HTML elements

### TypeScript

- Strict mode enabled: `strictNullChecks: true`
- Use type inference where possible, explicit types for exports
- Prefer interface for object shapes, type for unions/literals
- Use type-only imports: `import type { ... }`
- Use `// eslint-disable-next-line @typescript-eslint/no-explicit-any` sparingly when necessary

### Imports

- Use `$lib` alias for src/lib imports: `import { foo } from '$lib/utils'`
- Use `$/` alias for src/lib imports: `import { Component } from '$/components'`
- Node modules imports first, then local imports
- Sort imports alphabetically (enforced by ESLint)
- Use named exports from modules (enforced by unicorn rules)

### Formatting (Prettier)

- Single quotes: `true`
- Trailing commas: `none`
- Print width: 100 characters
- Svelte sort order: `options-scripts-markup-styles`
- Bracket same line: `true`
- Plugins: prettier-plugin-svelte, prettier-plugin-tailwindcss

### ESLint Rules

- Key sorting enforced in `src/**` for objects with 5+ keys
- No-null check disabled (allow `null` values)
- No unused props check disabled for Svelte
- Prevent abbreviations disabled for UI components
- Explicit length check disabled for UI components

### Naming Conventions

- Components: PascalCase (e.g., `Button.svelte`, `UserProfile.svelte`)
- Files: PascalCase for components, kebab-case for utilities (e.g., `user-utils.ts`)
- Directories: PascalCase for components, kebab-case for features
- Variables: camelCase
- Constants: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- Test files: `.test.ts` or `.spec.ts` suffix

### Error Handling

- Use `instanceof Error` checks for error objects
- Log errors with user-friendly messages
- Show error UI feedback when stateStore.error is present
- Handle async errors with try/catch or error boundaries
- Use data-testid attributes for E2E test targeting

### Tailwind CSS

- Use `cn()` utility to merge Tailwind classes
- Use `tv()` (tailwind-variants) for component variant patterns
- Follow existing design tokens: `primary`, `secondary`, `accent`, `destructive`
- Use semantic class names: `bg-background`, `text-foreground`, `border-input`

### Component Structure (UI components)

- Use Shadcn-like pattern with `index.ts` barrel exports
- Module script: variant definitions, type exports
- Instance script: props destructuring, local state
- Template: conditional rendering, class merging

## Cursor / Copilot Rules

- No Cursor rules configured (`.cursor/rules/` and `.cursorrules` do not exist)
- No Copilot instructions (`.github/copilot-instructions.md` does not exist)

## CI/CD

- Unit tests run on PR to `master` and `develop` branches
- Lint and test:unit must pass before merge
- E2E tests run in separate workflow

## Special Notes

- Static site generation outputs to `docs/` folder for GitHub Pages
- Dev server and preview run on port 3000 with HMR disabled (full reload always)
- Unit tests are in-source (co-located under `src/`), E2E tests live in `tests/`
- Icons loaded via unplugin-icons, custom icons in `static/icons/`
- Use `~icons/` prefix for icon imports from @iconify-json packages
