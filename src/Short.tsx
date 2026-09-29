// 세로 쇼츠 틀 1종 (1080x1920, 30fps)
// 표지(0~2프레임) → 위쪽 얇은 제목 띠로 날아감 → 장면들(전환: 밀기·확대·떨어지기·돌기) → 아래 자막 띠
// 목소리는 public/voice/NN.wav, 타이밍은 public/voice/timing.json (tools/make_voice.py 가 만든다)
import React from 'react';
import {AbsoluteFill, Easing, Html5Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import config from '../config.json';
import {CLIP, FONT, LOOK} from './look';
import {ease, sp} from './motion';
import {SceneView} from './scenes';
import {Timing, buildTimeline} from './timeline';

const OV = 10; // 장면이 겹치는 프레임(전환)
const FIRST_SUB = 3; // 첫 자막이 뜨는 프레임
const ENTERS = ['push', 'zoom', 'drop', 'spin'] as const;
type Enter = (typeof ENTERS)[number] | 'none';

// ---------------- 장면 껍데기: 바탕색 + 들어오고 나가는 움직임 ----------------
const Shell: React.FC<{dur: number; bg: string; enter: Enter; exit: Enter | null; children: React.ReactNode}> = ({dur, bg, enter, exit, children}) => {
  const f = useCurrentFrame();
  const e = enter === 'none' ? 1 : sp(f, 0, 16, 280, 0.6);
  const eo = enter === 'none' ? 1 : ease(f, 0, 3);
  let tIn = '';
  if (enter === 'push') tIn = `translateX(${(1 - e) * 1080}px)`;
  if (enter === 'zoom') tIn = `scale(${1.5 - 0.5 * e})`;
  if (enter === 'drop') tIn = `translateY(${(1 - e) * -1920}px)`;
  if (enter === 'spin') tIn = `rotate(${(1 - e) * -25}deg) scale(${0.5 + 0.5 * e})`;
  const x = exit ? ease(f, dur, dur + OV) : 0;
  let tOut = '';
  if (exit === 'push') tOut = `translateX(${-x * 700}px)`;
  if (exit === 'zoom') tOut = `scale(${1 - 0.25 * x})`;
  if (exit === 'drop') tOut = `translateY(${x * 500}px)`;
  if (exit === 'spin') tOut = `scale(${1 - 0.3 * x})`;
  const drift = 1 + 0.025 * (f / Math.max(1, dur)); // 가만히 있지 않게 아주 천천히 다가감
  const move = {opacity: eo, transform: `${tIn} ${tOut}`, transformOrigin: '50% 45%'};
  return (
    <>
      <AbsoluteFill style={{background: bg, overflow: 'hidden', ...move}}>
        <Glow />
      </AbsoluteFill>
      {/* 장면 내용은 제목 띠와 자막 띠 사이로 잘라 낸다 — 날아오는 중에도 자막 위를 지나가지 않는다 */}
      <AbsoluteFill style={{clipPath: `inset(${CLIP.top}px 0 ${1920 - CLIP.bottom}px 0)`}}>
        <AbsoluteFill style={move}>
          <AbsoluteFill style={{fontFamily: FONT, color: LOOK.text, transform: `scale(${drift})`, transformOrigin: '50% 40%'}}>{children}</AbsoluteFill>
        </AbsoluteFill>
      </AbsoluteFill>
    </>
  );
};

const Glow: React.FC = () => {
  const f = useCurrentFrame();
  const x = 540 + Math.sin(f / 40) * 220;
  const y = 820 + Math.cos(f / 55) * 260;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 600,
        top: y - 600,
        width: 1200,
        height: 1200,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${LOOK.accent}26 0%, rgba(0,0,0,0) 65%)`,
      }}
    />
  );
};

// ---------------- 표지 → 위쪽 얇은 띠 ----------------
const CoverAndBand: React.FC<{cover: Timing['cover']; band: string}> = ({cover, band}) => {
  const f = useCurrentFrame();
  const m = interpolate(f, [2, 13], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  const bandIn = sp(f, 9, 13);
  // 가장 긴 줄이 화면 폭(약 880px)에 들어가게 글자 크기를 줄인다
  const longest = Math.max(...cover.lines.map((l) => l.length), 1);
  const size = Math.min(170, Math.floor(880 / (longest * 0.98)));
  return (
    <>
      {m < 1 ? <AbsoluteFill style={{background: LOOK.sceneColors[0], opacity: 1 - m}} /> : null}
      {m < 1 ? (
        <div style={{position: 'absolute', left: 72, top: 420 - 700 * m, transformOrigin: '0 0', transform: `scale(${1 - 0.6 * m}) rotate(${-6 * m}deg)`, opacity: 1 - m, fontFamily: FONT}}>
          {cover.chip ? (
            <span style={{display: 'inline-block', background: LOOK.chip, color: '#fff', fontWeight: 800, fontSize: 64, lineHeight: 1.2, padding: '10px 28px', borderRadius: 14}}>{cover.chip}</span>
          ) : null}
          <div style={{marginTop: 30, fontSize: size, fontWeight: 900, letterSpacing: -5, lineHeight: 1.08, whiteSpace: 'nowrap'}}>
            {cover.lines.map((l, i) => (
              <div key={i} style={{color: i === cover.lines.length - 1 ? LOOK.accent : LOOK.text}}>
                {l}
              </div>
            ))}
          </div>
          {cover.sub ? <div style={{marginTop: 36, fontSize: 72, fontWeight: 700, letterSpacing: -2, color: LOOK.subText}}>{cover.sub}</div> : null}
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 228,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontFamily: FONT,
          transform: `translateY(${(1 - bandIn) * -140}px)`,
          opacity: Math.min(1, bandIn * 2),
          color: LOOK.text,
          whiteSpace: 'nowrap',
        }}
      >
        {cover.chip ? <span style={{background: LOOK.chip, color: '#fff', fontWeight: 800, fontSize: 30, padding: '4px 14px', borderRadius: 8}}>{cover.chip}</span> : null}
        <span style={{fontSize: 38, fontWeight: 800, letterSpacing: -1}}>{band}</span>
      </div>
    </>
  );
};

// ---------------- 자막 띠 ----------------
/** 숫자와 '작은따옴표 안 말'을 강조색으로 */
const hl = (s: string) =>
  s.split(/('[^']+'|[0-9][0-9,.]*[가-힣%]?)/g).map((p, i) =>
    /^('[^']+'|[0-9][0-9,.]*[가-힣%]?)$/.test(p) ? (
      <span key={i} style={{color: LOOK.accent}}>
        {p}
      </span>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    ),
  );

const Sub: React.FC<{text: string}> = ({text}) => {
  const f = useCurrentFrame();
  const p = sp(f, 0, 10, 260, 0.5);
  return (
    <div style={{position: 'absolute', left: 60, width: 900, top: 1392, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT}}>
      <div
        style={{
          background: 'rgba(12,14,16,.9)',
          color: '#fff',
          fontSize: 64,
          fontWeight: 900,
          letterSpacing: -1.5,
          lineHeight: 1.2,
          padding: '12px 30px 16px',
          borderRadius: 18,
          whiteSpace: 'nowrap',
          transform: `scale(${0.6 + 0.4 * p})`,
          opacity: Math.min(1, p * 3),
          boxShadow: '0 8px 24px rgba(0,0,0,.35)',
        }}
      >
        {hl(text)}
      </div>
    </div>
  );
};

/** 자막 한 줄(caption)을 줄바꿈(\n) 단위 조각으로 나누고, 글자 수 비율로 시간을 나눈다 */
const chunk = (caption: string, frames: number): [number, string][] => {
  const parts = caption.split('\n').map((s) => s.trim()).filter(Boolean);
  const total = parts.reduce((a, s) => a + s.replace(/\s/g, '').length, 0) || 1;
  let acc = 0;
  return parts.map((s) => {
    const at = Math.round((acc / total) * frames);
    acc += s.replace(/\s/g, '').length;
    return [at, s];
  });
};

// ---------------- 쇼츠 ----------------
export const Short: React.FC<{timing: Timing | null}> = ({timing}) => {
  const {fps, durationInFrames} = useVideoConfig();
  if (!timing) return <AbsoluteFill style={{background: '#000'}} />;
  const tl = buildTimeline(timing.lines, timing.durations, fps);
  const colors = LOOK.sceneColors;

  const subs: {from: number; to: number; text: string}[] = [];
  timing.lines.forEach((l, i) => {
    const line = tl.lines[i];
    const next = i + 1 < timing.lines.length ? tl.lines[i + 1].start : durationInFrames;
    const cs = chunk(l.caption, line.end - line.start);
    cs.forEach(([at, text], j) => {
      const from = i === 0 && j === 0 ? FIRST_SUB : line.start + at;
      const to = j + 1 < cs.length ? line.start + cs[j + 1][0] : next;
      subs.push({from, to, text});
    });
  });
  const v = timing.version ?? 0;

  return (
    <AbsoluteFill style={{background: colors[0]}}>
      {tl.scenes.map((s, k) => {
        const spec = timing.scenes[s.name];
        if (!spec) throw new Error(`script.json 의 scenes 에 "${s.name}" 장면이 없습니다`);
        const last = k === tl.scenes.length - 1;
        const enter: Enter = k === 0 ? 'none' : ENTERS[(k - 1) % ENTERS.length];
        const exit: Enter | null = last ? null : ENTERS[k % ENTERS.length];
        return (
          <Sequence key={k} from={s.from} durationInFrames={s.duration + (last ? 0 : OV)} name={`장면 ${s.name}`}>
            <Shell dur={s.duration} bg={colors[k % colors.length]} enter={enter} exit={exit}>
              <SceneView spec={spec} t={s} />
            </Shell>
          </Sequence>
        );
      })}
      <CoverAndBand cover={timing.cover} band={timing.topic ?? ''} />
      {config.watermark ? (
        <div style={{position: 'absolute', right: 130, top: 1560, fontFamily: FONT, fontSize: 30, color: LOOK.subText, opacity: 0.7}}>{config.watermark}</div>
      ) : null}
      {subs.map((s, i) => (
        <Sequence key={`s${i}`} from={s.from} durationInFrames={Math.max(1, s.to - s.from)} name={`자막 ${s.text}`}>
          <Sub text={s.text} />
        </Sequence>
      ))}
      {tl.lines.map((l, i) => (
        <Sequence key={`v${i}`} from={l.start} durationInFrames={l.end - l.start + 2} name={`목소리 ${i + 1}`}>
          <Html5Audio src={`${staticFile(`voice/${String(i + 1).padStart(2, '0')}.wav`)}?v=${v}`} />
        </Sequence>
      ))}
      {config.music.file ? (
        <Html5Audio
          src={staticFile(`music/${config.music.file}`)}
          volume={(f) => {
            // 목소리가 나오는 동안은 조금 낮추고, 끝에서 서서히 줄인다
            const talking = tl.lines.some((l) => f >= l.start - 3 && f <= l.end + 2);
            return config.music.volume * (talking ? 0.7 : 1.3) * Math.min(1, f / 6) *
              interpolate(f, [durationInFrames - 45, durationInFrames - 2], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

export const totalFrames = (timing: Timing, fps: number) => buildTimeline(timing.lines, timing.durations, fps).total;
