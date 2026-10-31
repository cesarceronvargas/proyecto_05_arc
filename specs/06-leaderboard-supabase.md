# SPEC 06 — Leaderboard real en Supabase

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-10-30
> **Objetivo:** Crear las tablas `games` y `scores` en Supabase y mostrar rankings reales (global y por juego) en `/salon` y `/games/[id]`, guardando las puntuaciones de ROCAS desde el `GameOverModal`.

## Por qué existe esta spec

Hoy todos los rankings son falsos: `/salon` y `/games/[id]` pintan `seededScores()` de `lib/games.ts`, y `GameOverModal` guarda en `av_scores` de `localStorage`, que nadie más ve.
SPEC 04 dejó la conexión a Supabase con el esquema `public` vacío, y SPEC 05 dejó ROCAS como primer juego real.
Esta spec crea el esquema mínimo para puntuaciones compartidas y conecta las dos vistas de ranking a él.

## Alcance

**Dentro:**

- **Migración SQL** versionada en `supabase/migrations/20261030000000_leaderboard.sql` y aplicada al proyecto con el MCP de Supabase (`apply_migration`):
  - Tabla `public.games` con una sola fila: `rocas`.
  - Tabla `public.scores` con FK a `games.id`, checks de nombre y puntuación, e índices para el top por juego y el top global.
  - RLS activado en ambas: `select` para `anon` y `authenticated` en las dos tablas, e `insert` para `anon` y `authenticated` solo en `scores`. Sin `update` ni `delete`.
- **Tipos regenerados** en `lib/supabase/database.types.ts` (en el mismo commit que la migración, convención de SPEC 04).
- **Cliente público sin cookies** en `lib/supabase/public.ts`: `createPublicClient()` con `createClient<Database>` de `@supabase/supabase-js`. Devuelve `null` si faltan las variables de entorno. Se usa dentro de `"use cache"`, donde no se puede llamar a `cookies()`.
- **Lecturas cacheadas** en `lib/leaderboard.ts`:
  - `getTopScores(gameId: string | null, limit = 10)`: `gameId = null` es el top global.
  - Usa `"use cache"` y `cacheTag("scores")`.
  - Sin cliente (sin variables) o con error de Supabase, devuelven `[]` y hacen `console.warn`.
- **Server Action** `submitScore` en `app/games/[id]/jugar/actions.ts`:
  - Valida que `gameId` sea un juego con `engine` en el catálogo, que `score` sea entero entre 0 y 10.000.000, y que el nombre, tras `trim().toUpperCase()`, tenga de 1 a 10 caracteres.
  - Inserta en `scores` con el cliente público y llama a `updateTag("scores")`.
  - Devuelve `{ ok: true }` o `{ ok: false, error: string }`.
- **`GameOverModal`**:
  - Recibe una prop nueva `ranked: boolean`.
  - Con `ranked`, GUARDAR PUNTUACIÓN llama a `submitScore` con estado de envío (`GUARDANDO…`, botón deshabilitado), éxito (`▸ PUNTUACIÓN GUARDADA_`) y error (`▸ NO SE PUDO GUARDAR · REINTENTAR`, el input se mantiene).
  - Sin `ranked`, en lugar del input se muestra `ESTE JUEGO AÚN NO TIENE RANKING`.
  - `AsteroidsPlayer` pasa `ranked`; la simulación de `GamePlayer` pasa `ranked={false}`.
- **`/salon`**:
  - `app/salon/page.tsx` obtiene el top global y el top de cada juego con ranking y se los pasa a `HallOfFame`.
  - Pestañas: `GLOBAL` (primera y por defecto) y una por cada juego con `engine` (hoy solo `ROCAS`). Los juegos simulados no aparecen.
  - La pestaña GLOBAL añade una columna `JUEGO` con el `title` del catálogo.
  - El podio muestra solo los puestos que existan. Con 0 filas, la tabla muestra `SÉ EL PRIMERO EN ENTRAR AL SALÓN` y un enlace a `/games/rocas/jugar`.
  - "TU MEJOR MARCA" se calcula en el cliente: con usuario simulado, consulta con el cliente de navegador la mejor puntuación de ese `player_name` (en el juego de la pestaña o en todos para GLOBAL) y su rango (`1 + nº de scores mayores`). Si no tiene marcas, la fila no aparece.
- **`/games/[id]`**:
  - Juegos con `engine`: `Leaderboard` con el top 10 real del juego; "Mejor global" pasa a ser el top 1 real, o `—` si no hay puntuaciones.
  - Juegos sin `engine`: el bloque del leaderboard muestra `RANKING PRÓXIMAMENTE`, y "Mejor global" sigue mostrando `game.best`.
  - `Leaderboard` con 0 filas muestra `SÉ EL PRIMERO`.
- **Limpieza de mocks**:
  - Se eliminan `seededScores`, `PLAYERS` y `ScoreRow` de `lib/games.ts`.
  - Se eliminan `ScoreEntry`, `SCORES_KEY`, `readScores`, `saveScore` y `getBestScore` de `lib/storage.ts`. La sesión simulada (`av_user`, `useUser`, `login`, `logout`) no cambia.
- La UI nueva (pestaña GLOBAL, columna JUEGO, estados vacío/error del modal, `RANKING PRÓXIMAMENTE`) se diseña con `/frontend-design`, según `CLAUDE.md`.

**Fuera de alcance (para futuras specs):**

- Supabase Auth y asociar puntuaciones a usuarios reales.
- Filas en `games` para los 7 juegos simulados. Se añaden al portarlos.
- Leer el catálogo (`GAMES`) desde Supabase.
- "Partidas" (`plays`) real, `best` de `game-card.tsx` y la Home (`ÚLTIMAS PUNTUACIONES`, `TOP JUGADORES · HOY`).
- Migrar `av_scores` existentes de `localStorage`.
- Anti-trampas más allá de los checks (firma de partidas, rate limiting, validación en servidor de la partida).
- Paginación, filtros por fecha (hoy/semana) y ranking agregado por jugador.
- Realtime (actualizar el ranking sin recargar).
- Supabase CLI y entorno local.
- Tests automatizados.

## Modelo de datos

```sql
-- supabase/migrations/20261030000000_leaderboard.sql
create table public.games (
  id text primary key,            -- igual que Game.id del catálogo
  title text not null,
  created_at timestamptz not null default now()
);
insert into public.games (id, title) values ('rocas', 'ROCAS');

create table public.scores (
  id bigint generated always as identity primary key,
  game_id text not null references public.games (id),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score between 0 and 10000000),
  created_at timestamptz not null default now()
);
create index scores_game_top_idx on public.scores (game_id, score desc, created_at asc);
create index scores_global_top_idx on public.scores (score desc, created_at asc);
create index scores_player_idx on public.scores (player_name);

alter table public.games enable row level security;
alter table public.scores enable row level security;
-- games: select para anon y authenticated
-- scores: select e insert para anon y authenticated (insert con los mismos checks)
```

```ts
// lib/leaderboard.ts
export type LeaderboardRow = {
  rank: number;      // 1..limit, por orden de la consulta
  name: string;      // scores.player_name
  score: number;
  gameId: string;    // scores.game_id
  date: string;      // created_at formateado dd/mm/aaaa
};
export async function getTopScores(gameId: string | null, limit?: number): Promise<LeaderboardRow[]>;

// lib/supabase/public.ts
export function createPublicClient(): SupabaseClient<Database> | null;

// app/games/[id]/jugar/actions.ts
export async function submitScore(input: {
  gameId: string;
  score: number;
  name: string;
}): Promise<{ ok: true } | { ok: false; error: string }>;
```

Convenciones:

- Orden del ranking: `score desc, created_at asc` (en empate gana la marca más antigua).
- Un jugador puede aparecer varias veces en un top (estilo arcade).
- "Juego con ranking" = `game.engine` definido en `lib/games.ts`. Cada juego con `engine` debe tener su fila en `games`.
- `LeaderboardRow` sustituye a `ScoreRow`.

## Plan de implementación

Antes del paso 1 se consultan en `node_modules/next/dist/docs/` las guías de `"use cache"`, `cacheTag`, `updateTag` y Server Actions. La UI se diseña con `/frontend-design`.

1. Escribir `supabase/migrations/20261030000000_leaderboard.sql` y aplicarla con el MCP de Supabase. Regenerar `lib/supabase/database.types.ts`. Verificación: `npx tsc --noEmit` pasa y `list_tables` muestra `games` y `scores` con RLS activo.
2. Crear `lib/supabase/public.ts` con `createPublicClient()`. Verificación: `npx tsc --noEmit` pasa.
3. Crear `lib/leaderboard.ts` con `getTopScores` cacheada. Verificación: `npx tsc --noEmit` pasa.
4. Crear `app/games/[id]/jugar/actions.ts` con `submitScore`. Conectar `GameOverModal` (prop `ranked`, estados de envío/éxito/error) y pasar `ranked` desde `AsteroidsPlayer` y `GamePlayer`. Verificación: al guardar en ROCAS aparece la fila en `scores`.
5. `/games/[id]`: `Leaderboard` y "Mejor global" reales para juegos con `engine`, `RANKING PRÓXIMAMENTE` para el resto, y estado vacío en `Leaderboard`. Verificación: `/games/rocas` muestra la puntuación guardada en el paso 4.
6. `/salon`: la página obtiene los tops y `HallOfFame` pasa a recibirlos por props, con pestaña GLOBAL, columna JUEGO, podio parcial, estado vacío y "TU MEJOR MARCA" desde Supabase. Verificación: `/salon` muestra la marca en GLOBAL y en ROCAS.
7. Eliminar `seededScores`/`PLAYERS`/`ScoreRow` de `lib/games.ts` y `saveScore`/`getBestScore`/`ScoreEntry`/`SCORES_KEY` de `lib/storage.ts`. Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
8. Pasada de diseño con `/frontend-design` a 1280 px y 390 px. Después, `npm run build` con `.env.local` y sin él.

## Criterios de aceptación

- [ ] Existen `supabase/migrations/20261030000000_leaderboard.sql`, `lib/supabase/public.ts`, `lib/leaderboard.ts` y `app/games/[id]/jugar/actions.ts`.
- [ ] En Supabase existen `public.games` (con exactamente la fila `rocas`) y `public.scores`, ambas con RLS activado.
- [ ] Con la publishable key, un `update` o `delete` sobre `scores` no afecta a ninguna fila, y un `insert` con `player_name` de 11 caracteres o `score` negativo es rechazado.
- [ ] `lib/supabase/database.types.ts` incluye `games` y `scores`.
- [ ] `seededScores`, `ScoreRow`, `saveScore`, `getBestScore` y la clave `av_scores` ya no aparecen en el código de la app.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores, también sin `.env.local`.
- [ ] Al terminar una partida de ROCAS y pulsar GUARDAR PUNTUACIÓN, se ve `GUARDANDO…` y luego `▸ PUNTUACIÓN GUARDADA_`, y aparece una fila nueva en `scores` con `game_id = 'rocas'`.
- [ ] Tras guardar, sin reiniciar el servidor, `/games/rocas` y `/salon` muestran la nueva puntuación al navegar a ellas.
- [ ] Si Supabase falla al insertar, el modal muestra `▸ NO SE PUDO GUARDAR · REINTENTAR` y mantiene el nombre escrito.
- [ ] En `/games/caida/jugar`, el modal de fin de partida muestra `ESTE JUEGO AÚN NO TIENE RANKING` y no tiene input.
- [ ] `/games/rocas` muestra como máximo 10 filas, ordenadas por puntuación descendente, y "Mejor global" igual a la primera fila (o `—` sin puntuaciones).
- [ ] `/games/caida` muestra `RANKING PRÓXIMAMENTE` y su "Mejor global" sigue siendo `184.220`.
- [ ] `/salon` abre en la pestaña GLOBAL, tiene solo las pestañas `GLOBAL` y `ROCAS`, y GLOBAL muestra la columna JUEGO.
- [ ] Con la tabla `scores` vacía, `/salon` y `/games/rocas` muestran el estado vacío sin errores y el podio no rompe.
- [ ] Con usuario simulado `PX_TEST` y una marca guardada con ese nombre, `/salon` muestra "TU MEJOR MARCA" con su puntuación y rango; con un usuario sin marcas, la fila no aparece.
- [ ] No hay errores ni avisos de hidratación en la consola en `/salon`, `/games/rocas` y `/games/rocas/jugar`.
- [ ] La sesión simulada (`av_user`, login y logout) funciona igual que antes.

## Decisiones

- **Sí:** tabla `games` solo con ROCAS. Es el único juego real; las puntuaciones de simulaciones serían ruido.
- **No:** meter los 8 juegos en `games`. Los simulados generarían puntuaciones falsas en un ranking real.
- **Sí:** el catálogo sigue en `lib/games.ts`. `generateStaticParams` y las páginas estáticas no cambian, y la tabla solo da integridad (FK) a `scores`.
- **No:** leer `GAMES` desde Supabase. Más cambio, dependencia de red en el build y sin beneficio hoy.
- **Sí:** Server Action con validación + RLS de insert anónimo. No hay Auth todavía, y la acción valida juego, nombre y rango antes de tocar la base.
- **No:** insert directo desde el navegador. Salta la validación del servidor.
- **No:** esperar a Auth para escribir. El leaderboard quedaría vacío y sin uso.
- **Sí:** asumir que se puede hacer trampa (llamar a la acción con cualquier score). Los checks acotan el daño; anti-trampas va en otra spec.
- **Sí:** cliente público sin cookies (`lib/supabase/public.ts`). `"use cache"` no permite `cookies()` y las lecturas son públicas.
- **Sí:** `"use cache"` + `cacheTag("scores")` + `updateTag` al insertar. Las páginas siguen rápidas y el ranking se refresca al guardar.
- **No:** lectura dinámica en `<Suspense>` en cada request. Más carga en Supabase sin necesidad.
- **Sí:** todas las partidas cuentan, top 10, empate gana la más antigua. Estilo arcade clásico y consulta simple con índice.
- **No:** mejor marca por jugador. Requiere `DISTINCT ON` o vista, y se puede añadir después.
- **Sí:** pestaña GLOBAL en `/salon` más una por juego con ranking. Reutiliza la página y los estilos existentes.
- **No:** ruta nueva `/leaderboard`. Duplicaría el Salón de la Fama.
- **Sí:** empezar vacío y eliminar los mocks. Mezclar jugadores falsos con reales confunde.
- **No:** sembrar `PLAYERS` en la base ni migrar `av_scores`. Datos falsos o locales de un solo navegador.
- **Sí:** "TU MEJOR MARCA" consultando por `player_name` desde el cliente. El nombre vive en `localStorage`, así que solo se conoce tras hidratar.
- **Sí:** "Mejor global" real solo para juegos con ranking; los simulados mantienen `game.best`. Es el único mock extra que el usuario incluyó.
- **No:** `plays` real, `best` de las tarjetas ni la Home en esta spec.
- **Sí:** migración versionada en `supabase/migrations/` y aplicada con el MCP. Deja el esquema en el repo sin introducir Supabase CLI.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Puntuaciones falsas enviadas directamente a la Server Action o a la API REST | Checks en tabla y en la acción (rango 0..10.000.000, nombre 1–10). Sin `update`/`delete`. Anti-trampas en otra spec. |
| `"use cache"` con `cookies()` rompe el build | Las lecturas usan `createPublicClient()`, que no lee cookies. |
| Sin variables de entorno el build o el prerender fallan | `createPublicClient()` devuelve `null` y las lecturas devuelven `[]`. Criterio de build sin `.env.local`. |
| El ranking no se actualiza tras guardar | `submitScore` llama a `updateTag("scores")`. Hay un criterio que lo comprueba. |
| Error de hidratación por "TU MEJOR MARCA" | Se consulta solo en el cliente cuando `useUser()` devuelve usuario, como hoy. |
| Un juego con `engine` sin fila en `games` hace fallar el insert por FK | Convención documentada: portar un juego incluye su fila en `games`. La acción devuelve error y el modal lo muestra. |
| El MCP de Supabase no conecta al implementar | Aplicar el SQL versionado desde el SQL Editor del dashboard y regenerar tipos al reconectar. |

## Lo que **no** está en esta spec

- Supabase Auth y puntuaciones ligadas a usuarios.
- Filas en `games` para los juegos simulados y catálogo leído desde Supabase.
- `plays` real, `best` de las tarjetas y la actividad de la Home.
- Migración de `av_scores`, anti-trampas, paginación, filtros por fecha y Realtime.
- Supabase CLI y tests automatizados.

Cada uno de esos, si llega, va en su propia spec.
