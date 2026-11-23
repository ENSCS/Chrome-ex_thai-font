const DEF = 110, D = { enabled: true, size: DEF, lite: ["youtube.com"], font: "mac" }, $ = (i) => document.getElementById(i);
const PRESETS = [100, 110, 125, 150];
let st = { ...D };
const chips = $("chips");
PRESETS.forEach((n) => {
  const b = document.createElement("button");
  b.textContent = n === DEF ? n + " ★" : n;
  b.dataset.n = n;
  b.title = n === DEF ? "ค่าเริ่มต้น" : "";
  b.onclick = () => save({ size: n });
  chips.appendChild(b);
});
function show() {
  $("sw").classList.toggle("on", st.enabled);
  $("sw").setAttribute("aria-checked", st.enabled);
  $("pct").textContent = st.size + "%";
  $("ctl").classList.toggle("dim", !st.enabled);
  chips.querySelectorAll("button").forEach((b) => b.classList.toggle("sel", +b.dataset.n === st.size));
  document.querySelectorAll("#fonts button").forEach((b) => b.classList.toggle("sel", b.dataset.f === st.font));
  showLite();
}
const save = (p) => { st = { ...st, ...p }; chrome.storage.local.set(p); show(); };
const clamp = (n) => Math.min(200, Math.max(70, n));
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
$("plus").onclick = () => save({ size: clamp(st.size + 5) });
$("minus").onclick = () => save({ size: clamp(st.size - 5) });
document.querySelectorAll("#fonts button").forEach((b) => (b.onclick = () => save({ font: b.dataset.f })));
