"use strict";

const state = {
  items: [],
  itemsById: {},
  markers: [],
  selectedMarkerId: null,
  activeFilter: null,
  zoom: 1,
  baseW: null,
  qty: 1,
  resCheck: false,
  playerRes: { 皮: 0, 鐵: 0, 韌皮: 0, 精鐵: 0 },
};

const mapViewport = document.getElementById("mapViewport");
const mapWrap = document.getElementById("mapWrap");
const markersLayer = document.getElementById("markersLayer");
const itemList = document.getElementById("itemList");
const dpName = document.getElementById("dpName");
const dpItems = document.getElementById("dpItems");
const dpTotals = document.getElementById("dpTotals");
const dpCloseBtn = document.getElementById("dpClose");
const qtyInput = document.getElementById("qtyInput");
const resToggle = document.getElementById("resToggle");
const resInputs = {
  皮: document.getElementById("resPi"),
  鐵: document.getElementById("resTie"),
  韌皮: document.getElementById("resRen"),
  精鐵: document.getElementById("resJing"),
};
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomResetBtn = document.getElementById("zoomResetBtn");

const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

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

    loadPlayerRes();
    renderSidebar();
    renderMarkers();
    applyView();
    renderPanel();
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
  const tierRank = (it) => (typeof it.tier === "number" ? it.tier : 0);
  [...state.items]
    .sort((a, b) => {
      const ca = a.craftable === false ? 1 : 0;
      const cb = b.craftable === false ? 1 : 0;
      if (ca !== cb) return ca - cb;
      return tierRank(b) - tierRank(a);
    })
    .forEach((it) => {
      const inactive = it.craftable === false;
      const li = document.createElement("li");
      li.className = "item-row" + (inactive ? " inactive" : "");
      li.dataset.itemId = it.id;
      li.title = it.name;

      const img = document.createElement("img");
      img.className = "item-img";
      img.src = it.image;
      img.alt = it.name;
      li.appendChild(img);

      li.addEventListener("click", (e) => {
        e.stopPropagation();
        if (inactive) return;
        setFilter(it.id);
      });
      itemList.appendChild(li);
    });
}

function renderMarkers() {
  markersLayer.innerHTML = "";
  state.markers.forEach((m, idx) => {
    const div = document.createElement("div");
    div.className = "marker";
    div.dataset.markerId = m.id;
    div.style.left = m.x + "%";
    div.style.top = m.y + "%";

    const pin = document.createElement("div");
    pin.className = "pin";

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
  renderPanel();
  applyView();
}

function clearSelection() {
  state.selectedMarkerId = null;
  renderPanel();
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
    if (row.classList.contains("inactive")) continue;
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

function loadPlayerRes() {
  try {
    const saved = JSON.parse(localStorage.getItem("sanguo_player_res") || "{}");
    for (const k of Object.keys(state.playerRes)) {
      if (typeof saved[k] === "number" && saved[k] >= 0) state.playerRes[k] = saved[k];
    }
    if (typeof saved.resCheck === "boolean") state.resCheck = saved.resCheck;
  } catch (e) { /* ignore */ }
  for (const k of Object.keys(resInputs)) resInputs[k].value = state.playerRes[k];
  resToggle.checked = state.resCheck;
}

function savePlayerRes() {
  try {
    localStorage.setItem("sanguo_player_res", JSON.stringify(Object.assign({}, state.playerRes, { resCheck: state.resCheck })));
  } catch (e) { /* ignore */ }
}

function renderPanel() {
  const marker = state.markers.find((m) => m.id === state.selectedMarkerId);
  if (!marker) {
    dpName.textContent = "尚未選取據點";
    dpItems.innerHTML = '<div class="dp-empty">點擊地圖據點，查看該處可造的兵裝與所需資源</div>';
    dpTotals.innerHTML = "";
    return;
  }

  let canCraft = state.items.filter((it) => marker.items.includes(it.id));
  if (state.activeFilter) {
    canCraft = marker.items.includes(state.activeFilter)
      ? [state.itemsById[state.activeFilter]]
      : [];
  }
  const qty = state.qty;
  const checkRes = state.resCheck;
  const totals = {};

  if (canCraft.length === 0 && state.activeFilter) {
    const f = state.itemsById[state.activeFilter];
    dpName.textContent = marker.name;
    dpItems.innerHTML = '<div class="dp-empty">此據點無法製造「' + f.name + '」</div>';
    dpTotals.innerHTML = "";
    return;
  }

  dpName.textContent = marker.name + " · 可造 " + canCraft.length + " 種兵裝";
  dpItems.innerHTML = "";

  for (const it of canCraft) {
    const row = document.createElement("div");
    row.className = "dp-item";
    row.dataset.itemId = it.id;

    const row1 = document.createElement("div");
    row1.className = "row1";
    const iname = document.createElement("div");
    iname.className = "iname";
    iname.textContent = it.name;
    row1.appendChild(iname);

    const mats = document.createElement("div");
    mats.className = "materials";
    for (const [mat, q] of Object.entries(it.materials)) {
      const need = q * qty;
      totals[mat] = (totals[mat] || 0) + need;
      const chip = document.createElement("span");
      chip.className = "mat-chip mat-" + mat;
      chip.textContent = mat + " ×" + need;
      if (checkRes && (state.playerRes[mat] || 0) < need) chip.classList.add("insufficient");
      mats.appendChild(chip);
    }

    row.appendChild(row1);
    row.appendChild(mats);
    row.addEventListener("click", (e) => {
      e.stopPropagation();
      setFilter(it.id);
    });
    dpItems.appendChild(row);
  }

  dpTotals.innerHTML = "";
  for (const [mat, need] of Object.entries(totals)) {
    const chip = document.createElement("span");
    chip.className = "mat-chip mat-" + mat;
    chip.textContent = mat + " ×" + need;
    if (checkRes && (state.playerRes[mat] || 0) < need) chip.classList.add("insufficient");
    dpTotals.appendChild(chip);
  }
}

function computeBaseW() {
  mapWrap.style.width = "";
  state.baseW = mapWrap.clientWidth;
}

function applyZoom(z, keepCenter) {
  if (!state.baseW) computeBaseW();
  const prevW = state.baseW * state.zoom;
  state.zoom = Math.min(3, Math.max(0.5, z));
  const newW = state.baseW * state.zoom;

  if (keepCenter) {
    const vw = mapViewport.clientWidth;
    const vh = mapViewport.clientHeight;
    const prevH = prevW * (771 / 1122);
    const newH = newW * (771 / 1122);
    const offXBefore = Math.max(16, (vw - prevW) / 2);
    const offXAfter = Math.max(16, (vw - newW) / 2);
    const offYBefore = Math.max(16, (vh - prevH) / 2);
    const offYAfter = Math.max(16, (vh - newH) / 2);
    const u = mapViewport.scrollLeft + vw / 2 - offXBefore;
    const v = mapViewport.scrollTop + vh / 2 - offYBefore;
    mapViewport.scrollLeft = u + offXAfter - vw / 2;
    mapViewport.scrollTop = v + offYAfter - vh / 2;
  }

  mapWrap.style.width = newW + "px";
}

function resetZoom() {
  state.zoom = 1;
  computeBaseW();
  mapWrap.style.width = state.baseW + "px";
  mapViewport.scrollLeft = 0;
  mapViewport.scrollTop = 0;
}

zoomInBtn.addEventListener("click", () => applyZoom(state.zoom * 1.25, true));
zoomOutBtn.addEventListener("click", () => applyZoom(state.zoom / 1.25, true));
zoomResetBtn.addEventListener("click", resetZoom);

let dragState = null;

mapViewport.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  dragState = {
    x: e.clientX,
    y: e.clientY,
    sl: mapViewport.scrollLeft,
    st: mapViewport.scrollTop,
    moved: false,
  };
  e.preventDefault();
});

window.addEventListener("mousemove", (e) => {
  if (!dragState) return;
  const dx = e.clientX - dragState.x;
  const dy = e.clientY - dragState.y;
  if (!dragState.moved && Math.hypot(dx, dy) > 4) {
    dragState.moved = true;
    mapViewport.classList.add("dragging");
  }
  if (dragState.moved) {
    mapViewport.scrollLeft = dragState.sl - dx;
    mapViewport.scrollTop = dragState.st - dy;
  }
});

window.addEventListener("mouseup", () => {
  if (dragState && dragState.moved) {
    mapViewport.addEventListener(
      "click",
      (ev) => {
        ev.stopImmediatePropagation();
        ev.preventDefault();
      },
      { capture: true, once: true }
    );
  }
  if (dragState) mapViewport.classList.remove("dragging");
  dragState = null;
});

mapViewport.addEventListener("scroll", () => {});

mapWrap.addEventListener("click", (e) => {
  if (e.target === mapWrap || e.target.id === "mapImg") {
    clearSelection();
  }
});

resetBtn.addEventListener("click", () => {
  clearSelection();
  clearFilter();
});

dpCloseBtn.addEventListener("click", () => {
  clearSelection();
});

qtyInput.addEventListener("input", () => {
  let v = parseInt(qtyInput.value, 10);
  if (isNaN(v) || v < 1) v = 1;
  state.qty = v;
  qtyInput.value = v;
  renderPanel();
});

resToggle.addEventListener("change", () => {
  state.resCheck = resToggle.checked;
  savePlayerRes();
  renderPanel();
});

for (const [mat, el] of Object.entries(resInputs)) {
  el.addEventListener("input", () => {
    let v = parseInt(el.value, 10);
    if (isNaN(v) || v < 0) v = 0;
    state.playerRes[mat] = v;
    savePlayerRes();
    renderPanel();
  });
}

window.addEventListener("resize", () => {
  if (isMobile()) return;
  computeBaseW();
  applyZoom(state.zoom, false);
});
