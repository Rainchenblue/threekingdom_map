"use strict";

const state = {
  items: [],
  itemsById: {},
  markers: [],
  selectedMarkerId: null,
  activeFilter: null,
};

const mapWrap = document.getElementById("mapWrap");
const markersLayer = document.getElementById("markersLayer");
const itemList = document.getElementById("itemList");
const popup = document.getElementById("popup");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");

init();

async function init() {
  try {
    const [itemsRes, markersRes] = await Promise.all([
      fetch("data/items.json"),
      fetch("data/markers.json"),
    ]);
    if (!itemsRes.ok || !markersRes.ok) throw new Error("資料載入失敗");
    const itemsData = await itemsRes.json();
    const markersData = await markersRes.json();

    state.items = itemsData.items;
    state.markers = markersData.markers;
    for (const it of state.items) state.itemsById[it.id] = it;

    renderSidebar();
    renderMarkers();
    applyView();
  } catch (err) {
    statusEl.textContent = "⚠ 資料載入失敗：" + err.message;
  }
}

function renderSidebar() {
  itemList.innerHTML = "";
  if (state.items.length === 0) {
    const li = document.createElement("li");
    li.className = "item-row empty-hint";
    li.textContent = "兵裝資料待提供";
    itemList.appendChild(li);
    return;
  }
  state.items.forEach((it, idx) => {
    const li = document.createElement("li");
    li.className = "item-row";
    li.dataset.itemId = it.id;

    const badge = document.createElement("div");
    badge.className = "badge badge-" + (idx % 10);
    badge.textContent = it.id;

    const info = document.createElement("div");
    info.className = "info";
    const nameEl = document.createElement("div");
    nameEl.className = "iname";
    nameEl.textContent = it.name;
    const locEl = document.createElement("div");
    locEl.className = "iloc";
    locEl.textContent = "可於 " + locationCount(it.id) + " 個據點製造";
    info.appendChild(nameEl);
    info.appendChild(locEl);

    li.appendChild(badge);
    li.appendChild(info);

    li.addEventListener("click", (e) => {
      e.stopPropagation();
      setFilter(it.id);
    });
    itemList.appendChild(li);
  });
}

function renderMarkers() {
  markersLayer.innerHTML = "";
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  state.markers.forEach((m, idx) => {
    const div = document.createElement("div");
    div.className = "marker";
    div.dataset.markerId = m.id;
    div.style.left = m.x + "%";
    div.style.top = m.y + "%";

    const pin = document.createElement("div");
    pin.className = "pin";
    const span = document.createElement("span");
    span.textContent = alphabet[idx % 26];
    pin.appendChild(span);

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = m.name;

    div.appendChild(pin);
    div.appendChild(label);

    div.addEventListener("click", (e) => {
      e.stopPropagation();
      selectMarker(m.id);
    });
    markersLayer.appendChild(div);
  });
}

function locationCount(itemId) {
  return state.markers.filter((m) => m.items.includes(itemId)).length;
}

function selectMarker(markerId) {
  if (state.selectedMarkerId === markerId) {
    clearSelection();
    return;
  }
  state.selectedMarkerId = markerId;
  showPopup(state.markers.find((m) => m.id === markerId));
  applyView();
}

function clearSelection() {
  state.selectedMarkerId = null;
  hidePopup();
  applyView();
}

function setFilter(itemId) {
  state.activeFilter = state.activeFilter === itemId ? null : itemId;
  const row = itemList.querySelector('[data-item-id="' + itemId + '"]');
  if (row) {
    row.scrollIntoView({ block: "nearest" });
    row.classList.remove("flash");
    void row.offsetWidth;
    row.classList.add("flash");
  }
  applyView();
}

function clearFilter() {
  state.activeFilter = null;
  applyView();
}

function applyView() {
  const filter = state.activeFilter;

  for (const mEl of markersLayer.children) {
    const m = state.markers.find((x) => x.id === mEl.dataset.markerId);
    mEl.classList.remove("match", "dim", "selected");
    if (filter) {
      if (m.items.includes(filter)) mEl.classList.add("match");
      else mEl.classList.add("dim");
    }
    if (state.selectedMarkerId === m.id) mEl.classList.add("selected");
  }

  for (const row of itemList.children) {
    row.classList.remove("active", "available");
    if (filter && row.dataset.itemId === filter) row.classList.add("active");
    if (state.selectedMarkerId) {
      const m = state.markers.find((x) => x.id === state.selectedMarkerId);
      if (m && m.items.includes(row.dataset.itemId)) row.classList.add("available");
    }
  }

  if (filter) {
    const it = state.itemsById[filter];
    statusEl.textContent = "高亮：可製造「" + it.name + "」的據點（" + locationCount(filter) + " 處）";
  } else {
    statusEl.textContent = "點擊左側兵裝可高亮對應據點，點擊據點查看兵裝與材料";
  }
}

function showPopup(marker) {
  const canCraft = state.items.filter((it) => marker.items.includes(it.id));

  popup.innerHTML = "";

  const head = document.createElement("div");
  head.className = "popup-head";
  const nameEl = document.createElement("div");
  nameEl.className = "name";
  nameEl.textContent = marker.name;
  const closeBtn = document.createElement("button");
  closeBtn.className = "popup-close";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearSelection();
  });
  head.appendChild(nameEl);
  head.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "popup-body";
  const sub = document.createElement("div");
  sub.className = "popup-sub";
  sub.textContent = canCraft.length
    ? "此據點可製造 " + canCraft.length + " 種兵裝："
    : "此據點目前尚無兵裝資料";
  body.appendChild(sub);

  for (const it of canCraft) {
    const row = document.createElement("div");
    row.className = "popup-item";

    const row1 = document.createElement("div");
    row1.className = "row1";
    const iname = document.createElement("div");
    iname.className = "iname";
    iname.textContent = "兵裝 " + it.id + " · " + it.name;
    const count = document.createElement("div");
    count.className = "mat-count";
    count.textContent = "材料 " + Object.keys(it.materials).length + " 種";
    row1.appendChild(iname);
    row1.appendChild(count);

    const mats = document.createElement("div");
    mats.className = "materials";
    for (const [mat, qty] of Object.entries(it.materials)) {
      const chip = document.createElement("span");
      chip.className = "mat-chip mat-" + mat;
      chip.textContent = mat + " ×" + qty;
      mats.appendChild(chip);
    }

    row.appendChild(row1);
    row.appendChild(mats);
    row.addEventListener("click", (e) => {
      e.stopPropagation();
      setFilter(it.id);
    });
    body.appendChild(row);
  }

  popup.appendChild(head);
  popup.appendChild(body);
  popup.classList.remove("hidden");
  positionPopup(marker);
}

function hidePopup() {
  popup.classList.add("hidden");
}

function positionPopup(marker) {
  const rect = mapWrap.getBoundingClientRect();
  const x = (marker.x / 100) * rect.width;
  const y = (marker.y / 100) * rect.height;
  const pw = popup.offsetWidth;
  const ph = popup.offsetHeight;

  let left = x + 24;
  let top = y - ph - 10;
  if (left + pw > rect.width - 10) left = x - pw - 24;
  if (left < 10) left = 10;
  if (top < 10) top = y + 26;
  popup.style.left = left + "px";
  popup.style.top = top + "px";
}

mapWrap.addEventListener("click", (e) => {
  if (e.target === mapWrap || e.target.id === "mapImg") {
    clearSelection();
  }
});

resetBtn.addEventListener("click", () => {
  clearSelection();
  clearFilter();
});

window.addEventListener("resize", () => {
  if (state.selectedMarkerId) {
    const m = state.markers.find((x) => x.id === state.selectedMarkerId);
    if (m) positionPopup(m);
  }
});
