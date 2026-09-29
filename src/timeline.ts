// 문장별 목소리 길이(초)로 문장·장면 타이밍을 만든다.

export type Line = {scene: string; caption: string; tts: string};
export type SceneSpec =
  | {type: 'big'; kicker?: string; big: string; sub?: string}
  | {type: 'list'; title?: string; items: string[]}
  | {type: 'count'; from?: number; to: number; unit?: string; label?: string}
  | {type: 'cta'; big: string; button?: string};
export type Timing = {
  title?: string;
  cover: {chip?: string; lines: string[]; sub?: string};
  topic?: string;
  scenes: Record<string, SceneSpec>;
  lines: Line[];
  durations: number[];
  version?: number;
};

export type LineTiming = {start: number; end: number};
export type SceneTiming = {
  name: string;
  index: number;
  from: number; // 절대 프레임
  duration: number;
  lines: number[]; // 이 장면에 속한 문장 번호(0부터)
  starts: number[]; // 장면 안 상대 프레임: 각 문장 시작
};

export const GAP = {
  lead: 2, // 첫 목소리 전
  inScene: 3, // 같은 장면 안 문장 사이
  scene: 5, // 장면 바뀔 때
  visualLead: 4, // 장면 그림이 목소리보다 먼저 나오는 프레임
  tail: 15, // 마지막 문장 뒤
};

export const buildTimeline = (lines: Line[], durations: number[], fps: number) => {
  const lt: LineTiming[] = [];
  let t = GAP.lead;
  lines.forEach((l, i) => {
    const start = t;
    const end = start + Math.ceil(durations[i] * fps);
    const last = i === lines.length - 1;
    const gap = last ? GAP.tail : lines[i + 1].scene !== l.scene ? GAP.scene : GAP.inScene;
    lt.push({start, end});
    t = end + gap;
  });
  const total = t;
  const scenes: SceneTiming[] = [];
  lines.forEach((l, i) => {
    const last = scenes[scenes.length - 1];
    if (!last || last.name !== l.scene) scenes.push({name: l.scene, index: scenes.length, from: 0, duration: 0, lines: [i], starts: []});
    else last.lines.push(i);
  });
  scenes.forEach((s, k) => {
    s.from = k === 0 ? 0 : Math.max(0, lt[s.lines[0]].start - GAP.visualLead);
  });
  scenes.forEach((s, k) => {
    s.duration = (k + 1 < scenes.length ? scenes[k + 1].from : total) - s.from;
    s.starts = s.lines.map((i) => lt[i].start - s.from);
  });
  return {lines: lt, scenes, total};
};
