/**
 * colorUtils.ts
 * 선택된 공간의 포인트 컬러를 전체 UI CSS 변수로 적용
 */

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.floor(r * (1 - amount))}, ${Math.floor(g * (1 - amount))}, ${Math.floor(b * (1 - amount))})`;
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * amount))}, ${Math.min(255, Math.round(g + (255 - g) * amount))}, ${Math.min(255, Math.round(b + (255 - b) * amount))})`;
}

export function applyAccentColor(hex: string) {
  if (typeof document === 'undefined') return;
  const [r, g, b] = hexToRgb(hex);
  const root = document.documentElement;

  root.style.setProperty('--accent',        hex);
  root.style.setProperty('--accent-dark',   darken(hex, 0.15));
  root.style.setProperty('--accent-mid',    lighten(hex, 0.1));
  root.style.setProperty('--accent-light',  `rgba(${r}, ${g}, ${b}, 0.12)`);
  root.style.setProperty('--accent-lighter',`rgba(${r}, ${g}, ${b}, 0.06)`);
  root.style.setProperty('--accent-border', `rgba(${r}, ${g}, ${b}, 0.28)`);
  root.style.setProperty('--accent-300',    `rgba(${r}, ${g}, ${b}, 0.40)`);
  root.style.setProperty('--accent-rgb',    `${r}, ${g}, ${b}`);
}
