// 아주 작은 해시 라우터. 화면 모듈은 render(container, ctx) 를 export 해야 한다.
const routes = {};
let container = null;
const sessionState = {}; // 화면 간 임시 데이터 전달용(새로고침 시 사라짐 — 의도된 동작)

export function registerRoute(path, renderFn) {
  routes[path] = renderFn;
}

export function navigate(path, data) {
  if (data !== undefined) sessionState[path] = data;
  if (location.hash === `#${path}`) {
    renderCurrent();
  } else {
    location.hash = path;
  }
}

export function getSessionData(path) {
  return sessionState[path];
}

function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/home";
  const [path, queryStr] = raw.split("?");
  const query = {};
  if (queryStr) {
    for (const pair of queryStr.split("&")) {
      const [k, v] = pair.split("=");
      query[decodeURIComponent(k)] = decodeURIComponent(v || "");
    }
  }
  return { path, query };
}

async function renderCurrent() {
  const { path, query } = parseHash();
  const renderFn = routes[path] || routes["/home"];
  container.innerHTML = "";
  window.scrollTo(0, 0);
  await renderFn(container, { query, data: sessionState[path] });
}

export function startRouter(rootEl) {
  container = rootEl;
  window.addEventListener("hashchange", renderCurrent);
  renderCurrent();
}
