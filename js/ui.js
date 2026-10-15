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
  const emojis = ["🎉", "⭐", "🎊", "✨", "🏆"];
  const wrap = el("div", { class: "confetti" });
  for (let i = 0; i < 40; i++) {
    const span = el("span", {
      style: `left:${Math.random() * 100}%; animation-duration:${1.5 + Math.random() * 1.5}s; animation-delay:${Math.random() * 0.5}s;`,
    }, emojis[Math.floor(Math.random() * emojis.length)]);
    wrap.appendChild(span);
  }
  container.appendChild(wrap);
  setTimeout(() => wrap.remove(), 3500);
}
