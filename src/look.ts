// 색·글꼴 — config.json 의 "look"·"font" 를 읽는다. 여기서 직접 바꾸지 말고 config.json 을 고치세요.
import config from '../config.json';

export const LOOK = config.look;
export const FONT = config.font.family;
export const W = 1080;
export const H = 1920;

/** 장면 자리: 위쪽 제목 띠 아래 ~ 자막 띠 위. 오른쪽 120px 은 앱 단추 자리라 비운다 */
export const STAGE = {left: 42, top: 300, width: 918, height: 1080};
/** 장면 내용이 보일 수 있는 세로 범위(화면 좌표). 자막 띠는 그 아래 y 1392~1532 */
export const CLIP = {top: 292, bottom: 1386};
