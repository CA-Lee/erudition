# Erudition MVP 規劃

## 開發守則

- **KISS**：最簡單能解決問題的方案優先
- **按需建檔**：只在真正實作該功能時才建立對應檔案，不預先建立
- **無冗餘**：不建立沒有被使用的檔案、函式、抽象層

---

## Context

打造個人化閱讀應用，核心目標是「讓使用者養成每天閱讀優質文章的習慣」。
MVP 聚焦在 **Read Later Inbox**：快速存文章、在 Inbox 管理並標記已讀。

Auth 用 **Cloudflare Access + Google SSO**，未來可能開放給少數朋友家人（≤50 人免費）。

---

## 技術選型

| 層 | 技術 |
|---|---|
| Server | Cloudflare Workers + Hono (TypeScript) |
| Auth | Cloudflare Access + Google SSO |
| Database | Cloudflare D1 (SQLite) |
| Client | Vue 3 + Vite + vite-plugin-pwa |
| State | Pinia |
| Hosting | CF Pages (client) + CF Workers (server) |
| Package manager | pnpm workspaces (monorepo) |

---

## MVP 專案結構（僅列實際要建的檔案）

```
erudition/
├── packages/
│   ├── server/
│   │   ├── src/
│   │   │   ├── index.ts           # Hono app 入口 + middleware
│   │   │   ├── middleware/
│   │   │   │   └── cf-access.ts   # CF Access JWT 驗證 + user upsert
│   │   │   ├── db/
│   │   │   │   └── schema.sql     # D1 schema
│   │   │   └── routes/
│   │   │       └── articles.ts    # 文章 CRUD
│   │   ├── wrangler.toml
│   │   └── package.json
│   └── client/
│       ├── src/
│       │   ├── main.ts
│       │   ├── App.vue
│       │   ├── api/
│       │   │   └── client.ts      # fetch wrapper
│       │   ├── stores/
│       │   │   └── articles.ts    # Pinia store
│       │   ├── components/
│       │   │   ├── AddUrlBar.vue  # 頂部 URL 輸入框
│       │   │   └── ArticleCard.vue
│       │   └── views/
│       │       └── InboxView.vue  # 唯一頁面
│       ├── public/
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

---

## Auth 架構（CF Access）

```
用戶開啟 PWA
  → CF Access 攔截（未登入）→ Google 登入
  → CF 設定 CF_Authorization cookie
  → 每次 API 請求自動帶 cookie
  → Worker cf-access.ts 驗證 JWT → 取出 email → upsert users 表
  → 將 user 注入 c.set('user', user)
```

- JWT header: `Cf-Access-Jwt-Assertion`
- JWKS: `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`
- users 表以 **email** 為業務識別鍵（非 CF sub，方便未來遷移）

---

## Database Schema（MVP 只需兩張表）

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'unread',  -- unread | read
  saved_at INTEGER NOT NULL,
  read_at INTEGER,
  UNIQUE(user_id, url)
);

CREATE INDEX idx_articles_user_status ON articles(user_id, status, saved_at DESC);
```

---

## Server API

> 所有 routes 都經過 cf-access.ts middleware

- `GET /articles` — 回傳使用者未讀文章清單
- `POST /articles` — `{ url }` → 抓 OG metadata → 存 D1
- `PATCH /articles/:id` — `{ status: "read" }` → 更新狀態
- `DELETE /articles/:id` — 刪除

---

## Client 頁面佈局

```
┌─────────────────────────┐
│  貼上 URL...  [+]        │  ← AddUrlBar（常駐頂部）
├─────────────────────────┤
│  ArticleCard            │
│  ArticleCard            │
│  ...                    │
└─────────────────────────┘
```

---

## 詳細開發 Todo

### Phase 1｜Infra 建設

- [ ] 建立根目錄 `pnpm-workspace.yaml`
- [ ] 建立根目錄 `package.json`（workspaces root）
- [ ] 建立 `tsconfig.base.json`（`strict: true`, `module: ESNext`, `moduleResolution: Bundler`）
- [ ] 建立 `.gitignore`（node_modules, .wrangler, dist）

**Server skeleton**
- [ ] 建立 `packages/server/package.json`（dependencies: `hono`；devDependencies: `wrangler`, `typescript`, `@cloudflare/workers-types`）
- [ ] 建立 `packages/server/tsconfig.json`（extends base）
- [ ] 建立 `packages/server/wrangler.toml`（name, main, compatibility_date）
- [ ] 建立 `packages/server/src/index.ts`（最小 Hono app，`GET /` 回傳 `{ ok: true }`）
- [ ] 確認 `wrangler dev` 能啟動並回應

**Client skeleton**
- [ ] 建立 `packages/client/package.json`（dependencies: `vue`, `pinia`；devDependencies: `vite`, `@vitejs/plugin-vue`, `vite-plugin-pwa`, `typescript`, `vue-tsc`）
- [ ] 建立 `packages/client/tsconfig.json`（extends base）
- [ ] 建立 `packages/client/vite.config.ts`（含 `@vitejs/plugin-vue` + `VitePWA` 基本 manifest：name, display: standalone, start_url: /）
- [ ] 建立 `packages/client/index.html`
- [ ] 建立 `packages/client/src/main.ts`（createApp + createPinia，mount `App.vue`）
- [ ] 建立 `packages/client/src/App.vue`（最小骨架 `<div>Hello</div>`）
- [ ] 確認 `vite dev` 能啟動並顯示

---

### Phase 2｜功能：Auth（登入）

**Backend**
- [ ] 建立 CF D1 database：`wrangler d1 create erudition`
- [ ] 更新 `wrangler.toml`，加入 D1 binding（`binding = "DB"`）
- [ ] 建立 `packages/server/src/db/schema.sql`（users + articles 兩張表）
- [ ] 執行 local migration：`wrangler d1 execute erudition --local --file=src/db/schema.sql`
- [ ] 建立 `packages/server/src/middleware/cf-access.ts`
  - 從 `Cf-Access-Jwt-Assertion` header 取 JWT
  - fetch CF JWKS → 驗證簽名
  - 取出 `email`
  - `INSERT OR IGNORE INTO users` → upsert
  - `c.set('user', { id, email })`
  - 失敗回傳 401
- [ ] 在 `src/index.ts` 掛上 middleware：`app.use('*', cfAccess)`
- [ ] 加 `GET /me` 回傳 `c.get('user')`，用於測試 auth 是否正常

**Frontend**
- [ ] 建立 `packages/client/src/api/client.ts`
  - `baseUrl`（dev: `http://localhost:8787`，prod: 從 `import.meta.env.VITE_API_URL` 取）
  - 封裝 `apiFetch`：自動帶 `credentials: 'include'`，非 2xx 拋錯
- [ ] 在 `App.vue` 呼叫 `GET /me`，確認 auth 流程通（local dev 可 mock，真實測試需 deploy）

---

### Phase 3｜功能：新增文章

**Backend**
- [ ] 在 `packages/server/src/routes/articles.ts` 實作 `POST /articles`
  - 接收 `{ url: string }`，驗證合法 URL
  - `fetch(url)` → 解析 OG tags（`og:title`, `og:description`, `og:image`），fallback `<title>`
  - nanoid 產生 id，INSERT INTO articles
  - 回傳新建的 article 物件
- [ ] 在 `src/index.ts` 掛上：`app.route('/articles', articlesRouter)`
- [ ] curl 測試 `POST /articles`

**Frontend**
- [ ] 在 `api/client.ts` 新增 `addArticle(url)`
- [ ] 建立 `packages/client/src/components/AddUrlBar.vue`
  - `<input type="url" placeholder="貼上 URL...">`
  - 監聽 `paste` 事件 → 自動 submit
  - 送出時 disable，完成後清空並 focus
- [ ] 建立 `packages/client/src/stores/articles.ts`
  - state: `articles: Article[]`, `loading: boolean`
  - action `addArticle(url)`：呼叫 API，成功後插入清單頂部
- [ ] 建立 `packages/client/src/views/InboxView.vue`（此時只含 AddUrlBar，清單留下一個 phase）
- [ ] 更新 `App.vue`：render `<InboxView>`
- [ ] 測試：貼上 URL → 送出成功（可 console.log 確認）

---

### Phase 4｜功能：顯示文章清單

**Backend**
- [ ] 在 `articles.ts` 實作 `GET /articles`
  - `SELECT * FROM articles WHERE user_id = ? AND status = 'unread' ORDER BY saved_at DESC`
  - 回傳 JSON 陣列
- [ ] curl 測試 `GET /articles`

**Frontend**
- [ ] 在 `api/client.ts` 新增 `getArticles()`
- [ ] 在 `articles` store 新增：
  - action `fetchArticles()`：呼叫 API，更新 state
- [ ] 建立 `packages/client/src/components/ArticleCard.vue`
  - 顯示：title（點擊新分頁開啟）、description、來源 domain、og image（若有）
- [ ] 在 `InboxView.vue` 加上：
  - `onMounted` → `store.fetchArticles()`
  - `v-for` 渲染 `<ArticleCard>`
  - 空狀態提示
- [ ] 測試：新增文章後清單出現

---

### Phase 5｜功能：標記已讀

**Backend**
- [ ] 在 `articles.ts` 實作 `PATCH /articles/:id`
  - 確認 article 屬於此 user
  - `UPDATE articles SET status = 'read', read_at = ? WHERE id = ?`
  - 回傳 204
- [ ] curl 測試

**Frontend**
- [ ] 在 `api/client.ts` 新增 `markRead(id)`
- [ ] 在 `articles` store 新增 action `markRead(id)`：呼叫 API，本地從清單移除（樂觀更新）
- [ ] 在 `ArticleCard.vue` 加「已讀」按鈕 → 呼叫 store.markRead
- [ ] 測試：點擊已讀 → 文章從清單消失

---

### Phase 6｜PWA icons + Deploy

**PWA 補完**
- [ ] 建立 PWA icons（192x192, 512x512）放 `public/`
- [ ] 在 `vite.config.ts` 補完 manifest（short_name, theme_color, icons）
- [ ] 在 `index.html` 加 apple-touch-icon、iOS viewport meta
- [ ] `vite build` 確認 build 無誤

**Deploy**
- [ ] `wrangler d1 execute erudition --file=src/db/schema.sql`（production migration）
- [ ] `wrangler deploy`
- [ ] CF Dashboard → Zero Trust → Access → 建立 Application 保護 Worker domain，加入允許的 Google 帳號
- [ ] CF Pages 連結 repo，build: `vite build`，output: `dist`，設定 `VITE_API_URL` env var
- [ ] CF Dashboard → Zero Trust → Access → 建立 Application 保護 Pages domain
- [ ] 手機 Safari → 加入主畫面 → 確認 standalone 模式
- [ ] 手機完整流程測試（新增文章 → 顯示 → 標記已讀）

---

### Phase 7｜功能：Push 通知

**Backend**
- [ ] 在 `wrangler.toml` 設定 cron trigger（每天固定時間）
- [ ] 建立 `packages/server/src/db/schema.sql` 補上 `push_subscriptions` 表，執行 migration
- [ ] 建立 `packages/server/src/routes/push.ts`：`POST /push/subscribe`（儲存 endpoint/keys）
- [ ] 在 `src/index.ts` 掛上 push router
- [ ] 建立 `packages/server/src/cron/daily-push.ts`：查詢所有訂閱 → 發送 Web Push（VAPID）
- [ ] 在 `src/index.ts` 實作 `scheduled` handler 呼叫 daily-push

**Frontend**
- [ ] 在 `api/client.ts` 新增 `subscribePush(subscription)`
- [ ] 在 `App.vue` 加「開啟推播」按鈕：呼叫 `Notification.requestPermission()` → 建立 push subscription → 送 API

---

### Phase 8｜功能：Stats Bar（deploy 後）

> 待 Phase 6 確認完整 deploy 流程 OK 後再做

**Backend**
- [ ] 補上 `reading_logs` 表（migration）
- [ ] 在 `PATCH /articles/:id`（標記已讀）裡同步 upsert reading_logs
- [ ] 建立 `GET /stats` 回傳 `{ today: number, unread: number }`

**Frontend**
- [ ] 在適當位置加 stats 顯示（位置待定）

---

### 後續迭代（暫不做）

- RSS 訂閱
- Mobile Share Target API
- 全文抓取 / Reader Mode
- Streak
- Twitter/X 整合
- 全文抓取 / Reader Mode
- Streak / 閱讀統計頁面
- Twitter/X 整合
- 文章標籤
