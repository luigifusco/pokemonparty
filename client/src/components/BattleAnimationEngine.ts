// Lightweight DOM-based move animation engine for the battle scene.
// Creates absolutely-positioned elements, animates via CSS transitions, then removes them.

import type { MoveAnimConfig } from '../data/moveAnimations';

interface Rect {
  x: number; // center x relative to arena
  y: number; // center y relative to arena
}

function getCenter(el: HTMLElement, arena: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  const a = arena.getBoundingClientRect();
  return {
    x: r.left + r.width / 2 - a.left,
    y: r.top + r.height / 2 - a.top,
  };
}

function createFxImg(arena: HTMLElement, sprite: string, x: number, y: number, size = 40): HTMLImageElement {
  const img = document.createElement('img');
  img.src = `/pokemonparty/fx/${sprite}`;
  img.style.cssText = `
    position: absolute;
    left: ${x - size / 2}px;
    top: ${y - size / 2}px;
    width: ${size}px;
    height: ${size}px;
    pointer-events: none;
    z-index: 10;
    opacity: 0;
    transition: all 0.3s ease-out;
  `;
  arena.appendChild(img);
  return img;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function animateProjectile(
  arena: HTMLElement, sprite: string, from: Rect, to: Rect, count: number, duration = 300
) {
  for (let i = 0; i < count; i++) {
    const img = createFxImg(arena, sprite, from.x, from.y);
    // Force reflow then animate
    void img.offsetWidth;
    img.style.opacity = '1';
    img.style.transition = `all ${duration}ms ease-in`;
    img.style.left = `${to.x - 20}px`;
    img.style.top = `${to.y - 20}px`;
    await sleep(duration * 0.6);
    img.style.opacity = '0';
    await sleep(duration * 0.5);
    img.remove();
  }
}

async function animateContact(
  attackerEl: HTMLElement, defenderEl: HTMLElement, arena: HTMLElement, sprite?: string
) {
  const defCenter = getCenter(defenderEl, arena);

  // Lunge attacker toward defender
  const atkRect = attackerEl.getBoundingClientRect();
  const defRect = defenderEl.getBoundingClientRect();
  const dx = (defRect.left - atkRect.left) * 0.3;
  const dy = (defRect.top - atkRect.top) * 0.3;

  attackerEl.style.transition = 'transform 0.15s ease-in';
  attackerEl.style.transform += ` translate(${dx}px, ${dy}px)`;
  await sleep(150);

  // Show impact sprite at defender
  if (sprite) {
    const img = createFxImg(arena, sprite, defCenter.x, defCenter.y, 48);
    void img.offsetWidth;
    img.style.opacity = '1';
    img.style.transform = 'scale(1.3)';
    await sleep(200);
    img.style.opacity = '0';
    await sleep(150);
    img.remove();
  }

  // Return attacker
  attackerEl.style.transition = 'transform 0.15s ease-out';
  // Reset to just the base transform (scaleX for left side)
  const baseTransform = attackerEl.dataset.baseTransform || '';
  attackerEl.style.transform = baseTransform;
  await sleep(150);
}

async function animateBeam(
  arena: HTMLElement, sprite: string, from: Rect, to: Rect, count: number
) {
  const steps = count;
  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / (steps + 1);
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    const img = createFxImg(arena, sprite, x, y, 36);
    void img.offsetWidth;
    img.style.opacity = '0.9';
    img.style.transform = 'scale(1.2)';
    await sleep(80);
  }
  await sleep(200);
  // Clean up beam elements
  arena.querySelectorAll('img[src^="/pokemonparty/fx/"]').forEach(el => {
    (el as HTMLElement).style.opacity = '0';
    setTimeout(() => el.remove(), 200);
  });
  await sleep(200);
}

async function animateAoe(
  arena: HTMLElement, defenderEl: HTMLElement, sprite: string, count: number
) {
  const center = getCenter(defenderEl, arena);
  const elements: HTMLImageElement[] = [];

  for (let i = 0; i < count; i++) {
    const offsetX = (Math.random() - 0.5) * 60;
    const offsetY = (Math.random() - 0.5) * 60;
    const img = createFxImg(arena, sprite, center.x + offsetX, center.y + offsetY, 44);
    elements.push(img);
    void img.offsetWidth;
    img.style.opacity = '0.9';
    img.style.transform = 'scale(1.2)';
    await sleep(100);
  }
  await sleep(300);
  for (const img of elements) {
    img.style.opacity = '0';
    img.style.transform = 'scale(0.5)';
  }
  await sleep(250);
  elements.forEach(img => img.remove());
}

function flashBackground(arena: HTMLElement, color: string, duration: number) {
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: absolute;
    inset: 0;
    background: ${color};
    opacity: 0;
    pointer-events: none;
    z-index: 5;
    transition: opacity ${Math.min(duration / 2, 150)}ms ease-in;
  `;
  arena.appendChild(flash);
  void flash.offsetWidth;
  flash.style.opacity = '0.3';
  setTimeout(() => {
    flash.style.transition = `opacity ${Math.min(duration / 2, 200)}ms ease-out`;
    flash.style.opacity = '0';
    setTimeout(() => flash.remove(), 250);
  }, duration / 2);
}

function shakeElement(el: HTMLElement, intensity: number, duration = 400) {
  const baseTransform = el.dataset.baseTransform || '';
  const steps = 6;
  const stepDuration = duration / steps;
  let i = 0;
  const interval = setInterval(() => {
    if (i >= steps) {
      el.style.transform = baseTransform;
      clearInterval(interval);
      return;
    }
    const dx = (Math.random() - 0.5) * intensity * 2;
    const dy = (Math.random() - 0.5) * intensity;
    el.style.transform = `${baseTransform} translate(${dx}px, ${dy}px)`;
    i++;
  }, stepDuration);
}

export async function runMoveAnimation(
  config: MoveAnimConfig,
  arena: HTMLElement,
  attackerEl: HTMLElement | null,
  defenderEl: HTMLElement | null,
): Promise<void> {
  if (!arena) return;

  const shakeAmount = config.shakeIntensity ?? 4;
  const count = config.count ?? 1;

  // Background flash
  if (config.bgFlash) {
    flashBackground(arena, config.bgFlash, config.bgFlashDuration ?? 300);
  }

  if (config.style === 'self') {
    // Weather / self-buff — just the flash is enough
    await sleep(config.bgFlashDuration ?? 300);
    return;
  }

  if (!attackerEl || !defenderEl) {
    await sleep(400);
    return;
  }

  const atkCenter = getCenter(attackerEl, arena);
  const defCenter = getCenter(defenderEl, arena);

  switch (config.style) {
    case 'projectile':
      if (config.sprite) {
        await animateProjectile(arena, config.sprite, atkCenter, defCenter, count);
      }
      shakeElement(defenderEl, shakeAmount);
      break;

    case 'contact':
      await animateContact(attackerEl, defenderEl, arena, config.sprite);
      shakeElement(defenderEl, shakeAmount);
      break;

    case 'beam':
      if (config.sprite) {
        await animateBeam(arena, config.sprite, atkCenter, defCenter, count);
      }
      shakeElement(defenderEl, shakeAmount);
      break;

    case 'aoe':
      if (config.sprite) {
        await animateAoe(arena, defenderEl, config.sprite, count);
      }
      shakeElement(defenderEl, shakeAmount, 500);
      break;

    default:
      shakeElement(defenderEl, shakeAmount);
      break;
  }

  await sleep(200);
}
