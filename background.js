// ปิดอยู่ -> คลิกไอคอน = เปิดใช้ทันที | เปิดอยู่ -> คลิกไอคอน = แสดงเมนู
function sync(enabled) {
  chrome.action.setPopup({ popup: enabled ? "popup.html" : "" });
  chrome.action.setBadgeText({ text: enabled ? "" : "off" });
  chrome.action.setBadgeBackgroundColor({ color: "#888" });
}
const load = () => chrome.storage.local.get({ enabled: true }, (r) => sync(r.enabled));

chrome.runtime.onInstalled.addListener(load);
chrome.runtime.onStartup.addListener(load);
chrome.storage.onChanged.addListener((c) => c.enabled && sync(c.enabled.newValue));
chrome.action.onClicked.addListener(() => chrome.storage.local.set({ enabled: true }));
load();
