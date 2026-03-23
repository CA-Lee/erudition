# Erudition — Software Design Document

## Vision

用高品質閱讀取代社群媒體的無意識滑動。

Erudition 是一個輕巧的個人閱讀佇列 app。解決的問題：在網路上看到好文章，卻因為當下沒時間而錯過。用記事本存網址，但網址看不出內容、未讀已讀混在一起、沒有動力打開來讀。

核心循環：**存 → 讀 → 累積** —— 最小阻力存文章、舒適地閱讀、透過數據與通知培養習慣。

### Goals

- **最小阻力存文章** — 貼上 URL，一步完成，自動擷取文章資訊
- **清晰的閱讀佇列** — 未讀、已讀、收藏分明，不混雜
- **培養閱讀習慣** — 數據紀錄 + 克制的推播通知

### Non-goals

- Social features（分享、留言、排行榜）
- In-app reader（MVP 階段，開外部瀏覽器）
- 複雜功能（highlight、多標籤、資料夾）
- 刪除功能（已讀即封存，不需移除）

### Audience

目前為個人使用。架構上預留多用戶能力（每筆資料綁 user_id），未來可能開放給其他人。

---

## Authentication

Identity 由 **Cloudflare Access** 提供，app 本身不處理密碼或 session。

```
使用者打開 PWA
  → Cloudflare Access 在 edge 攔截
  → Google SSO 登入
  → CF Access 設定 JWT cookie/header
  → 每個 API request 自動攜帶 JWT（credentials: 'include'）
  → Server middleware 驗證 JWT（JWKS endpoint）
  → 首次造訪時 upsert user 到 D1
  → Email + user object 注入 request context
```

### User

| Field | Type | Notes |
|---|---|---|
| `id` | TEXT (UUID) | Primary key，JWT subject |
| `email` | TEXT UNIQUE NOT NULL | Business key |
| `created_at` | TIMESTAMP NOT NULL | |

| Method | Route | Description |
|---|---|---|
| GET | `/api/me` | 回傳當前登入用戶 |

---

## Article

核心 domain。一篇文章屬於一位用戶，狀態透過 tag 系統管理。

### Data Model

**articles**

| Field | Type | Notes |
|---|---|---|
| `id` | TEXT (UUID) | Primary key |
| `user_id` | TEXT (UUID) NOT NULL | → users.id |
| `url` | TEXT NOT NULL | 原始文章網址 |
| `title` | TEXT | 來自 OG metadata，可能為空 |
| `description` | TEXT | 來自 OG metadata，可能為空 |
| `og_image_url` | TEXT | 儲存於 R2 的圖片路徑（非原始 URL） |
| `created_at` | TIMESTAMP NOT NULL | |

**tags**

| Field | Type | Notes |
|---|---|---|
| `id` | TEXT (UUID) | Primary key |
| `user_id` | TEXT (UUID) NOT NULL | → users.id |
| `name` | TEXT NOT NULL | 受控詞彙 |
| `created_at` | TIMESTAMP NOT NULL | |
| | UNIQUE | (user_id, name) |

初始詞彙：
- **`read`** — 已讀，等同封存。不是刪除，隨時可回頭找
- **`starred`** — 收藏，代表高品質、值得分享的文章

新增 tag type 須透過 migration 寫入（seed data），不由 app runtime 動態建立。

**article_tags**（junction table）

| Field | Type | Notes |
|---|---|---|
| `article_id` | TEXT (UUID) NOT NULL | → articles.id |
| `tag_id` | TEXT (UUID) NOT NULL | → tags.id |
| `created_at` | TIMESTAMP NOT NULL | |
| | PRIMARY KEY | (article_id, tag_id) |

### API

| Method | Route | Description |
|---|---|---|
| GET | `/api/articles` | 列出文章，支援 filter（unread / read / starred）及排序（created_at asc/desc，預設 desc） |
| POST | `/api/articles` | 儲存文章，非同步擷取 OG metadata |
| PUT | `/api/articles/:id/tags/:tag` | 加上 tag |
| DELETE | `/api/articles/:id/tags/:tag` | 移除 tag |

### 存文章流程

1. 使用者貼上 URL，送出
2. Server 立即建立文章記錄（title/description/og_image 暫空）
3. 非同步觸發 OG metadata 擷取
4. 擷取成功 → 更新 title、description，下載 og:image 存至 R2，寫入 og_image_url
5. 擷取失敗 → 文章保留，title fallback 為 URL，使用者仍可閱讀

### 閱讀流程

1. 使用者在未讀清單點擊文章
2. 開啟瀏覽器新分頁（或 in-app browser）前往原始 URL
3. 使用者自行回到 app
4. 操作：標記已讀、標記收藏（或兩者）

---

## OG Metadata Fetcher

獨立模組，負責從 URL 擷取 Open Graph metadata（title、description、image）。

### 設計原則

- **漸進增強** — 網頁格式千變萬化，不可能一次解完。模組會隨實際案例持續演化
- **永遠有 fallback** — 擷取失敗不阻擋文章儲存。最差情況：使用者看到的是 URL 本身
- **圖片自行儲存** — og:image 下載後存至 Cloudflare R2，避免外部圖片失效或被擋

### Fallback 策略

1. 嘗試擷取 OG tags
2. OG tags 不存在 → 嘗試 `<title>` + `<meta name="description">`
3. 以上皆失敗 → title 使用 URL，description 為空

---

## Reading Stats（閱讀統計）

追蹤三個指標，用於培養習慣的正向回饋：

| Metric | Definition |
|---|---|
| **連續閱讀天數** | 從今天往回算，連續幾天有標記至少一篇為已讀 |
| **累積閱讀天數** | 歷史上總共有幾天有閱讀紀錄 |
| **累積閱讀篇數** | 歷史上總共標記已讀的文章數 |

統計基於 article 的 is_read 狀態變化推導，不需額外 table。

---

## Notifications（推播通知）

目標：用克制的通知把使用者拉回 app，取代社群媒體的吸引力。

### 設計原則

- **克制** — 一天約兩次，不造成通知疲乏
- **有效性導向** — 如果通知經常未被點開，代表頻率太高或方式需要調整
- **語氣：鼓勵與勸誘**，不是催促或施壓
- **情境感知** — 晚上的通知檢查今日是否已閱讀，未閱讀則使用不同的鼓勵文案

### 通知時機（初始規則，根據使用情況迭代）

| 時段 | 條件 | 語氣 |
|---|---|---|
| 日間（如午後） | 無條件 | 輕推：你有 N 篇文章等著你 |
| 晚間（如 21:00） | 今日已讀 ≥ 1 | 正面肯定：今天讀了 N 篇，很棒 |
| 晚間（如 21:00） | 今日未讀 | 溫和勸誘：今天還沒讀，來一篇吧 |

---

## Frontend

### Technology

Vue 3（Composition API）+ TypeScript，PWA，Vue Router（history mode）。

### Views

| Path | View | Description |
|---|---|---|
| `/` | Inbox | 未讀文章佇列（主操作面） |
| sidebar / 子頁 | Archive | 已讀文章清單，可搜尋 |
| sidebar / 子頁 | Starred | 收藏文章清單，可搜尋 |

Inbox 是使用者每次打開 app 看到的畫面，權重最高。Archive 與 Starred 不需要在 UI 最高層級，可放在 sidebar 或較深的導航位置。

### Inbox

```
Inbox
├── AddUrlBar         URL input + 儲存
└── ArticleCard[]     文章卡片（title, og:image, description）
    ├── [點擊]        開新分頁閱讀
    ├── [Mark Read]   PUT /articles/:id/tags/read
    └── [Star]        PUT /articles/:id/tags/starred
```

排序：按 created_at，雙向切換，預設新 → 舊。

### Design Tokens

```
text:       #28282d
background: #f0eee9
primary:    #897569
secondary:  #dac29b
accent:     #eacd7e
```

調性：極簡、舒適的暖白 / 米色系，閱讀友善。

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Backend runtime | Cloudflare Workers | Serverless，免運維，edge 部署 |
| Backend framework | Hono | 輕量，CF Workers 原生支援 |
| Database | Cloudflare D1 (SQLite) | Serverless DB，與 Workers 同生態系 |
| Object storage | Cloudflare R2 | 存 og:image，避免外部圖片失效 |
| Auth | Cloudflare Access + Google SSO | Edge-level 認證，app 不碰密碼 |
| Frontend | Vue 3 + TypeScript + Vite | 熟悉的技術棧，快速開發 |
| API layer | 考慮加入 tRPC | Type-safe API，減少前後端 contract 維護成本 |

---

## Design Principles

- **Schema 由 migrations 管理** — 所有 DB schema 變更透過 migration 檔案執行，不手動修改 database。確保 local 與 production 環境一致且可重現
- **KISS** — 最簡單能解決問題的方案優先，不做預防性抽象
- **Release early** — 先給自己用，有用才有迭代的想法
- **按需建檔** — 只在實作功能時才建立對應檔案
- **無冗餘** — 不留沒有被使用的程式碼、函式、抽象層
