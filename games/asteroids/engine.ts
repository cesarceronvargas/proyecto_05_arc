// Asteroids engine: all game state lives in this closure, React only gets callbacks.
import {
  Asteroid,
  Bullet,
  COLORS,
  H,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  Particle,
  PowerUp,
  Ship,
  W,
  dist,
  rand,
} from "./entities";

export type AsteroidsCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  // Seconds of 3x left, rounded to 0.1. Only called when the rounded value changes (0 = inactive).
  onTripleShot: (secondsLeft: number) => void;
  onPauseChange: (paused: boolean) => void; // also when pausing automatically (blur/visibility)
  onStart: () => void; // the run goes from "ready" to "playing"
  onGameOver: (score: number) => void; // last life lost
};

export type AsteroidsState =
  "ready" | "playing" | "dead" | "paused" | "gameover";

export type AsteroidsGame = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  end: () => void; // FIN button: goes to gameover without calling onGameOver
  restart: () => void; // new run straight into "playing"
  destroy: () => void;
};

const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "Space",
  "KeyP",
  "Escape",
]);

// Keys typed into form controls belong to them (e.g. the initials input of the game over modal).
function isFormControl(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "BUTTON", "SELECT"].includes(target.tagName))
  );
}

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsGame {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  // ── Input ───────────────────────────────────────────────────────────────────
  const keys: Record<string, boolean> = {};
  const justPressed: Record<string, boolean> = {};

  const pressed = (code: string) => {
    const val = justPressed[code];
    justPressed[code] = false;
    return !!val;
  };

  // ── Game state ──────────────────────────────────────────────────────────────
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let state: AsteroidsState = "ready";
  let pausedFrom: "playing" | "dead" = "playing";
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;

  // Last values sent to React, so callbacks only fire on change.
  const sent = { score: -1, lives: -1, level: -1, triple: -1 };

  function emit() {
    if (score !== sent.score) callbacks.onScore((sent.score = score));
    if (lives !== sent.lives) callbacks.onLives((sent.lives = lives));
    if (level !== sent.level) callbacks.onLevel((sent.level = level));
    const triple = Math.round(ship.tripleShot * 10) / 10;
    if (triple !== sent.triple) callbacks.onTripleShot((sent.triple = triple));
  }

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    spawnAsteroids(4);
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, color: string, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
  }

  function killShip() {
    explode(ship.x, ship.y, COLORS.ship, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
      ship.tripleShot = 0;
      emit();
      callbacks.onGameOver(score);
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function updateBackground(dt: number) {
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    particles = particles.filter((p) => !p.dead);
  }

  function update(dt: number) {
    if (state === "ready" || state === "gameover") {
      updateBackground(dt);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      updateBackground(dt);
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    if (state !== "playing") return;

    if (pressed("Space")) bullets.push(...ship.tryShoot());

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bullet vs asteroid
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, COLORS.asteroid, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Ship vs asteroid
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Level cleared
    if (state === "playing" && asteroids.length === 0) nextLevel();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function draw(c: CanvasRenderingContext2D) {
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(c));
    asteroids.forEach((a) => a.draw(c));
    powerUps.forEach((p) => p.draw(c));
    bullets.forEach((b) => b.draw(c));
    if (state !== "ready" && state !== "gameover") ship.draw(c);
  }

  // Logical size stays 800×600; the backing store follows devicePixelRatio for crisp lines.
  function fitToDevicePixels(c: CanvasRenderingContext2D) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(c);
  }

  // ── Loop ────────────────────────────────────────────────────────────────────
  let raf = 0;
  let lastTime: number | null = null;

  function frame(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    if (state === "playing" || state === "dead") emit();
    draw(ctx!);
    raf = requestAnimationFrame(frame);
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
  function clearKeys() {
    for (const k of Object.keys(keys)) keys[k] = false;
    for (const k of Object.keys(justPressed)) justPressed[k] = false;
  }

  function start() {
    if (state !== "ready") return;
    initGame();
    clearKeys();
    state = "playing";
    emit();
    callbacks.onStart();
  }

  function pause() {
    if (state !== "playing" && state !== "dead") return;
    pausedFrom = state;
    state = "paused";
    stopLoop();
    clearKeys();
    callbacks.onPauseChange(true);
  }

  function resume() {
    if (state !== "paused") return;
    state = pausedFrom;
    clearKeys();
    startLoop();
    callbacks.onPauseChange(false);
  }

  function end() {
    if (state === "ready" || state === "gameover") return;
    const wasPaused = state === "paused";
    if (!ship.dead) explode(ship.x, ship.y, COLORS.ship, 14);
    ship.dead = true;
    ship.tripleShot = 0;
    state = "gameover";
    clearKeys();
    emit();
    if (wasPaused) {
      startLoop();
      callbacks.onPauseChange(false);
    }
  }

  function restart() {
    initGame();
    clearKeys();
    if (state === "paused") callbacks.onPauseChange(false);
    state = "playing";
    emit();
    startLoop();
  }

  // ── Listeners ───────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    if (!GAME_KEYS.has(e.code) || isFormControl(e.target)) return;
    if (state === "gameover") return;
    e.preventDefault();

    if (e.code === "KeyP" || e.code === "Escape") {
      if (e.repeat) return;
      if (state === "paused") resume();
      else pause();
      return;
    }

    if (state === "ready") {
      if (e.code === "Space" && !e.repeat) start();
      return;
    }

    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
  }

  function onBlur() {
    clearKeys();
    pause();
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") onBlur();
  }

  function onResize() {
    fitToDevicePixels(ctx!);
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisibilityChange);

  // Attract mode: asteroids drift behind the "PULSA ESPACIO" overlay.
  spawnAsteroids(4);
  fitToDevicePixels(ctx);
  startLoop();

  return {
    start,
    pause,
    resume,
    end,
    restart,
    destroy() {
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
}
