"""대본(script.json) → 문장별 목소리 파일 + 타이밍 파일.

사용법:
    python tools/make_voice.py script.json            # 없는 문장만 새로 만든다
    python tools/make_voice.py script.json --redo     # 전부 다시 만든다
    python tools/make_voice.py script.json 2 5        # 2번·5번 문장만 다시 만든다

하는 일
 1) Gemini TTS 로 문장을 몇 개씩 묶어 한 번에 읽힌 뒤, 문장 사이 쉼을 찾아 잘라 낸다
    (요청 횟수를 줄이려는 것. 자르기에 실패한 묶음만 문장마다 다시 요청한다)
    원본은 .cache/raw/ 에 둔다
 2) 앞뒤 무음 제거 + 빠르기(tempo) 적용 → public/voice/NN.wav
 3) public/voice/timing.json 에 대본·문장별 길이(초)를 적는다 → Remotion 이 이 파일을 읽는다

설정(모델 이름·목소리·빠르기)은 config.json 의 "tts" 한 곳에서 바꾼다.
API 키는 환경 변수 GEMINI_API_KEY 또는 .env 파일에서 읽는다(화면에 출력하지 않는다).
"""
import json
import logging
import os
import re
import subprocess
import sys
import time
import wave
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")  # 윈도우 콘솔에서 한글이 깨지지 않게
logging.getLogger("google_genai").setLevel(logging.ERROR)

ROOT = Path(__file__).resolve().parent.parent
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))["tts"]
MODEL = CONFIG.get("model", "gemini-3.1-flash-tts-preview")
VOICE = CONFIG.get("voice", "Charon")
STYLE = CONFIG.get("style", "")
PER_REQUEST = int(CONFIG.get("linesPerRequest", 4))
TEMPO = float(CONFIG.get("tempo", 1.1))

BATCH_STYLE = STYLE.rstrip(":\n") + (
    ". 아래에 문장이 줄마다 하나씩 있습니다. "
    "각 문장을 또박또박 읽고, 문장과 문장 사이에는 반드시 일 초 이상 완전히 쉬어 주세요. "
    "줄 번호나 기호는 읽지 마세요:\n")
SEP = "\n\n……\n\n"   # 문장 사이 구분(말줄임표는 쉼으로 읽힌다)
MIN_GAP = 0.35       # 문장 사이로 인정할 최소 무음(초)
NOISE = "-45dB"


# ---------------- API 키 ----------------
def api_key():
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    env = ROOT / ".env"
    if not key and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("GEMINI_API_KEY="):
                key = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not key:
        sys.exit("GEMINI_API_KEY 가 없습니다. .env.example 을 .env 로 복사해 키를 넣거나 환경 변수로 설정하세요.")
    return key


_client = None
def client():
    global _client
    if _client is None:
        from google import genai
        _client = genai.Client(api_key=api_key())
    return _client


# ---------------- TTS 한 번 ----------------
def save_wav(path, pcm, rate=24000):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)


def tts(text, out, style=STYLE, tries=5):
    from google.genai import types
    last = None
    for i in range(tries):
        try:
            r = client().models.generate_content(
                model=MODEL,
                contents=style + text,
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=VOICE)))))
            part = r.candidates[0].content.parts[0]
            if part.inline_data and part.inline_data.data:
                save_wav(out, part.inline_data.data)
                return
            last = "소리가 오지 않음"
        except Exception as e:  # 한도 초과·일시 오류는 잠시 뒤 다시
            last = type(e).__name__ + ": " + str(e)[:200]
        time.sleep(3 * (i + 1))
    raise RuntimeError(last)


# ---------------- 묶음 자르기 ----------------
def duration(path):
    with wave.open(str(path)) as w:
        return w.getnframes() / w.getframerate()


def silences(path):
    r = subprocess.run(
        ["ffmpeg", "-v", "info", "-i", str(path), "-af", f"silencedetect=noise={NOISE}:d={MIN_GAP}", "-f", "null", "-"],
        capture_output=True, text=True, errors="replace")
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    return [(s, ends[i] if i < len(ends) else duration(path)) for i, s in enumerate(starts)]


def split_points(path, n):
    """문장 n개로 나눌 경계 n-1개. 못 찾으면 None."""
    if n == 1:
        return []
    dur = duration(path)
    inner = [(s, e) for s, e in silences(path) if s > 0.15 and e < dur - 0.15]
    if len(inner) < n - 1:
        return None
    inner.sort(key=lambda g: g[1] - g[0], reverse=True)   # 긴 쉼부터
    pts = [round((s + e) / 2, 3) for s, e in sorted(inner[:n - 1])]
    edges = [0.0] + pts + [dur]
    if any(edges[i + 1] - edges[i] < 0.4 for i in range(len(edges) - 1)):
        return None
    return pts


def cut(src, pts, outs):
    edges = [0.0] + list(pts) + [duration(src)]
    for i, out in enumerate(outs):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ss", str(edges[i]), "-to", str(edges[i + 1]),
                        "-c", "copy", str(out)], check=True)


def make_raw(texts, outs, tmp_dir):
    """문장들을 묶음으로 만들고, 실패한 묶음만 문장별로. 돌려주는 값: 요청 횟수"""
    calls = 0
    for i in range(0, len(texts), PER_REQUEST):
        chunk, chunk_out = texts[i:i + PER_REQUEST], outs[i:i + PER_REQUEST]
        label = f"{i + 1}~{i + len(chunk)}"
        if len(chunk) == 1:
            tts(chunk[0], chunk_out[0]); calls += 1
            print(f"  {label} 한 문장 → 요청 1회")
            continue
        tmp = tmp_dir / "_batch.wav"
        tts(SEP.join(chunk), tmp, style=BATCH_STYLE); calls += 1
        pts = split_points(tmp, len(chunk))
        if pts is None:
            print(f"  {label} 묶음 자르기 실패 → 문장별로 다시 요청")
            for t, o in zip(chunk, chunk_out):
                tts(t, o); calls += 1
        else:
            cut(tmp, pts, chunk_out)
            print(f"  {label} 묶음 {len(chunk)}문장 → 요청 1회")
    return calls


# ---------------- 실행 ----------------
def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    redo_all = "--redo" in sys.argv
    script_path = ROOT / (args[0] if args else "script.json")
    spec = json.loads(script_path.read_text(encoding="utf-8"))
    lines = spec["lines"]
    redo = {int(x) for x in args[1:]}

    raw = ROOT / ".cache" / "raw"
    out = ROOT / "public" / "voice"
    raw.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)

    # 같은 문장을 다시 부르지 않도록, 문장·설정이 바뀐 것만 새로 만든다
    stamp_file = raw / "stamps.json"
    stamps = json.loads(stamp_file.read_text(encoding="utf-8")) if stamp_file.exists() else {}
    todo = []
    for i, l in enumerate(lines, 1):
        stamp = f"{MODEL}|{VOICE}|{STYLE}|{l['tts']}"
        f = raw / f"{i:02d}.wav"
        if redo_all or i in redo or not f.exists() or stamps.get(str(i)) != stamp:
            todo.append((i, l["tts"]))
        stamps[str(i)] = stamp

    calls = 0
    if todo:
        print(f"목소리 만들 문장 {len(todo)}개: {[i for i, _ in todo]}  (모델 {MODEL}, 목소리 {VOICE})")
        calls = make_raw([t for _, t in todo], [raw / f"{i:02d}.wav" for i, _ in todo], raw)
        stamp_file.write_text(json.dumps(stamps, ensure_ascii=False, indent=1), encoding="utf-8")
    else:
        print("바뀐 문장이 없어 목소리는 새로 만들지 않습니다 (전부 다시: --redo)")

    trim = ("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,"
            "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse,"
            f"atempo={TEMPO},volume=3dB")
    for old in out.glob("*.wav"):
        old.unlink()
    durs = []
    for i in range(1, len(lines) + 1):
        dst = out / f"{i:02d}.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw / f"{i:02d}.wav"), "-af", trim, "-ar", "48000", str(dst)],
                       check=True)
        durs.append(round(duration(dst), 3))

    timing = {k: v for k, v in spec.items() if k != "lines"}
    timing["lines"] = lines
    timing["durations"] = durs
    timing["version"] = int(time.time())
    (out / "timing.json").write_text(json.dumps(timing, ensure_ascii=False, indent=1), encoding="utf-8")
    print("문장별 길이(초):", durs, "합계", round(sum(durs), 2))
    print(f"이번 TTS 요청 {calls}회 → 다음: npm run render")


if __name__ == "__main__":
    main()
