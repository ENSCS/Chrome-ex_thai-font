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

  const STACKS = {
    mac: `system-ui,"Thonburi","${FAMILY}","Sarabun","Noto Sans Thai","Tahoma",sans-serif`,
    sarabun: `"${FAMILY}","Sarabun","Noto Sans Thai","Tahoma",sans-serif`,
  };
  // บน Mac โหมด macOS ไม่ต้องใช้ไฟล์ Sarabun (Thonburi มีในเครื่อง) จึงไม่ฝัง @font-face ลดการโหลด
  const isMac = /Mac/i.test(navigator.platform || navigator.userAgent);
  const buildCss = (lite, font) => `${font === "sarabun" || !isMac ? faces : ""}
${sel}{font-family:${STACKS[font] || STACKS.mac} !important${lite ? "" : ";line-height:1.8 !important"}}`;

  const ZOOM_ID = "__thai-readable-zoom__";
  function apply(lite, font) {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = buildCss(lite, font);
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

  // ---- ปรับขนาดตามฟอนต์เดิม (ให้ขนาดสายตาเท่าเดิมเมื่อเปลี่ยนฟอนต์) ----
  const cv = document.createElement("canvas").getContext("2d");
  const ratioCache = new Map();
  let targetStack = STACKS.mac;
  let targetH = 0;

  // ความสูงอักษร (ตัวเลข 0 + อักษรไทย) ที่ขนาด 100px — ใช้เทียบความ "เล็ก/ใหญ่" ของแต่ละฟอนต์
  function glyphH(family) {
    cv.font = `100px ${family}`;
    const a = (s) => cv.measureText(s).actualBoundingBoxAscent;
    return a("0") + a("นบอ");
  }
  function ratioFor(family) {
    if (ratioCache.has(family)) return ratioCache.get(family);
    // ฟอนต์เดิมยังโหลดไม่เสร็จ -> วัดไม่ได้ ใช้ 1 และไม่แคช
    if (!document.fonts.check(`12px ${family}`)) return 1;
    if (!targetH) targetH = glyphH(targetStack);
    const h = glyphH(family);
    const r = h && targetH ? Math.min(1.5, Math.max(0.6, h / targetH)) : 1;
    ratioCache.set(family, r);
    return r;
  }

  function enforceMin(roots) {
    const els = [];
    roots.forEach((r) => collect(r, els));
    // อ่านค่าเดิมทั้งหมดตอนปิด CSS ฟอนต์ของเราชั่วคราว (ทำใน tick เดียว ไม่มีการวาดหน้า)
    const sheet = document.getElementById(STYLE_ID)?.sheet;
    if (sheet) sheet.disabled = true;
    const info = [];
    for (const el of els) {
      if (el.hasAttribute(MARK) || el.closest(iconSel)) continue;
      const cs = getComputedStyle(el);
      info.push([el, parseFloat(cs.fontSize), cs.fontFamily]);
    }
    if (sheet) sheet.disabled = false;

    const todo = [];
    for (const [el, px, fam] of info) {
      if (!px) continue;
      const next = Math.max(MIN_PX, px * ratioFor(fam));
      if (Math.abs(next - px) > 0.25) todo.push([el, next]);
    }
    for (const [el, px] of todo) {
      el.style.setProperty("font-size", Math.round(px * 100) / 100 + "px", "important");
      el.setAttribute(MARK, "1");
    }
  }

  function startMin(font) {
    if (observer) return;
    targetStack = STACKS[font] || STACKS.mac;
    targetH = 0;
    ratioCache.clear();
    enforceMin([document.documentElement]);
    // ฟอนต์เว็บที่โหลดช้า: วัดไม่ได้ตอนแรก ให้วัดซ้ำเมื่อโหลดเสร็จ
    document.fonts?.addEventListener?.("loadingdone", () => observer && enforceMin([document.documentElement]));
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
  // เว็บที่ปรับเฉพาะฟอนต์ (ไม่แตะระยะบรรทัด/ขนาดขั้นต่ำ/ซูม) เพราะเลย์เอาต์ตายตัว
  const isLite = (hosts) =>
    (hosts || []).some((h) => location.hostname === h || location.hostname.endsWith("." + h));

  function render(r) {
    remove();
    if (!r.enabled) return;
    const lite = isLite(r.lite);
    apply(lite, r.font);
    if (lite) return;
    setSize(r.size);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => startMin(r.font), { once: true });
    } else startMin(r.font);
  }

  const DEFAULTS = { enabled: true, size: 110, lite: ["youtube.com"], font: "mac" };
  chrome.storage.local.get(DEFAULTS, render);
  chrome.storage.onChanged.addListener(() => chrome.storage.local.get(DEFAULTS, render));
})();
