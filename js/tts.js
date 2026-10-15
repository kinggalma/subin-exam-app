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

// 문장부호 제거(읽지 않음), 어절 배열로 분리
export function splitWords(sentence) {
  const cleaned = sentence.replace(/[,.!?]/g, "");
  return cleaned.split(/\s+/).filter(Boolean);
}

export async function speakKoreanSentence(sentence, { rate = 0.75, onWord } = {}) {
  const voiceName = await kvGet("voice.ko");
  const words = splitWords(sentence);
  for (let i = 0; i < words.length; i++) {
    if (onWord) onWord(i, words.length);
    await speakRaw(words[i], { voiceName, lang: "ko-KR", rate });
    await sleep(400);
  }
}

export async function speakEnglish(text, { rate = 1 } = {}) {
  const voiceName = await kvGet("voice.en");
  await speakRaw(text, { voiceName, lang: "en-US", rate });
}

export function cancelSpeech() {
  speechSynthesis.cancel();
}

export async function previewVoice(voiceName, lang) {
  const sample = lang.startsWith("ko") ? "안녕하세요, 수빈이." : "Hello, this is a test.";
  await speakRaw(sample, { voiceName, lang, rate: 1 });
}
