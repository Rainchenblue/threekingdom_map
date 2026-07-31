# 三國兵裝據點地圖

互動式網頁：一張地圖上放置可點擊的據點標點，點擊後顯示該處可製造的兵裝與所需材料；左側（桌面版）或上方（手機版）的兵裝清單，點擊後會在地圖上高亮所有能製造該兵裝的據點。

## 在本機預覽

用任何靜態伺服器開啟即可（瀏覽器直接開 `index.html` 時 `fetch` 會被擋，建議用伺服器）：

```sh
python3 -m http.server 8000
```

然後瀏覽器開 `http://localhost:8000`。

## 修改資料

全部資料都在 `data/` 資料夾，不需要動程式碼。

### 兵裝：`data/items.json`

```json
{ "id": "a", "name": "環首刀", "materials": { "鐵": 500, "皮": 500 } }
```

- `id` 為單一英文字母（a、b、c…），與標點的 `items` 對應
- `materials` 是「材料名稱 → 數量」。材料名稱隨意，樣式（顏色）可加在 `style.css` 的 `.mat-chip.mat-材料名`

### 據點標點：`data/markers.json`

```json
{ "id": "m1", "name": "洛陽", "x": 48, "y": 52, "items": ["a", "b", "c"] }
```

- `x` / `y` 是標點在地圖上的位置，單位為百分比（0–100），左上角為 (0,0)
- `items` 列出該據點可製造的兵裝 id

### 替換正式地圖

把正式地圖放到 `assets/`，改 `index.html` 中的 `<img src="assets/map.svg">`，並把 `style.css` 中 `.map-wrap` 的 `aspect-ratio` 改成新地圖的寬高比（目前為 `16 / 9`），標點座標就會保持對齊。

## 部署到 GitHub Pages

1. 把整個資料夾推到 GitHub repo
2. Repo Settings → Pages → 來源選 branch（如 `main` / root）
3. 開啟後會得到 `https://<帳號>.github.io/<repo名>/` 網址

## 互動邏輯

- 點擊兵裝清單項目 → 可製造的據點綠色高亮，其餘變暗；再點一次取消
- 點擊據點 → 彈出該處可造的兵裝與材料；點彈出視窗裡的兵裝 → 同時高亮地圖與左側清單
- 點擊地圖空白處或「重設」→ 清除選取與高亮
