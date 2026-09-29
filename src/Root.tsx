import React from 'react';
import {Composition, cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import config from '../config.json';
import {H, W} from './look';
import {Short, totalFrames} from './Short';
import {Timing} from './timeline';

// 본인 글꼴을 쓰려면 public/fonts/ 에 파일을 넣고 config.json 의 font.file 에 파일 이름,
// font.family 맨 앞에 'MyFont' 를 적으세요. 비워 두면 컴퓨터에 설치된 한글 글꼴을 씁니다.
if (config.font.file) {
  const handle = delayRender('글꼴 불러오기');
  const face = new FontFace('MyFont', `url(${staticFile(`fonts/${config.font.file}`)})`, {weight: '100 900'});
  face
    .load()
    .then(() => {
      document.fonts.add(face);
      continueRender(handle);
    })
    .catch((err) => cancelRender(err));
}

export const RemotionRoot: React.FC = () => (
  <Composition
    id="short"
    component={Short}
    width={W}
    height={H}
    fps={30}
    durationInFrames={300}
    defaultProps={{timing: null as Timing | null}}
    calculateMetadata={async ({props}) => {
      const res = await fetch(`${staticFile('voice/timing.json')}?t=${Date.now()}`);
      if (!res.ok) throw new Error('public/voice/timing.json 이 없습니다. 먼저 npm run voice 를 실행하세요.');
      const timing = (await res.json()) as Timing;
      return {durationInFrames: totalFrames(timing, 30), props: {...props, timing}};
    }}
  />
);
