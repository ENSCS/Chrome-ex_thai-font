const DEFMIN = 20;
const $ = (i) => document.getElementById(i);
const PRESETS = [18, 20, 24, 28];
// st = สถานะของ "แท็บนี้" (เปิด/ปิด ฟอนต์ ขนาด) + lite = รายชื่อเว็บแบบเฉพาะฟอนต์ (ใช้รวมทุกแท็บ)
let st = { enabled: true, font: "mac", minPx: DEFMIN, lite: ["youtube.com"] };
let tabId = null;
let host = "";
const chips = $("chips");
PRESETS.forEach((n) => {
  const b = document.createElement("button");
  b.textContent = n === DEFMIN ? n + " ★" : n;
  b.dataset.n = n;
  b.title = n === DEFMIN ? "ค่าเริ่มต้น" : "";
  b.onclick = () => save({ minPx: n });
  chips.appendChild(b);
});
const inLite = () => st.lite.some((h) => host === h || host.endsWith("." + h));
function show() {
  $("sw").classList.toggle("on", st.enabled);
  $("sw").setAttribute("aria-checked", st.enabled);
  $("pct").textContent = st.minPx + "px";
  $("ctl").classList.toggle("dim", !st.enabled);
  chips.querySelectorAll("button").forEach((b) => b.classList.toggle("sel", +b.dataset.n === st.minPx));
  document.querySelectorAll("#fonts button").forEach((b) => b.classList.toggle("sel", b.dataset.f === st.font));
  $("liteRow").hidden = !host;
  $("liteSw").classList.toggle("on", inLite());
  $("host").textContent = host;
}
function save(patch) {
  if ("lite" in patch) {
    st.lite = patch.lite;
    chrome.storage.local.set({ lite: patch.lite });
  }
  const tabPatch = {};
  for (const k of ["enabled", "font", "minPx"]) if (k in patch) tabPatch[k] = st[k] = patch[k];
  if (Object.keys(tabPatch).length) chrome.runtime.sendMessage({ type: "set", tabId, patch: tabPatch });
  show();
}
const clamp = (n) => Math.min(36, Math.max(14, n));
chrome.tabs.query({ active: true, currentWindow: true }, async (t) => {
  tabId = t[0].id;
  try { host = new URL(t[0].url).hostname.replace(/^www\./, ""); } catch { host = ""; }
  if (!/\./.test(host)) host = "";
  const { lite } = await chrome.storage.local.get({ lite: st.lite });
  st.lite = lite;
  chrome.runtime.sendMessage({ type: "get", tabId }, (s) => {
    if (s) st = { ...st, ...s };
    show();
  });
});
$("liteSw").onclick = () => {
  const rest = st.lite.filter((h) => !(host === h || host.endsWith("." + h)));
  save({ lite: inLite() ? rest : [...rest, host] });
};
$("sw").onclick = () => { save({ enabled: !st.enabled }); if (!st.enabled) window.close(); };
$("plus").onclick = () => save({ minPx: clamp(st.minPx + 2) });
$("minus").onclick = () => save({ minPx: clamp(st.minPx - 2) });
document.querySelectorAll("#fonts button").forEach((b) => (b.onclick = () => save({ font: b.dataset.f })));
