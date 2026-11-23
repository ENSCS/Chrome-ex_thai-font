const DEF = 110, D = { enabled: true, size: DEF }, $ = (i) => document.getElementById(i);
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
}
const save = (p) => { st = { ...st, ...p }; chrome.storage.local.set(p); show(); };
const clamp = (n) => Math.min(200, Math.max(70, n));
chrome.storage.local.get(D, (r) => { st = r; show(); });
$("sw").onclick = () => { save({ enabled: !st.enabled }); if (!st.enabled) window.close(); };
$("plus").onclick = () => save({ size: clamp(st.size + 5) });
$("minus").onclick = () => save({ size: clamp(st.size - 5) });
