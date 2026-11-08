# Memoria de skin-designer

## Estado por juego

Auditoría inicial (2026-11-07, al crear el agente): ningún juego tiene sistema de skins. Cada motor usa una sola paleta neón fija (`COLORS`).

| Juego     | Motor       | Clásico | Neón               | Retro | Motor | Selector |
| --------- | ----------- | ------- | ------------------ | ----- | ----- | -------- |
| ROCAS     | `asteroids` | ❌      | ⚠️ (`COLORS` fijo) | ❌    | ❌    | ❌       |
| BLOCKFALL | `blockfall` | ❌      | ⚠️ (`COLORS` fijo) | ❌    | ❌    | ❌       |
| RUPTURA   | `breakout`  | ❌      | ⚠️ (`COLORS` fijo) | ❌    | ❌    | ❌       |
| SERPIENTE | `snake`     | ❌      | ⚠️ (`COLORS` fijo) | ❌    | ❌    | ❌       |

## Decisiones de diseño por juego

(vacío)

## Preferencias del usuario

- Skins obligatorios: CLÁSICO (por defecto), NEÓN y RETRO.
- El skin se elige en cada juego y se recuerda por juego.
- El agente implementa código directamente, no solo specs.

## Notas

- La paleta neón vive en `games/asteroids/entities.ts`, `games/blockfall/pieces.ts`, `games/breakout/entities.ts` y `games/snake/entities.ts`.
