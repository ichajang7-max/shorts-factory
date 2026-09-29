# shorts-factory — 문장 몇 줄 → 세로 쇼츠(목소리·자막)

대본 파일에 문장 몇 줄을 적으면, 제미나이 TTS 로 목소리를 만들고 Remotion 으로 **1080×1920 세로 영상(목소리 + 자막 + 움직이는 장면)**을 뽑아 주는 예제입니다.

<p align="center"><img src="docs/preview.gif" width="300" alt="예제 대본으로 만든 16초 세로 영상 미리보기"></p>

위 영상은 이 저장소의 예제 대본(`script.json`, 가짜 내용)을 그대로 돌려 나온 결과입니다(약 16초, 소리는 GIF 라 빠져 있음).

## 하는 일 (여기까지만 합니다)

1. **대본** `script.json` — 문장마다 화면 자막(`caption`)과 읽을 말(`tts`), 어느 장면에 넣을지(`scene`)
2. **목소리** `tools/make_voice.py` — 제미나이 TTS 로 문장 몇 개씩 묶어 읽힌 뒤 쉼에서 잘라 문장별 파일로 저장, 앞뒤 무음 제거·빠르기 조절
3. **영상 틀 1종** `src/` — 표지 → 위쪽 제목 띠, 장면 4가지(큰 글자·목록·숫자 세기·단추), 장면 전환 움직임
4. **자막** — 목소리 길이에 맞춰 아래 자막 띠에 한 줄씩

주제 찾기, 억양 검사, 썸네일, 업로드 같은 기능은 **들어 있지 않습니다.**
글꼴·배경음악·그림 파일도 들어 있지 않습니다(아래 "본인 파일 넣는 곳").

## 필요한 것

| | |
|---|---|
| Node.js | 18 이상 (시험한 버전 24) — https://nodejs.org |
| Python | 3.10 이상 (시험한 버전 3.12) — https://www.python.org |
| ffmpeg | 명령창에서 `ffmpeg -version` 이 되면 됩니다. 윈도우: `winget install Gyan.FFmpeg` |
| 제미나이 API 키 | https://aistudio.google.com/apikey 에서 발급 |

## 사용법 (윈도우 PowerShell 기준)

처음 한 번: `.env.example` 파일을 복사해 이름을 `.env` 로 바꾸고, `GEMINI_API_KEY=` 뒤에 키를 붙여 넣습니다.

```powershell
npm run setup    # 필요한 것 설치 (처음 한 번)
npm run voice    # script.json → 목소리 파일 (public/voice/)
npm run render   # → out/short.mp4
```

- 대본을 고친 뒤에는 `npm run voice` → `npm run render` 만 다시 하면 됩니다. 바뀐 문장만 목소리를 새로 만듭니다(전부 다시: `python tools/make_voice.py script.json --redo`).
- 미리 보면서 고치려면 `npm run studio` (브라우저에서 열림).
- 예제 대본(6문장)은 TTS 요청 2번, 시험한 노트북에서 목소리 약 20초 + 렌더 약 1~2분 걸렸습니다.

## 설정 바꾸는 곳

| 바꾸고 싶은 것 | 파일 · 칸 |
|---|---|
| 목소리 모델 이름 | `config.json` → `tts.model` (기본 `gemini-3.1-flash-tts-preview`) |
| 목소리 종류 · 읽는 말투 · 빠르기 | `config.json` → `tts.voice` · `tts.style` · `tts.tempo` |
| 한 번에 묶어 읽힐 문장 수 | `config.json` → `tts.linesPerRequest` (요청 횟수를 줄이려는 것. 잘 안 잘리면 1) |
| 색 | `config.json` → `look` (장면 바탕색은 순서대로 돌아가며 씀) |
| 오른쪽 아래 작은 글자(계정 이름 등) | `config.json` → `watermark` |
| 대본 · 표지 · 장면 내용 | `script.json` |
| 새 장면 모양 | `src/scenes.tsx` 에 컴포넌트 추가 |

`gemini-3.1-flash-tts-preview` 는 미리보기(preview) 모델이라 이름이 바뀌거나 없어질 수 있습니다. 그때는 `config.json` 의 `tts.model` 한 곳만 바꾸면 됩니다.

### 장면 4가지 (`script.json` 의 `scenes`)

```json
"hook":  {"type": "big",   "kicker": "작은 윗글", "big": "큰 글자", "sub": "아랫글"},
"list":  {"type": "list",  "title": "제목", "items": ["항목1", "항목2", "항목3"]},
"count": {"type": "count", "from": 0, "to": 30, "unit": "초", "label": "설명"},
"cta":   {"type": "cta",   "big": "큰 글자", "button": "단추 글자"}
```

`list` 는 항목 수가 그 장면의 문장 수와 같으면 문장이 시작될 때마다 항목이 하나씩 들어옵니다.
자막에서 줄바꿈(`\n`)은 "화면에 따로 띄울 조각"으로 쓰입니다.

## 본인 파일 넣는 곳

- 글꼴: `public/fonts/` 에 넣고 `config.json` → `font.file` 에 파일 이름, `font.family` 맨 앞에 `'MyFont'`. 비워 두면 컴퓨터에 설치된 한글 글꼴(맑은 고딕 등)
- 배경음악: `public/music/` 에 넣고 `config.json` → `music.file`. 비워 두면 목소리만

**쓸 권리가 있는 파일만 넣으세요.** 이 저장소에는 글꼴·음원·그림이 들어 있지 않습니다.

## 있는 그대로 제공합니다

- 개인이 쓰던 흐름을 떼어 낸 **예제**입니다. 있는 그대로(as is) 제공하며, 질문 답변·버그 수정·PR 반영을 약속하지 않습니다.
- 시험한 환경은 윈도우 11 + PowerShell 뿐입니다.

## 라이선스와 약관 (꼭 읽어 주세요)

- **이 저장소 코드**: MIT (`LICENSE`).
- **Remotion** 은 이 저장소와 별개의 라이선스를 따릅니다. 원문: https://github.com/remotion-dev/remotion/blob/main/LICENSE.md · 안내: https://www.remotion.dev/docs/license
  - 요약(2026-09-29 원문 확인): **개인, 직원 3명 이하 영리 단체, 비영리 단체, 도입 검토 중**이면 무료로 쓸 수 있고, 그 밖의 경우(예: 직원 4명 이상 회사)는 **회사 라이선스(유료)**가 필요합니다. 구매·가격은 https://www.remotion.pro/license . 조건은 바뀔 수 있으니 쓰기 전에 원문을 직접 확인하세요.
- **제미나이 API**: https://ai.google.dev/gemini-api/terms (2026-09-29 확인, 문서 수정일 2026-04-28)
  - 원문 요약: 18세 이상만 사용할 수 있습니다. 무료(유료 결제 안 한) 사용분은 보낸 내용과 응답을 Google 이 제품 개선에 쓸 수 있다고 적혀 있으니 **민감한 내용은 대본에 넣지 마세요.** 요금·한도는 Google 안내를 따릅니다.
- 만든 목소리·영상을 어디에 올릴지는 각 플랫폼 정책과 위 약관을 직접 확인하세요.

---

## English (short)

**shorts-factory** turns a few lines of Korean script into a 1080×1920 vertical short with voice-over (Gemini TTS) and subtitles, rendered with Remotion.

```powershell
npm run setup    # once (Node 18+, Python 3.10+, ffmpeg required)
npm run voice    # script.json -> public/voice/*.wav  (needs GEMINI_API_KEY in .env)
npm run render   # -> out/short.mp4
```

Settings (TTS model, voice, colors) live in `config.json`. No fonts, music or images are included.
Provided **as is** — no support or PR review promised. Code is MIT; **Remotion has its own license** (free for individuals and companies with up to 3 employees, paid company license otherwise — check the original: https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). Gemini API terms: https://ai.google.dev/gemini-api/terms
