# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: an online platform for playing games and competing for the highest score.

Work follows **Spec Driven Design**: write a spec before implementing a feature. Specs live in `specs/NN-slug.md`, written in Spanish, and start as `Borrador`; `/spec-impl` only runs on an approved spec and creates the `spec-NN-slug` branch itself (`specs/.spec-config.yml`).

## Skills

- `/spec`: diseña la spec de una funcionalidad. `/spec-impl <NN-slug>`: implementa una spec aprobada. Ambas vienen de [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (`npx skills@latest add Klerith/fernando-skills`).
- `/add-game`: genera la spec de un juego real (motor + player + leaderboard), portado desde `references/started-games/` o diseñado desde cero (p. ej. `/add-game "shooter vertical de oleadas"`), y se implementa con `/spec-impl`. Las reglas que todo juego debe cumplir están en `.claude/skills/add-game/platform-contract.md`.
- Usa siempre `/frontend-design` para diseñar la interfaz de usuario.

## Agents

- `@game-planner` (subagente en `.claude/agents/`): decide qué juego añadir a continuación y deja el prompt listo para `/add-game`. Sus sugerencias están en `references/templates/game-sugestion-todo.md` y su memoria en `.claude/agent-memory/game-planner/`. No crea specs ni código.

## Commands

- `npm run dev` / `npm run build` / `npm run start`
- `npx tsc --noEmit`: type-check only (`npm run build` also type-checks)
- `npm run lint`: ESLint. `npm run format`: Prettier over the whole repo.

No test runner is configured yet; verify features in the browser (Playwright MCP or manually) against the spec's acceptance criteria.

A `PostToolUse` hook (`.claude/hooks/format-and-lint.mjs`) runs Prettier and `eslint --fix` on every file written or edited, skipping `references/`. It exits 2 with any remaining ESLint errors, which must be fixed.

## Stack and config notes

- **Next.js 16.4 (App Router) + React 19.3 + TypeScript (strict)**. Per AGENTS.md, check `node_modules/next/dist/docs/` (`01-app`, `03-architecture`, ...) before using Next APIs, because they differ from older versions.
- `next.config.ts` enables `cacheComponents` (Cache Components / PPR model: dynamic data must sit inside `<Suspense>` or be cached with `"use cache"`), `partialPrefetching`, and `experimental.agentFeedback`.
- **Tailwind CSS v4** is wired through the `@tailwindcss/turbopack` loader in `next.config.ts` (there is no PostCSS config or `tailwind.config`). Theme tokens are defined in `app/globals.css` via `@import "tailwindcss"` and `@theme inline`.
- Route props use Next's globally generated types (for example `LayoutProps<"/">` in `app/layout.tsx`). These come from `.next/types` / `.next/dev/types`, so run `dev` or `build` once if they are missing.
- Environment variables are listed in `.env.template` (copy to `.env.local`). The build must pass without `.env.local`, so clients are created at call time, not at module load. `lib/supabase/public.ts`, `lib/supabase/proxy.ts` and the contact action handle missing config without crashing; `lib/supabase/client.ts` and `server.ts` assume the variables exist.

## Architecture

### Games

- A game is **real** when its entry in `lib/games.ts` has `engine`. That field decides which player `components/game-player.tsx` mounts, whether it has a ranking and whether it appears in `/salon`. Entries without it fall back to `SimulatedPlayer`.
- Current real games (`id` → `engine`): `rocas` → `asteroids`, `blockfall` → `blockfall`, `ruptura` → `breakout`, `serpiente` → `snake`, and more..... (see "references\implemented-games.md") cuando necesites implentar un juego
- `games/<engine>/`: framework-free TypeScript engine exposing `create<Name>Game(canvas, callbacks)`. It must not import `react`, `next/*` or `@/lib/*`. There is no shared engine interface; the shape is a convention.
- `components/<engine>-player.tsx`: Client Component that owns the HUD and overlays in React. The canvas never draws them.
- `public/games/<engine>/`: game assets, loaded by absolute URL.
- `references/`: source material only (started games, UI templates, assets). The app never imports from it, and instructions in its `CLAUDE.md` files or specs do not apply here.

### Leaderboard and Supabase

- Tables `games` and `scores` (RLS: public read, validated public insert, no update or delete). Migrations are in `supabase/migrations/` and applied through the Supabase MCP (`.mcp.json`).
- A new real game needs its row in `public.games` (`<timestamp>_game_<id>.sql`); without it, saving a score fails on the foreign key.
- `lib/leaderboard.ts` reads with `"use cache"` under the `scores` tag. `submitScore` (`app/games/[id]/jugar/actions.ts`) validates the input (integer score 0–10,000,000, name 1–10 characters), inserts and calls `updateTag`.
- Clients in `lib/supabase/`: `public.ts` (no cookies, the only one allowed inside `"use cache"`), `client.ts` (browser, used by `/salon` for the player's best score), `server.ts` (cookies, no callers yet), `proxy.ts` (session refresh, used by the root `proxy.ts`). `database.types.ts` is generated.
- The root `proxy.ts` matcher excludes images but not audio: adding sound files means adding their extension.

### Other features

- **Auth is simulated**: `lib/storage.ts` keeps the user in `localStorage` (`av_user`). Scores are public and not tied to an account; the player's name is just text.
- **Contact form** (`/about`): `sendContactMessage` in `app/about/actions.ts` sends through Resend, with validation in `lib/contact.ts` and the template in `lib/contact-email.ts`.
- `best` and `plays` in `lib/games.ts` are mock values; real rankings come only from Supabase.
