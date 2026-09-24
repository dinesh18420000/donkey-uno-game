import type { CSSProperties } from 'react';

/**
 * Returns exact absolute CSS position for opponent at index `idx` among `total` opponents.
 * Distributes opponents separately around the table perimeter:
 * Left, Top-Left, Top-Center, Top-Right, Right (matches casino / poker / rummy tables).
 */
export function getOpponentSeatStyle(idx: number, total: number): CSSProperties {
  if (total <= 0) return {};

  if (total === 1) {
    return { top: '2%', left: '50%', transform: 'translate(-50%, 0)' };
  }

  if (total === 2) {
    if (idx === 0) return { top: '32%', left: '2%', transform: 'translate(0, -50%)' };
    return { top: '32%', right: '2%', transform: 'translate(0, -50%)' };
  }

  if (total === 3) {
    if (idx === 0) return { top: '40%', left: '2%', transform: 'translate(0, -50%)' };
    if (idx === 1) return { top: '2%', left: '50%', transform: 'translate(-50%, 0)' };
    return { top: '40%', right: '2%', transform: 'translate(0, -50%)' };
  }

  if (total === 4) {
    if (idx === 0) return { top: '42%', left: '2%', transform: 'translate(0, -50%)' };
    if (idx === 1) return { top: '2%', left: '30%', transform: 'translate(-50%, 0)' };
    if (idx === 2) return { top: '2%', left: '70%', transform: 'translate(-50%, 0)' };
    return { top: '42%', right: '2%', transform: 'translate(0, -50%)' };
  }

  if (total === 5) {
    // 5 opponents matches the user's reference image exactly!
    // Left, Top-Left, Top-Center, Top-Right, Right
    if (idx === 0) return { top: '42%', left: '1.5%', transform: 'translate(0, -50%)' };
    if (idx === 1) return { top: '2%', left: '26%', transform: 'translate(-50%, 0)' };
    if (idx === 2) return { top: '2%', left: '50%', transform: 'translate(-50%, 0)' };
    if (idx === 3) return { top: '2%', left: '74%', transform: 'translate(-50%, 0)' };
    return { top: '42%', right: '1.5%', transform: 'translate(0, -50%)' };
  }

  if (total === 6) {
    if (idx === 0) return { top: '55%', left: '1.5%', transform: 'translate(0, -50%)' };
    if (idx === 1) return { top: '15%', left: '5%', transform: 'translate(0, -50%)' };
    if (idx === 2) return { top: '2%', left: '36%', transform: 'translate(-50%, 0)' };
    if (idx === 3) return { top: '2%', left: '64%', transform: 'translate(-50%, 0)' };
    if (idx === 4) return { top: '15%', right: '5%', transform: 'translate(0, -50%)' };
    return { top: '55%', right: '1.5%', transform: 'translate(0, -50%)' };
  }

  // total >= 7: distribute along upper perimeter arc
  const startAngle = 175;
  const endAngle = 5;
  const angleDeg = startAngle - (idx / (total - 1)) * (startAngle - endAngle);
  const angleRad = (angleDeg * Math.PI) / 180;
  const x = 50 - 46 * Math.cos(angleRad);
  const y = 46 - 42 * Math.sin(angleRad);
  return {
    top: `${Math.max(1, Math.min(85, y))}%`,
    left: `${Math.max(1, Math.min(96, x))}%`,
    transform: 'translate(-50%, -50%)'
  };
}
