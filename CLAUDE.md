# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: an online platform for playing games and competing for the highest score.

Work follows **Spec Driven Design** using the `/spec` and `/spec-impl` skills from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (`npx skills@latest add Klerith/fernando-skills`). Write a spec before implementing a feature.

## Skills

Usa siempre /frontend-design para diseñar la intefaz de usuario

## Commands

- `npx tsc --noEmit`: type-check only (`npm run build` also type-checks)

No test runner is configured yet.

## Stack and config notes

- **Next.js 16.4 (App Router) + React 19.3 + TypeScript (strict)**. Per AGENTS.md, check `node_modules/next/dist/docs/` (`01-app`, `03-architecture`, ...) before using Next APIs, because they differ from older versions.
- `next.config.ts` enables `cacheComponents` (Cache Components / PPR model: dynamic data must sit inside `<Suspense>` or be cached with `"use cache"`), `partialPrefetching`, and `experimental.agentFeedback`.
- **Tailwind CSS v4** is wired through the `@tailwindcss/turbopack` loader in `next.config.ts` (there is no PostCSS config or `tailwind.config`). Theme tokens are defined in `app/globals.css` via `@import "tailwindcss"` and `@theme inline`.
- Route props use Next's globally generated types (for example `LayoutProps<"/">` in `app/layout.tsx`). These come from `.next/types` / `.next/dev/types`, so run `dev` or `build` once if they are missing.
