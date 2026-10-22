// Web Speech API 래퍼 — 국어(ko-KR) / 영어(en-US) 음성 재생, 어절 단위 끊어 읽기
import { kvGet } from "./db.js";

let voicesCache = [];
function loadVoices() {
  return new Promise((resolve) => {
    const existing = speechSynthesis.getVoices();
    if (existing.length) {
      voicesCache = existing;
      resolve(existing);
      return;
    }
    speechSynthesis.onvoiceschanged = () => {
      voicesCache = speechSynthesis.getVoices();
      resolve(voicesCache);
    };
  });
}

export async function getVoices() {
  await loadVoices();
  return voicesCache;
}

export async function getVoicesFor(langPrefix) {
  const voices = await getVoices();
  return voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(langPrefix.toLowerCase()));
}

function speakRaw(text, { voiceName, lang, rate = 1 }) {
  return new Promise((resolve) => {
    if (!text) { resolve(); return; }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;
    const voices = voicesCache;
    const voice = voices.find((v) => v.name === voiceName);
    if (voice) utter.voice = voice;
    let done = false;
    const finish = () => { if (done) return; done = true; resolve(); };
    utter.onend = finish;
    utter.onerror = finish;
    speechSynthesis.speak(utter);
    // 일부 브라우저(특히 안드로이드 Chrome)는 onend/onerror가 발화되지 않는 버그가 있어
    // 읽기 흐름이 무한정 멈추지 않도록 글자 수 기반 타임아웃으로 안전장치를 둔다.
    const timeoutMs = Math.max(4000, text.length * 500) / rate;
    setTimeout(() => { if (!done) speechSynthesis.cancel(); finish(); }, timeoutMs);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const PUNCT_NAMES = { ",": "쉼표", ".": "마침표 점", "!": "느낌표", "?": "물음표" };

// 어절과 뒤에 붙은 문장부호(들)를 분리 — 문장부호는 이름(쉼표/마침표 등)으로 읽어준다
export function tokenizeSentence(sentence) {
  return sentence.split(/\s+/).filter(Boolean).map((token) => {
    const m = token.match(/^(.*?)([,.!?]*)$/);
    return { word: m[1], puncts: m[2] ? m[2].split("") : [] };
  });
}

export async function speakKoreanSentence(sentence, { rate = 0.75, onWord, signal } = {}) {
  const voiceName = await kvGet("voice.ko");
  const tokens = tokenizeSentence(sentence);
  for (let i = 0; i < tokens.length; i++) {
    if (signal && signal.cancelled) return;
    const { word, puncts } = tokens[i];
    if (onWord) onWord(i, tokens.length);
    if (word) {
      await speakRaw(word, { voiceName, lang: "ko-KR", rate });
      if (signal && signal.cancelled) return;
      await sleep(puncts.length ? 200 : 400);
    }
    for (const p of puncts) {
      if (signal && signal.cancelled) return;
      const name = PUNCT_NAMES[p];
      if (!name) continue;
      await speakRaw(name, { voiceName, lang: "ko-KR", rate });
      await sleep(400);
    }
  }
}

export async function speakEnglish(text, { rate = 1, signal } = {}) {
  if (signal && signal.cancelled) return;
  const voiceName = await kvGet("voice.en");
  if (signal && signal.cancelled) return;
  await speakRaw(text, { voiceName, lang: "en-US", rate });
}

// 미국식 발음으로 천천히 2번 읽어준다 (단어 시험/공부 화면 공용)
export async function speakEnglishTwice(text, { rate = 0.8, signal, pauseMs = 600 } = {}) {
  await speakEnglish(text, { rate, signal });
  if (signal && signal.cancelled) return;
  await new Promise((r) => setTimeout(r, pauseMs));
  if (signal && signal.cancelled) return;
  await speakEnglish(text, { rate, signal });
}

export function cancelSpeech() {
  speechSynthesis.cancel();
}

export async function previewVoice(voiceName, lang) {
  const sample = lang.startsWith("ko") ? "안녕하세요, 수빈이." : "Hello, this is a test.";
  await speakRaw(sample, { voiceName, lang, rate: 1 });
}
