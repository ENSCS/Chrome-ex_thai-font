// ทำงานแยกรายแท็บ: ทุกแท็บเริ่มต้น "ปิด" คลิกไอคอนเพื่อเปิดเฉพาะแท็บนั้น
// เปิดแล้ว -> คลิกไอคอนจะแสดงเมนู | ปิดอยู่ -> คลิกไอคอนครั้งเดียวเพื่อเปิด
const DEFAULT_PREFS = { font: "mac", minPx: 20 };
const key = (id) => "tab_" + id;

async function getState(tabId) {
  const s = (await chrome.storage.session.get(key(tabId)))[key(tabId)];
  if (s) return s;
  const { prefs } = await chrome.storage.local.get({ prefs: DEFAULT_PREFS });
  return { enabled: false, ...DEFAULT_PREFS, ...prefs };
}

function decorate(tabId, s) {
  chrome.action.setPopup({ tabId, popup: s.enabled ? "popup.html" : "" }).catch(() => {});
  chrome.action.setBadgeText({ tabId, text: s.enabled ? "" : "off" }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#888" }).catch(() => {});
}

async function setState(tabId, patch) {
  const next = { ...(await getState(tabId)), ...patch };
  await chrome.storage.session.set({ [key(tabId)]: next });
  if ("font" in patch || "minPx" in patch) {
    chrome.storage.local.set({ prefs: { font: next.font, minPx: next.minPx } }); // ค่าตั้งต้นของแท็บใหม่
  }
  decorate(tabId, next);
  chrome.tabs.sendMessage(tabId, { type: "state", state: next }).catch(() => {});
  return next;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : msg.tabId; // content script ใช้แท็บของตัวเอง / popup ส่ง tabId มา
  if (tabId == null) return;
  (async () => {
    if (msg.type === "get") sendResponse(await getState(tabId));
    else if (msg.type === "set") sendResponse(await setState(tabId, msg.patch));
  })();
  return true;
});

chrome.action.onClicked.addListener((tab) => setState(tab.id, { enabled: true }));
chrome.tabs.onRemoved.addListener((id) => chrome.storage.session.remove(key(id)));
// ค่าเฉพาะแท็บของไอคอนอาจถูกรีเซ็ตเมื่อเปลี่ยนหน้า จึงตั้งซ้ำ
chrome.tabs.onUpdated.addListener((id, info) => {
  if (info.status) getState(id).then((s) => decorate(id, s));
});
chrome.tabs.onActivated.addListener(({ tabId }) => getState(tabId).then((s) => decorate(tabId, s)));
