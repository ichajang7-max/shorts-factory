// 장면 4가지. script.json 의 "scenes" 에서 type 으로 고른다.
//   big   : 작은 윗글 + 아주 큰 글자 + 아랫글
//   list  : 제목 + 항목이 하나씩 날아 들어옴 (항목 수 = 그 장면 문장 수면 문장마다 하나씩)
//   count : 숫자가 올라가며 세어짐
//   cta   : 큰 글자 + 누르는 단추
// 새 장면을 만들고 싶으면 여기에 컴포넌트를 하나 더 만들고 SCENES 에 이름을 붙이세요.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Count, Fly, Pop, Shake, sp} from './motion';
import {LOOK, STAGE} from './look';
import {SceneSpec, SceneTiming} from './timeline';

type P<T> = {spec: T; t: SceneTiming};
const Center: React.FC<{children: React.ReactNode; gap?: number}> = ({children, gap = 40}) => (
  <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap, textAlign: 'center'}}>
    {children}
  </div>
);

const Big: React.FC<P<Extract<SceneSpec, {type: 'big'}>>> = ({spec}) => (
  <Center gap={60}>
    {spec.kicker ? (
      <Fly at={0} from="top" dist={400}>
        <div style={{fontSize: 70, fontWeight: 800, color: LOOK.subText}}>{spec.kicker}</div>
      </Fly>
    ) : null}
    <Pop at={2} rot={-8}>
      <div style={{fontSize: 300, fontWeight: 900, letterSpacing: -10, lineHeight: 1.15, color: LOOK.accent}}>{spec.big}</div>
    </Pop>
    {spec.sub ? (
      <Fly at={8} from="bottom" dist={500}>
        <div style={{fontSize: 76, fontWeight: 800, color: LOOK.text, background: 'rgba(255,255,255,.1)', borderRadius: 24, padding: '18px 40px'}}>{spec.sub}</div>
      </Fly>
    ) : null}
  </Center>
);

const List: React.FC<P<Extract<SceneSpec, {type: 'list'}>>> = ({spec, t}) => {
  const f = useCurrentFrame();
  const n = spec.items.length;
  const at = (i: number) => (n === t.starts.length ? t.starts[i] : Math.round(4 + (i * t.duration * 0.6) / n));
  return (
    <Center gap={36}>
      {spec.title ? (
        <Pop at={0}>
          <div style={{fontSize: 80, fontWeight: 900, color: LOOK.subText, marginBottom: 20}}>{spec.title}</div>
        </Pop>
      ) : null}
      {spec.items.map((it, i) => {
        const on = f >= at(i);
        const now = on && (i === n - 1 || f < at(i + 1));
        return (
          <div key={i} style={{width: 860, height: 190, visibility: on ? 'visible' : 'hidden'}}>
            <Fly at={at(i)} from={i % 2 ? 'right' : 'left'} dist={1000} rot={i % 2 ? 6 : -6}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 34,
                  height: 190,
                  padding: '0 40px',
                  borderRadius: 34,
                  background: now ? '#FFFFFF' : 'rgba(255,255,255,.12)',
                  color: now ? '#111' : LOOK.text,
                  transform: `scale(${now ? 1 + 0.04 * sp(f, at(i), 9) : 0.96})`,
                }}
              >
                <div style={{width: 110, height: 110, borderRadius: 55, background: LOOK.chip, color: '#fff', fontSize: 64, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                  {i + 1}
                </div>
                <div style={{fontSize: 66, fontWeight: 900, letterSpacing: -2, textAlign: 'left', whiteSpace: 'nowrap'}}>{it}</div>
              </div>
            </Fly>
          </div>
        );
      })}
    </Center>
  );
};

const CountScene: React.FC<P<Extract<SceneSpec, {type: 'count'}>>> = ({spec, t}) => {
  const dur = Math.min(30, Math.max(12, Math.round(t.duration * 0.4)));
  return (
    <Center>
      {spec.label ? (
        <Fly at={0} from="top" dist={400}>
          <div style={{fontSize: 70, fontWeight: 800, color: LOOK.subText}}>{spec.label}</div>
        </Fly>
      ) : null}
      <Shake at={4 + dur}>
        <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center', color: LOOK.accent, fontWeight: 900}}>
          <span style={{fontSize: 360, letterSpacing: -12, lineHeight: 1}}>
            <Count from={spec.from ?? 0} to={spec.to} at={4} dur={dur} />
          </span>
          {spec.unit ? <span style={{fontSize: 150, marginLeft: 10}}>{spec.unit}</span> : null}
        </div>
      </Shake>
      <Bar at={4} dur={dur} />
    </Center>
  );
};
const Bar: React.FC<{at: number; dur: number}> = ({at, dur}) => {
  const f = useCurrentFrame();
  const p = Math.max(0, Math.min(1, (f - at) / dur));
  return (
    <div style={{width: 760, height: 40, borderRadius: 20, background: 'rgba(255,255,255,.14)', overflow: 'hidden'}}>
      <div style={{width: `${p * 100}%`, height: '100%', background: LOOK.accent, borderRadius: 20}} />
    </div>
  );
};

const Cta: React.FC<P<Extract<SceneSpec, {type: 'cta'}>>> = ({spec, t}) => {
  const f = useCurrentFrame();
  const tap = Math.round(t.duration * 0.55);
  const press = f >= tap && f < tap + 10 ? 1 - 0.12 * Math.sin(((f - tap) / 10) * Math.PI) : 1;
  const done = f >= tap + 4;
  return (
    <Center gap={70}>
      <Pop at={0} rot={6}>
        <div style={{fontSize: 190, fontWeight: 900, letterSpacing: -6, lineHeight: 1.05, color: LOOK.text}}>{spec.big}</div>
      </Pop>
      {spec.button ? (
        <Fly at={8} from="bottom" dist={600}>
          <div
            style={{
              fontSize: 78,
              fontWeight: 900,
              padding: '30px 80px',
              borderRadius: 80,
              background: done ? LOOK.accent : '#FFFFFF',
              color: '#111',
              transform: `scale(${press})`,
              boxShadow: '0 16px 40px rgba(0,0,0,.4)',
            }}
          >
            {done ? '✓ ' : ''}
            {spec.button}
          </div>
        </Fly>
      ) : null}
    </Center>
  );
};

export const SceneView: React.FC<{spec: SceneSpec; t: SceneTiming}> = ({spec, t}) => {
  const body =
    spec.type === 'big' ? <Big spec={spec} t={t} /> : spec.type === 'list' ? <List spec={spec} t={t} /> : spec.type === 'count' ? <CountScene spec={spec} t={t} /> : <Cta spec={spec} t={t} />;
  return <div style={{position: 'absolute', ...STAGE}}>{body}</div>;
};
