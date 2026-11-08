# Memoria de skin-designer

## Estado por juego

Última auditoría: 2026-11-07 (implementados ROCAS, RUPTURA y SERPIENTE; falta BLOCKFALL).

| Juego     | Motor       | Clásico | Neón               | Retro | Motor | Selector |
| --------- | ----------- | ------- | ------------------ | ----- | ----- | -------- |
| ROCAS     | `asteroids` | ✅      | ✅                 | ✅    | ✅    | ✅       |
| BLOCKFALL | `blockfall` | ❌      | ⚠️ (`COLORS` fijo) | ❌    | ❌    | ❌       |
| RUPTURA   | `breakout`  | ✅      | ✅                 | ✅    | ✅    | ✅       |
| SERPIENTE | `snake`     | ✅      | ✅                 | ✅    | ✅    | ✅       |

Infraestructura compartida creada el 2026-11-07: `games/shared/skins.ts` (incluye `isSkinId`), `useSkin`/`saveSkin` en `lib/storage.ts`, `components/skin-picker.tsx` (props `value`/`onChange`/`className`) y clases `.skin-picker`, `.skin-opt`, `.skin-swatch`, `.on-screen` en `globals.css`.

## Decisiones de diseño por juego

- ROCAS / CLÁSICO: cabina vectorial de 1979. Fondo `#0c0d10`, nave y balas `#ffffff`, rocas `#b9bcc4`, power-up y llama ámbar `#ffb347`/`#ff6a3d` (el único color, para que el power-up se lea al instante). Líneas de 2 px, sin glow.
- ROCAS / RETRO: monitor de fósforo verde P1 a 400×300 (`resolution: 0.5` + `image-rendering: pixelated`). Fondo `#021006`, nave `#9dffad`, rocas `#36c95a`, balas `#e6ffe9`, power-up `#d4ff8a`. Balas y partículas cuadradas en rejilla de 2 px, power-up como cuadrado sin rotar con pulso en dos pasos.
- RUPTURA / CLÁSICO: ladrillos opacos con bisel (claro arriba, oscuro abajo) en colores apagados sobre `#0e0f13`, pala plateada `#d6d9e0` con extremos rojos `#d9453b` y bola blanca, sin glow.
- RUPTURA / RETRO: paleta tipo consola de 8 bits sobre negro a 400×300 (`resolution: 0.5`), ladrillos de un color con ranura de 1 px, pala `#c84848`, bola cuadrada `#ececec`, rejilla de 2 px, explosiones como marco hueco en 3 saltos.
- SERPIENTE / CLÁSICO: tablero carbón ajedrezado `#15171b`/`#1b1e23`, serpiente azul plana `#7aa7ff`/`#4a7ae0`, ojos blancos con pupila, sprites de fruta. Azul para separarlo del verde de NEÓN.
- SERPIENTE / RETRO: LCD de portátil de 4 tonos a 400×300 (`#9bbc0f` fondo, `#8fb00e` ajedrezado, `#306230` cuerpo, `#0f380f` cabeza), bloques cuadrados, manzana 8×8 en pixel art en vez del sprite. LCD y no fósforo para no repetir el RETRO de ROCAS.

## Preferencias del usuario

- Skins obligatorios: CLÁSICO (por defecto), NEÓN y RETRO.
- El skin se elige en cada juego y se recuerda por juego.
- El agente implementa código directamente, no solo specs.

## Notas

- La paleta neón original de BLOCKFALL vive en `games/blockfall/pieces.ts` (las de asteroids, breakout y snake ya están en su `games/<engine>/skins.ts`).
- Posición del `SkinPicker` de inicio según el juego: RUPTURA usa `on-screen bottom-[12%]` (la pala y la bola se ven en `ready`); SERPIENTE lo sube arriba con `top-[clamp(8px,2.4vw,18px)] bottom-auto` (la leyenda ocupa la mitad inferior). Las utilidades de Tailwind ganan a `@layer components`.
- La muestra RETRO de `.skin-swatch` en `globals.css` es `#5dff7a` (fósforo de ROCAS) y no coincide con los RETRO de otros juegos; pendiente pasarla por variable CSS desde el player si se quiere por juego.
- Prettier pasa archivos CRLF a LF y git los marca como modificados sin diff real: si no los editaste, restáuralos con `git checkout --`.
- En RETRO a media resolución, todo lo dibujado debe caer en múltiplos de 2 px lógicos.
- El overlay de inicio es un `<button>`: el `SkinPicker` va como hermano con `className="on-screen"` (posición absoluta, z-6), nunca dentro (botón dentro de botón rompe la hidratación).
- Patrón del player: un `useLayoutEffect([skin])` declarado ANTES del que crea el motor actualiza `skinRef` y llama a `setSkin`; el motor se crea con `skinRef.current`. Así el skin no entra en las dependencias del motor.
- Las partículas guardan una clave de paleta (`tone`), no un color, para recolorearse al cambiar de skin en caliente.
- RETRO de baja resolución: `setSkin` llama a `fitToDevicePixels` (cambia `canvas.width`), que restaura `imageSmoothingEnabled` y redibuja aunque el bucle esté parado en pausa.
- El hook de formato no corre en ediciones hechas con Bash: pasar `npx prettier --write` a mano.
