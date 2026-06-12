# Yafa Project Gemini Instructions

This file contains base instructions and technical guidelines for Google Gemini to pair-program on the Yafa project.

> **Instructions sync**: This project maintains two parallel instruction files — `CLAUDE.md` (Claude Code) and `.gemini/instructions.md` (Gemini). Whenever instructions are added or changed in one file, apply the same change to the other.

---

## 🎨 Design Language & Visual Aesthetics

- **Minimalistic, Flat, & Technical Style**: Always maintain a highly polished, minimalistic, flat, and technical/clean aesthetic across the entire application. Avoid unnecessary gradients, heavy skeuomorphism, or bloated decorations.
- **Harmonious Palette**: Use `#1fc7b9` (turquoise) as the primary accent color. Support dark/light mode configurations smoothly using Tailwind v4 theme variables.
- **Mobile-First Design**: Design all layouts, user experiences, and screen components primarily optimized for mobile viewports, ensuring a seamless phone interface before scaling upwards.
- **Responsive Breakpoints**: Use exactly three breakpoint tiers — mobile (default), tablet (`md:`), desktop (`lg:`). Do not use `sm:`, `xl:`, `2xl:`, or any other intermediate breakpoints.
- **Alignment & Consistency**: When creating new components or populating pages, align the new designs seamlessly with existing stylings, typography, and spacing.
- **Asset Integrity**: Never use generic image placeholders. Prefer inline SVGs or clean programmatic graphics styled with Tailwind utility classes.
- **Interactive Cursor**: Explicitly apply the `cursor-pointer` utility class (or `cursor: pointer` in CSS) to all clickable elements (buttons, links, triggers, interactive controls) to ensure clear visual feedback.
- **Interactive Feedback**: Clickable elements must change color slightly on hover to indicate clickability (in addition to having `cursor-pointer`). There should be no animation (such as scale or translate transitions) on hover.
- **Navigation Highlighting**: Navigation links in headers or menus must remain highlighted (using the active/accent style) when navigating into subroutes or details pages corresponding to that section (e.g., keeping "Plans" highlighted when on `/plans/:id` or `/routines/:id`).
- **Animations and Transitions**: Never use animations or transitions. Only use animations and transitions when specifically asked to do so.

---

## 🛠️ Stack & Technologies

- **Framework**: Vue 3 (Composition API using `<script setup lang="ts">`).
- **Build System**: Vite.
- **Styling**: Tailwind CSS v4. Always prefer Tailwind utility classes over custom CSS.
- **Component Library**: Use **Reka UI** components (installed in the project) when applicable instead of writing complex UI controls or accessible structures from scratch.
- **PWA**: Integrated using `vite-plugin-pwa`.
- **State Persistence / Database**: **Dexie.js** (IndexedDB wrapper) for robust, offline persistence of all app-related state (workouts, exercises, routines, RPE grids).
- **Navigation Persistence**: Always save and restore the `fullPath` (e.g. `/plans/123`) of the current page to the persistent app state instead of just the route name, ensuring dynamic routes with parameters remain persistent across reloads.

---

## 🌍 Localization (i18n)

- **Library**: `vue-i18n` (Composition API, `legacy: false`). Locale files live in `src/locales/` as flat JSON per language (`en.json`, `de.json`); the i18n instance is configured in `src/i18n.ts`. English is the default and strict fallback.
- **Mandatory Coverage**: Every new or modified component must have ALL user-facing strings (template text, aria-labels, titles, placeholders, dynamic script strings) behind translation keys, with **both English and German** translations added to `en.json` and `de.json`.
- **Key Convention**: Component-scoped snake_case keys (e.g. `settings.language_label`), shared strings under `common.*`. Use vue-i18n pluralization (`"{n} set | {n} sets"`, called as `$t('key', n)`) and interpolation (`"Adherence: {percentage}%"`) — never concatenate translated fragments in code.
- **Data Boundary**: System UI and system constants translate via keys. User-entered data (custom exercise/routine/plan/measurement names, notes) must NEVER be translated — render raw strings. Seeded entries and system names (muscle groups, seeded exercises, the system Bodyweight type, mesocycle focus labels) translate at display time via the `useSystemNames()` composable; stored DB values stay in English.
- **Units Are Independent**: Language selection never affects weight/length unit settings.
- **Locale-Aware Dates**: Use the active locale (`useI18n().locale.value`) for `toLocaleDateString`/`toLocaleTimeString`, never hardcoded `"en-US"`.

---

## 📂 Structural Layout & SEO

- **Static Landing Page**: The landing page is contained entirely in `index.html` (including styling, logo, and 3-second redirect logic) to optimize search engine crawling and SEO before JavaScript execution.
- **Vue App Entry**: Mounts to `#app` inside `index.html` and resolves to `Dashboard.vue` directly.
- **Dashboard Component**: Positioned inside `src/components/Dashboard.vue` containing only a beautiful, centered gradient headline.

---

## 🚀 Component Creation & Reuse Rules

- **Component Reuse**: Reuse existing components whenever possible to avoid duplicate logic or styling.
- **Code Splitting**: Keep components focused, reusable, and single-purpose.
- **TypeScript Best Practices**: Always use strict typing, interface definitions, and reactive primitives (`ref`, `computed`).
- **Code Formatting**: Ensure all code is cleanly formatted using Prettier (`yarn format`) before finalizing changes.
- **Refactoring & Simplification**: When explicitly prompted, proactively refactor, modularize, and simplify any code created or modified during the current session. Remove unnecessary or redundant code, extract complex logic into reusable composables or smaller components, and focus strictly on an elegant, concise, and highly maintainable code structure. Always prioritize simplicity and clarity over complex abstractions.
- **Comments**: Keep comments when they genuinely aid understanding — e.g. non-obvious logic, subtle invariants, or tricky workarounds. In templates, keep section comments (e.g. `<!-- Exercise selector -->`) to aid navigation. Do not add comments that merely restate what the code already says.
