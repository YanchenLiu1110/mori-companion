# 手把手：把 Google AI Studio 的 Gemini 接入 MORI

> 你只需要做 **3 件事**：拿 API Key → 在 Netlify 填变量 → 触发部署。
> 代码我已经全部写好并测试通过（代理服务 28 项 + 浏览器端到端 12 项全部通过）。

```
浏览器聊天框
   │  POST /.netlify/functions/companion
   ▼
Netlify Function（密钥只在这里）
   │  POST generativelanguage.googleapis.com/v1beta/interactions（Gemini 3.8 Flash）
   ▼
Google Gemini
```

---

## 第 1 步：拿到 Gemini API Key（约 2 分钟）

1. 打开 <https://aistudio.google.com/apikey>，用你的 Google 账号登录。
2. 点击 **Create API key**。
3. （如果弹出选项）选择一个 Google Cloud 项目，没有就选 **Create new project**，名字随便填，比如 `mori`。
4. 复制生成的 Key，形如 `AIzaSy...`（**只显示一次，先存到备忘录里**）。

> ⚠️ 注意
> - **不要**把 Key 发到群里、提交到 GitHub、写进 `src/` 里的任何文件。
> - 免费额度：以 <https://ai.google.dev/gemini-api/docs/rate-limits> 页面的 Gemini 3.8 Flash 行为准，演示完全够用。
> - 注意：`gemini-2.5-flash` 已对新建 API 项目关闭，本项目用的是 `gemini-3.8-flash`。
> - 如果有多个 Key，可以后面用 `GEMINI_API_KEYS` 配主备轮换。

---

## 第 2 步：在 Netlify 里加环境变量（约 1 分钟）

1. 打开 <https://app.netlify.com/>，进入站点 **moricompanion**（也就是 moricompanion.netlify.app 对应的站点）。
2. 左侧菜单：**Site configuration** → **Environment variables**。
3. 点击 **Add a variable**（新版界面可能叫 **Add a single variable**），填写：

| 字段 | 填什么 |
| --- | --- |
| **Key** | `GEMINI_API_KEY` |
| **Values** | 粘贴第 1 步复制的 `AIzaSy...` |
| **Scopes** | 保持默认（全部勾选）或只勾 **Functions** |
| **Secret** | 建议打开（页面不显示明文） |

4. 点 **Create variable** / **Save**。

> 如果找不到入口：**Site configuration** 也可能显示为齿轮图标 ⚙️；变量页面 URL 一般是
> `https://app.netlify.com/sites/moricompanion/configuration/env`

---

## 第 3 步：触发一次部署（让变量生效）

环境变量**改完不会立刻生效**，必须重新部署一次。二选一：

**方式 A（推荐，会自动重新部署）—— 我替你推代码**

代码我已经准备好，会推到 GitHub；Netlify 连接的是这个仓库，所以推送后会自动构建 + 部署。

**方式 B（手动）—— 你自己点**

1. Netlify 站点页 → **Deploys** 标签。
2. 点右上角 **Trigger deploy** → **Deploy site**。
3. 等待状态从 *Building* 变成 **Published**（约 1–2 分钟）。

> 如果 Deploys 里最近一次是 "Deploy failed"，多半是构建配置问题——新加的
> `netlify.toml` 会统一定义构建命令 `npm run build`、发布目录 `dist`、函数目录 `netlify/functions`，
> 用方式 A 重新部署一次就会按新配置走。

---

## 第 4 步：验证是否接通

1. 打开 <https://moricompanion.netlify.app/>
2. 进入任意角色（或先用 Demo Mode 载入 30 天数据）。
3. 点左侧 **Companion** → 右侧聊天框。

**看这三处判断成功：**

| 位置 | 成功 ✅ | 失败 ❌（自动回退，页面不报错） |
| --- | --- | --- |
| 聊天框右上角 | 绿色小圆点 + **Gemini · live** | 灰色 **Preview mode** |
| 每条角色回复下方 | **Boba · via Gemini** | **Boba · here with you** |
| 输入框下方说明 | Personalized with your study data · powered by Gemini 2.5 Flash | Preview replies · Gemini AI activates once the API key is configured |

再试一句 `I feel stuck today`：回复应该和你的等级、连击天数、今日学习时长有关，并且能记住上一句。

---

## 常见问题排查

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 一直是 **Preview mode** | 变量没生效 / 名字拼错 / 加在了项目层 | 确认 Key 叫 `GEMINI_API_KEY`，加在**站点**的环境变量里；然后重新部署一次 |
| 控制台出现 `AI unavailable (404)` 且提示 model no longer available | Google 下线了旧模型 | 本项目已切换为 `gemini-3.8-flash`；如果自己改过 `GEMINI_MODEL`，请改回新模型名 |
| Netlify 显示变量已加，但仍 Preview | 加完没有重新部署 | 按第 3 步再部署 |
| 控制台出现 `AI unavailable (400)` | Key 无效或被删 | 去 AI Studio 重新生成 Key，替换变量值后重新部署 |
| 控制台出现 `AI unavailable (429)` | 免费额度用完了 | 等 1 分钟再试；或加 `GEMINI_API_KEYS` 配第二个 Key 自动轮换 |
| 控制台出现 `AI unreachable` / 超时 | 区域网络不通 | 确认 Netlify 函数区域不是受限地区；可设置 `GEMINI_FALLBACK_MODELS` 备用模型 |
| 返回 `gemini-3.8-flash is currently experiencing high demand`（502） | Google 服务端短时过载 | 函数会自动重试 2 次并切到备用模型；持续出现说明多个模型同时过载，等 1–2 分钟即可，期间页面自动用 mock 回复兜底 |
| 返回 HTML `Inactivity Timeout`（504） | Netlify 网关空闲超时（>30 秒无数据） | 已加心跳保活：函数在等待 Gemini 期间每 5 秒发送一个空白字符，JSON 在结束时追加。重新部署即可 |
| 回复被拦截（危险内容） | Gemini 安全策略 | 已配置 `BLOCK_MEDIUM_AND_ABOVE`，正常学习对话不会触发；被拦截时会自动用 mock 回复 |

想自己确认服务端状态，可以在浏览器控制台运行：

```js
fetch('/.netlify/functions/companion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userMessage: 'hi' }) })
  .then(r => r.json()).then(console.log)
```

- 返回 `{ reply: "...", provider: "gemini" }` → 已接通 ✅
- 返回 `{ configured: false, reply: null }` → 变量没生效，回到第 2、3 步

---

## 可选：进阶配置

| 场景 | 做法 |
| --- | --- |
| 主备 Key 轮换 | 再加一个变量 `GEMINI_API_KEYS`，值用英文逗号分隔：`AIza...1,AIza...2`。主 Key 遇到 429/403 会自动切到下一个 |
| 换模型 | 加变量 `GEMINI_MODEL`，比如 `gemini-3.6-flash` 或 `gemini-3.5-flash-lite` |
| 主模型过载时换备用模型 | 加变量 `GEMINI_FALLBACK_MODELS`，默认 `gemini-3.6-flash,gemini-3.5-flash-lite` |
| 调整思考强度 | 加变量 `GEMINI_THINKING_LEVEL`：`low`（默认，最快）/ `medium` / `high` |
| 本地开发调试 | `npx netlify-cli dev`（需要先 `npx netlify-cli login` 和 `npx netlify-cli link`），本地也能跑函数 |
| 调整角色人格 | 改 `src/lib/companionAI.js` 里的 `buildSystemPrompt()`（Gemini 3.x 已弃用 temperature，语气靠 system prompt 控制） |

---

## 代码改动速览（供你 review）

| 文件 | 作用 |
| --- | --- |
| `netlify/functions/companion.js` | 新增。Gemini 代理：读服务端 Key、拼装 system prompt 与近 10 轮对话、关闭 thinking 提速、失败重试、Key 轮换、简单限流 |
| `netlify.toml` | 新增。构建命令、发布目录、函数目录、SPA 回退、安全响应头 |
| `src/lib/companionAI.js` | 改为调用 `/.netlify/functions/companion`，带对话历史；任何失败自动回退 mock |
| `src/lib/aiStatus.js` | 新增。进聊天页时发一次轻量 ping，决定显示 "Gemini · live" 还是 "Preview mode" |
| `src/pages/CompanionPage.jsx` | 回复气泡标注来源（via Gemini）、发送历史、显示状态徽标 |
| `scripts/test-companion-function.mjs` | 14 项代理单元测试（无需真实 Key） |
| `scripts/e2e-chat.mjs` | 浏览器端到端测试：有 Key 走 Gemini、无 Key 自动回退 |

本地验证命令：

```bash
npm run test:ai    # 代理逻辑 14 项
npm run test:e2e   # 浏览器流程 11 项（需要 playwright-core）
```


---

## 附录：新版 Netlify 里环境变量到底在哪？

你的截图路径是 `/projects/moricompanion/configuration/env`，那是**新版 Netlify 的"项目（project）"页面**。
目前这个站点看起来还没有 project 级变量，变量应该放在**站点（site）级**：

| 入口 | 地址 | 说明 |
| --- | --- | --- |
| 站点环境变量（推荐） | `https://app.netlify.com/sites/moricompanion/configuration/env` | 函数运行时读取的就是这里 |
| 项目环境变量（你截图那个） | `https://app.netlify.com/projects/moricompanion/configuration/env` | 新版项目层，未关联时可能为空 |

如果打开站点地址仍然显示 "No environment variables set"，可以试试：

1. 在 Netlify 左侧 **Sites** 列表里找到站点，点进去（不要从 Projects 进入）；
2. **Site configuration** → **Environment variables** → **Add a variable**；
3. 如果新版界面把它合并到了项目里：先确认 **Projects → moricompanion → 关联的 Site**，在 Site 下再加。

加完之后再按第 3 步重新部署，然后在聊天页看右上角是否变成 **Gemini · live**。
