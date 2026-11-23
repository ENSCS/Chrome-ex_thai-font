const DEFMIN = 22;
const D = { enabled: true, lite: ["youtube.com"], font: "mac", minPx: DEFMIN };
const $ = (i) => document.getElementById(i);
const PRESETS = [18, 22, 26, 30];
let st = { ...D };
const chips = $("chips");
PRESETS.forEach((n) => {
  const b = document.createElement("button");
  b.textContent = n === DEFMIN ? n + " ★" : n;
  b.dataset.n = n;
  b.title = n === DEFMIN ? "ค่าเริ่มต้น" : "";
  b.onclick = () => save({ minPx: n });
  chips.appendChild(b);
});
function show() {
  $("sw").classList.toggle("on", st.enabled);
  $("sw").setAttribute("aria-checked", st.enabled);
  $("pct").textContent = st.minPx + "px";
  $("ctl").classList.toggle("dim", !st.enabled);
  chips.querySelectorAll("button").forEach((b) => b.classList.toggle("sel", +b.dataset.n === st.minPx));
  document.querySelectorAll("#fonts button").forEach((b) => b.classList.toggle("sel", b.dataset.f === st.font));
  showLite();
}
const save = (p) => { st = { ...st, ...p }; chrome.storage.local.set(p); show(); };
const clamp = (n) => Math.min(36, Math.max(14, n));
let host = "";
const inLite = () => st.lite.some((h) => host === h || host.endsWith("." + h));
function showLite() {
  const row = $("liteRow");
  if (!row) return;
  row.hidden = !host;
  $("liteSw").classList.toggle("on", inLite());
  $("host").textContent = host;
}
chrome.storage.local.get(D, (r) => {
  st = r;
  chrome.tabs.query({ active: true, currentWindow: true }, (t) => {
    try { host = new URL(t[0].url).hostname.replace(/^www\./, ""); } catch { host = ""; }
    if (!/\./.test(host)) host = "";
    show();
  });
});
if ($("liteSw")) $("liteSw").onclick = () => {
  const lite = inLite() ? st.lite.filter((h) => !(host === h || host.endsWith("." + h))) : [...st.lite, host];
  save({ lite });
};
$("sw").onclick = () => { save({ enabled: !st.enabled }); if (!st.enabled) window.close(); };
$("plus").onclick = () => save({ minPx: clamp(st.minPx + 2) });
$("minus").onclick = () => save({ minPx: clamp(st.minPx - 2) });
document.querySelectorAll("#fonts button").forEach((b) => (b.onclick = () => save({ font: b.dataset.f })));
