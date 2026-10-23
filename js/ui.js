// 아주 작은 DOM 헬퍼
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

export function topbar(title, { onBack, right } = {}) {
  return el("div", { class: "topbar" }, [
    onBack ? el("button", { class: "icon-btn", onClick: onBack, "aria-label": "뒤로" }, "◀") : el("div", { style: "width:56px" }),
    el("h1", {}, title),
    right || el("div", { style: "width:56px" }),
  ]);
}

export function screen(children) {
  return el("div", { class: "screen" }, children);
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function showToast(message) {
  const toast = el("div", {
    style: "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#2d2a32;color:#fff;padding:14px 22px;border-radius:14px;font-size:1rem;font-weight:600;box-shadow:0 6px 18px rgba(0,0,0,0.25);z-index:60;max-width:90vw;text-align:center",
  }, message);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

export function fireConfetti(container) {
  const emojis = ["🎉", "⭐", "🎊", "✨", "🏆", "💖", "🎤", "🎶", "🥳", "🌟", "🎆", "🥇"];
  const wrap = el("div", { class: "confetti" });
  for (let i = 0; i < 70; i++) {
    const size = 1.1 + Math.random() * 1.6;
    const drift = Math.round((Math.random() * 2 - 1) * 70);
    const spin = Math.round(360 + Math.random() * 360);
    const span = el("span", {
      style: `left:${Math.random() * 100}%; font-size:${size.toFixed(2)}rem; --drift:${drift}px; --spin:${spin}deg; animation-duration:${1.3 + Math.random() * 1.8}s; animation-delay:${Math.random() * 0.6}s;`,
    }, emojis[Math.floor(Math.random() * emojis.length)]);
    wrap.appendChild(span);
  }
  container.appendChild(wrap);
  setTimeout(() => wrap.remove(), 4200);
}

export function fireFireworks(container) {
  const colors = ["#ff6fae", "#ffd166", "#6fc3ff", "#b48bff", "#7cffb2", "#ff8a65"];
  const wrap = el("div", { class: "fireworks" });
  for (let i = 0; i < 6; i++) {
    const x = 12 + Math.random() * 76;
    const y = 10 + Math.random() * 55;
    const color = colors[Math.floor(Math.random() * colors.length)];
    wrap.appendChild(el("div", {
      class: "firework-burst",
      style: `left:${x}%; top:${y}%; animation-delay:${i * 180}ms; --fw-color:${color};`,
    }));
  }
  container.appendChild(wrap);
  setTimeout(() => wrap.remove(), 2200);
}

export function vibrateFanfare() {
  try {
    if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 160]);
  } catch {
    // 진동 미지원 기기는 무시
  }
}

let sharedAudioCtx = null;
export function playCheerSound() {
  try {
    sharedAudioCtx = sharedAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = sharedAudioCtx;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // 도-미-솔-높은도 (팡파레)
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {
    // 오디오 자동재생이 막힌 기기는 소리 없이 넘어간다
  }
}
