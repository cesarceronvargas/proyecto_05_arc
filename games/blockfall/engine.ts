// Falling-block engine: all game state lives in this closure, React only gets callbacks.
import {
  BOARD_X,
  H,
  W,
  clearLines,
  collide,
  createBoard,
  drawBlock,
  drawBoard,
  drawGrid,
  drawNext,
  merge,
  type Board,
} from "./board";
import {
  BLOCK,
  LINE_SCORES,
  MAX_SCORE,
  randomPiece,
  rotateCW,
  type Piece,
} from "./pieces";

export type BlockfallCallbacks = {
  onScore: (score: number) => void;
  onLines: (lines: number) => void;
  onLevel: (level: number) => void;
  onPauseChange: (paused: boolean) => void; // also when pausing automatically (blur/visibility)
  onStart: () => void; // the run goes from "ready" to "playing"
  onGameOver: (score: number) => void; // a new piece collides on spawn; emit() runs first
};

export type BlockfallState = "ready" | "playing" | "paused" | "gameover";

export type BlockfallGame = {
  start: () => void; // ready -> playing; ignored in any other state
  pause: () => void;
  resume: () => void;
  end: () => void; // FIN button: goes to gameover without calling onGameOver
  restart: () => void; // new run straight into "playing"
  destroy: () => void; // cancels the rAF and removes every window/document listener
};

const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyX",
  "Space",
  "KeyP",
  "Escape",
]);
const NO_REPEAT_KEYS = new Set(["ArrowUp", "KeyX", "Space"]);
const KICKS = [0, -1, 1, -2, 2]; // columns tried, in this order, when rotating
const MAX_DT = 50; // ms
const GHOST_ALPHA = 0.2;

const dropIntervalFor = (level: number) =>
  Math.max(100, 1000 - (level - 1) * 90);

// Keys typed into form controls belong to them (e.g. the initials input of the game over modal).
function isFormControl(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "BUTTON", "SELECT"].includes(target.tagName))
  );
}

export function createBlockfallGame(
  canvas: HTMLCanvasElement,
  callbacks: BlockfallCallbacks,
): BlockfallGame {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context not available");
  const ctx: CanvasRenderingContext2D = context;

  // ── Game state ──────────────────────────────────────────────────────────────
  let board: Board = createBoard();
  let current: Piece | null = null;
  let next: Piece | null = null;
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropAccum = 0;
  let dropInterval = dropIntervalFor(1);
  let state: BlockfallState = "ready";

  // Last values sent to React, so callbacks only fire on change.
  const sent = { score: -1, lines: -1, level: -1 };

  function emit() {
    if (score !== sent.score) callbacks.onScore((sent.score = score));
    if (lines !== sent.lines) callbacks.onLines((sent.lines = lines));
    if (level !== sent.level) callbacks.onLevel((sent.level = level));
  }

  function addScore(points: number) {
    score = Math.min(MAX_SCORE, score + points);
  }

  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropAccum = 0;
    dropInterval = dropIntervalFor(1);
    next = randomPiece();
    spawn();
  }

  // ── Pieces ──────────────────────────────────────────────────────────────────
  function spawn() {
    const piece = next ?? randomPiece();
    next = randomPiece();
    if (collide(board, piece.shape, piece.x, piece.y)) {
      current = null;
      state = "gameover";
      stopLoop();
      emit();
      callbacks.onGameOver(score);
      draw();
      return;
    }
    current = piece;
  }

  function lockPiece(piece: Piece) {
    merge(board, piece);
    const cleared = clearLines(board);
    if (cleared) {
      lines += cleared;
      addScore(LINE_SCORES[cleared] * level); // the level before recalculating it
      level = Math.floor(lines / 10) + 1;
      dropInterval = dropIntervalFor(level);
    }
    spawn();
  }

  function move(piece: Piece, dx: number) {
    if (!collide(board, piece.shape, piece.x + dx, piece.y)) piece.x += dx;
  }

  function rotate(piece: Piece) {
    const rotated = rotateCW(piece.shape);
    for (const kick of KICKS) {
      if (!collide(board, rotated, piece.x + kick, piece.y)) {
        piece.shape = rotated;
        piece.x += kick;
        return;
      }
    }
  }

  function ghostY(piece: Piece) {
    let y = piece.y;
    while (!collide(board, piece.shape, piece.x, y + 1)) y++;
    return y;
  }

  function softDrop(piece: Piece) {
    if (!collide(board, piece.shape, piece.x, piece.y + 1)) {
      piece.y++;
      addScore(1);
    } else {
      lockPiece(piece);
    }
  }

  function hardDrop(piece: Piece) {
    const y = ghostY(piece);
    addScore((y - piece.y) * 2);
    piece.y = y;
    lockPiece(piece);
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state !== "playing" || !current) return;
    dropAccum += dt;
    if (dropAccum < dropInterval) return;
    dropAccum = 0; // only reset here, as in the original
    if (!collide(board, current.shape, current.x, current.y + 1)) current.y++;
    else lockPiece(current);
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawPiece(piece: Piece, y: number, alpha: number, glow: boolean) {
    piece.shape.forEach((row, r) =>
      row.forEach((cell, c) => {
        drawBlock(
          ctx,
          BOARD_X + (piece.x + c) * BLOCK,
          (y + r) * BLOCK,
          cell,
          alpha,
          glow,
        );
      }),
    );
  }

  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    drawGrid(ctx);
    drawBoard(ctx, board);
    drawNext(ctx, next);
    if (current) {
      drawPiece(current, ghostY(current), GHOST_ALPHA, false);
      drawPiece(current, current.y, 1, true);
    }
  }

  // Logical size stays 800×600; the backing store follows devicePixelRatio for crisp lines.
  function fitToDevicePixels() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  // ── Loop ────────────────────────────────────────────────────────────────────
  let raf = 0;
  let lastTime: number | null = null;

  function frame(ts: number) {
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
    lastTime = ts;
    update(dt);
    emit();
    draw();
    if (state === "playing") raf = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (raf) return;
    lastTime = null; // no dt jump after a pause
    raf = requestAnimationFrame(frame);
  }

  function stopLoop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  // ── Controls ────────────────────────────────────────────────────────────────
  function start() {
    if (state !== "ready") return;
    state = "playing";
    initGame();
    emit();
    callbacks.onStart();
    startLoop();
  }

  function pause() {
    if (state !== "playing") return;
    state = "paused";
    stopLoop();
    draw();
    callbacks.onPauseChange(true);
  }

  function resume() {
    if (state !== "paused") return;
    state = "playing";
    startLoop();
    callbacks.onPauseChange(false);
  }

  function end() {
    if (state === "ready" || state === "gameover") return;
    const wasPaused = state === "paused";
    state = "gameover";
    stopLoop();
    emit();
    if (wasPaused) callbacks.onPauseChange(false);
    draw();
  }

  function restart() {
    const wasPaused = state === "paused";
    state = "playing";
    initGame();
    emit();
    if (wasPaused) callbacks.onPauseChange(false);
    startLoop();
  }

  // ── Listeners ───────────────────────────────────────────────────────────────
  // Actions run on keydown and no pressed keys are stored, so no key can stay stuck.
  function onKeyDown(e: KeyboardEvent) {
    // Browser shortcuts (Ctrl+P, Alt+←…) are not game keys.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isFormControl(e.target) || state === "gameover") return;

    if (state === "ready") {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (!e.repeat) start();
      } else if (GAME_KEYS.has(e.code)) {
        e.preventDefault();
      }
      return;
    }

    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();

    if (e.code === "KeyP" || e.code === "Escape") {
      if (e.repeat) return;
      if (state === "paused") resume();
      else pause();
      return;
    }

    if (state !== "playing" || !current) return;
    if (e.repeat && NO_REPEAT_KEYS.has(e.code)) return;

    switch (e.code) {
      case "ArrowLeft":
        move(current, -1);
        break;
      case "ArrowRight":
        move(current, 1);
        break;
      case "ArrowDown":
        softDrop(current);
        break;
      case "ArrowUp":
      case "KeyX":
        rotate(current);
        break;
      case "Space":
        hardDrop(current);
        break;
    }
    emit();
  }

  function onBlur() {
    pause();
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") pause();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("blur", onBlur);
  window.addEventListener("resize", fitToDevicePixels);
  document.addEventListener("visibilitychange", onVisibilityChange);

  // Start screen: empty board and empty next panel. The loop only runs while playing.
  fitToDevicePixels();

  return {
    start,
    pause,
    resume,
    end,
    restart,
    destroy() {
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", fitToDevicePixels);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
}
