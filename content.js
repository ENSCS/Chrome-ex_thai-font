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
${sel}{font-family:"${FAMILY}","Sarabun","Noto Sans Thai","Tahoma",sans-serif !important;line-height:1.8 !important}`;

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
  // ---- ขนาดตัวอักษรขั้นต่ำ ----
  const MIN_PX = 14;
  const MARK = "data-trf-min";
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "CANVAS", "IFRAME", "TEXTAREA"]);
  const iconSel = EXCLUDE.join(",");
  let observer = null;
  let timer = null;
  let pending = new Set();

  function hasOwnText(el) {
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    }
    return false;
  }

  function collect(root, out) {
    if (root.nodeType !== 1) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let el = root;
    do {
      if (!SKIP_TAGS.has(el.tagName.toUpperCase()) && hasOwnText(el)) out.push(el);
    } while ((el = walker.nextNode()));
  }

  function enforceMin(roots) {
    const els = [];
    roots.forEach((r) => collect(r, els));
    // อ่านทั้งหมดก่อน แล้วค่อยเขียน (ลด layout thrashing)
    const todo = [];
    for (const el of els) {
      if (el.closest(iconSel)) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px && px < MIN_PX) todo.push(el);
    }
    for (const el of todo) {
      el.style.setProperty("font-size", MIN_PX + "px", "important");
      el.setAttribute(MARK, "1");
    }
  }

  function startMin() {
    if (observer) return;
    enforceMin([document.documentElement]);
    observer = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => n.nodeType === 1 && pending.add(n));
        if (m.type === "characterData" && m.target.parentElement) pending.add(m.target.parentElement);
      }
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        const roots = [...pending].filter((n) => n.isConnected);
        pending = new Set();
        if (roots.length) enforceMin(roots);
      }, 300);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  function stopMin() {
    observer?.disconnect();
    observer = null;
    clearTimeout(timer);
    timer = null;
    pending = new Set();
    document.querySelectorAll(`[${MARK}]`).forEach((el) => {
      el.style.removeProperty("font-size");
      el.removeAttribute(MARK);
    });
  }

  function remove() {
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(ZOOM_ID)?.remove();
    stopMin();
  }
  function render(r) {
    if (r.enabled) {
      apply();
      setSize(r.size);
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startMin, { once: true });
      } else startMin();
    } else remove();
  }

  const DEFAULTS = { enabled: true, size: 110 };
  chrome.storage.local.get(DEFAULTS, render);
  chrome.storage.onChanged.addListener(() => chrome.storage.local.get(DEFAULTS, render));
})();
