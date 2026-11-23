(() => {
  const STYLE_ID = "__thai-readable-font__";
  const FAMILY = "TRF Sarabun";

  const faces = [
    [300, "Light"],
    [400, "Regular"],
    [500, "Medium"],
    [600, "SemiBold"],
    [700, "Bold"],
  ]
    .map(
      ([w, n]) => `@font-face{font-family:"${FAMILY}";font-weight:${w};font-style:normal;` +
        `src:url("${chrome.runtime.getURL(`fonts/Sarabun-${n}.ttf`)}") format("truetype");font-display:swap}`
    )
    .join("\n");

  // ไม่แตะ element ที่เป็น icon font / โค้ด / ตัวเลขแบบ monospace
  const EXCLUDE = [
    "i", "code", "pre", "kbd", "samp", "svg", "svg *", "math",
    '[class*="icon" i]', '[class*="fa-"]', ".fa", ".fas", ".far", ".fab",
    '[class*="material-" i]', '[class*="glyphicon"]', '[class*="bi-"]',
    '[class*="codicon"]', '[class*="mdi-"]', ".ti", '[class^="ti-"]',
  ];
  const sel = `*:not(${EXCLUDE.join("):not(")})`;

  const css = `${faces}
${sel}{font-family:"${FAMILY}","Sarabun","Noto Sans Thai","Tahoma",sans-serif !important;line-height:1.6 !important}`;

  const ZOOM_ID = "__thai-readable-zoom__";
  function apply() {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = css;
    (document.head || document.documentElement).appendChild(el);
  }
  function setSize(pct) {
    let el = document.getElementById(ZOOM_ID);
    if (!pct || pct === 100) return el?.remove();
    if (!el) {
      el = document.createElement("style");
      el.id = ZOOM_ID;
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = `html{zoom:${pct / 100} !important}`;
  }
  function remove() {
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(ZOOM_ID)?.remove();
  }
  function render(r) {
    if (r.enabled) {
      apply();
      setSize(r.size);
    } else remove();
  }

  const DEFAULTS = { enabled: true, size: 110 };
  chrome.storage.local.get(DEFAULTS, render);
  chrome.storage.onChanged.addListener(() => chrome.storage.local.get(DEFAULTS, render));
})();
