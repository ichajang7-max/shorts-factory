// 움직임 도구: 날아오기·튀어나오기·숫자 세기·흔들기
import React from 'react';
import {Easing, interpolate, spring, useCurrentFrame} from 'remotion';

export const sp = (f: number, at: number, damping = 11, stiffness = 170, mass = 0.7) =>
  f < at ? 0 : spring({frame: f - at, fps: 30, config: {damping, stiffness, mass}});

export const ease = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});

type Dir = 'left' | 'right' | 'top' | 'bottom';
const DIRV: Record<Dir, [number, number]> = {left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1]};

/** 화면 밖에서 날아 들어와 스프링으로 자리 잡기 */
export const Fly: React.FC<{at: number; from?: Dir; dist?: number; rot?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({
  at,
  from = 'bottom',
  dist = 900,
  rot = 0,
  style,
  children,
}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const p = sp(f, at);
  const [dx, dy] = DIRV[from];
  return (
    <div style={{transform: `translate(${dx * dist * (1 - p)}px, ${dy * dist * (1 - p)}px) rotate(${rot * (1 - p)}deg)`, opacity: Math.min(1, p * 3), ...style}}>
      {children}
    </div>
  );
};

/** 작게 → 크게 → 살짝 되돌아오기 */
export const Pop: React.FC<{at: number; rot?: number; from?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({at, rot = 0, from = 0.2, style, children}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const p = sp(f, at, 8, 200, 0.6);
  return <div style={{transform: `scale(${from + (1 - from) * p}) rotate(${rot * (1 - p)}deg)`, opacity: Math.min(1, p * 4), ...style}}>{children}</div>;
};

/** 올라가며 세는 숫자 */
export const Count: React.FC<{from: number; to: number; at: number; dur: number}> = ({from, to, at, dur}) => {
  const f = useCurrentFrame();
  const v = Math.round(interpolate(f, [at, at + dur], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}));
  return <>{v.toLocaleString('en-US')}</>;
};

/** 몇 프레임 흔들기(강조 순간) */
export const Shake: React.FC<{at: number; amp?: number; children: React.ReactNode}> = ({at, amp = 14, children}) => {
  const f = useCurrentFrame();
  const k = f >= at && f < at + 12 ? (1 - (f - at) / 12) * amp : 0;
  return <div style={{transform: `translate(${Math.sin((f - at) * 2.3) * k}px, ${Math.cos((f - at) * 3.1) * k * 0.6}px)`}}>{children}</div>;
};
