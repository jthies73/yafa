# Yafa Project

> **Instructions sync**: This project maintains two parallel instruction files — `CLAUDE.md` (Claude Code) and `.gemini/instructions.md` (Gemini). Whenever instructions are added or changed in one file, apply the same change to the other.

## Design Language & Visual Aesthetics

- **Minimalistic, flat, technical style**: Maintain a polished, minimalistic, flat, and clean aesthetic. Avoid unnecessary gradients, heavy skeuomorphism, or decorative bloat.
- **Primary accent color**: `#1fc7b9` (turquoise). Support dark/light mode using Tailwind v4 theme variables.
- **Mobile-first approach**: Design all layouts, interactions, and media screens primarily for mobile viewports, ensuring a seamless phone interface before scaling to larger screens.
- **Responsive breakpoints**: Use exactly three breakpoint tiers — mobile (default), tablet (`md:`), desktop (`lg:`). Do not use `sm:`, `xl:`, `2xl:`, or any other intermediate breakpoints.
- **Consistency**: Align new components with existing styles, typography, and spacing.
- **Assets**: Never use generic image placeholders. Prefer inline SVGs or programmatic graphics styled with Tailwind utility classes.
- **Interactive Cursor**: Explicitly apply the `cursor-pointer` utility class (or `cursor: pointer` in CSS) to all clickable elements (buttons, links, triggers, interactive controls) to ensure clear visual feedback.
- **Interactive Feedback**: Clickable elements must change color slightly on hover to indicate clickability (in addition to having `cursor-pointer`). There should be no animation (such as scale or translate transitions) on hover.
- **Navigation Highlighting**: Navigation links in headers or menus must remain highlighted (using the active/accent style) when navigating into subroutes or details pages corresponding to that section (e.g., keeping "Plans" highlighted when on `/plans/:id` or `/routines/:id`).

## Stack & Technologies

- **Framework**: Vue 3 with Composition API (`<script setup lang="ts">`)
- **Build system**: Vite
- **Styling**: Tailwind CSS v4 — always prefer utility classes over custom CSS
- **Component library**: Reka UI — use it for complex UI controls and accessible structures instead of building from scratch
- **PWA**: Integrated using `vite-plugin-pwa`.
- **State Persistence / Database**: **Dexie.js** (IndexedDB wrapper) for robust, offline persistence of all app-related state (workouts, exercises, routines, RPE grids).
- **Navigation Persistence**: Always save and restore the `fullPath` (e.g. `/plans/123`) of the current page to the persistent app state instead of just the route name, ensuring dynamic routes with parameters remain persistent across reloads.

## Localization (i18n)

- **Library**: `vue-i18n` (Composition API, `legacy: false`). Locale files live in `src/locales/` as flat JSON per language (`en.json`, `de.json`); the i18n instance is configured in `src/i18n.ts`. English is the default and strict fallback.
- **Mandatory coverage**: Every new or modified component must have ALL user-facing strings (template text, aria-labels, titles, placeholders, dynamic script strings) behind translation keys, with **both English and German** translations added to `en.json` and `de.json`.
- **Key convention**: Component-scoped snake_case keys (e.g. `settings.language_label`), shared strings under `common.*`. Use vue-i18n pluralization (`"{n} set | {n} sets"`, called as `$t('key', n)`) and interpolation (`"Adherence: {percentage}%"`) — never concatenate translated fragments in code.
- **Data boundary**: System UI and system constants translate via keys. User-entered data (custom exercise/routine/plan/measurement names, notes) must NEVER be translated — render raw strings. Seeded entries and system names (muscle groups, seeded exercises, the system Bodyweight type, mesocycle focus labels) translate at display time via the `useSystemNames()` composable; stored DB values stay in English.
- **Units are independent**: Language selection never affects weight/length unit settings.
- **Locale-aware dates**: Use the active locale (`useI18n().locale.value`) for `toLocaleDateString`/`toLocaleTimeString`, never hardcoded `"en-US"`.

## Project Structure

- `index.html` — static landing page with inline styles, logo, and 3-second redirect logic (kept static for SEO before JS execution)
- Vue app mounts to `#app` and resolves directly to `Dashboard.vue`
- `src/components/Dashboard.vue` — main dashboard component

## Code Guidelines

- Reuse existing components whenever possible; avoid duplicate logic or styling
- Keep components focused, reusable, and single-purpose
- Use strict TypeScript: interface definitions, `ref`, `computed`, and proper typing throughout
- Format code with Prettier before finalizing: `yarn format`
- **Refactoring & Simplification**: When explicitly prompted, proactively refactor, modularize, and simplify any code created or modified during the current session. Remove unnecessary or redundant code, extract complex logic into reusable composables or smaller components, and focus strictly on an elegant, concise, and highly maintainable code structure. Always prioritize simplicity and clarity over complex abstractions.
- **Comments**: Keep comments when they genuinely aid understanding — e.g. non-obvious logic, subtle invariants, or tricky workarounds. In templates, keep section comments (e.g. `<!-- Exercise selector -->`) to aid navigation. Do not add comments that merely restate what the code already says.
