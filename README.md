# 吹牛逼 · Cloudflare Pages 免费联机备用入口

## 这个项目做什么？

本仓库为已有游戏 [《吹牛逼》](https://kilemoran.github.io/chuiniubi/) 提供一个可测试的 `pages.dev` 接入入口。它**没有复制游戏后台**：Cloudflare Pages Functions 通过 **Service Binding** 把 `/health` 和 `/ws` 请求转发给原来的 `my-chuiniubi-room` Worker。因此如果能够连接成功，中国大陆和英国玩家使用的是同一个 Durable Object 房间、相同的玩家和手牌状态。

它不是保证可用的“中国优化线路”或翻墙工具；`pages.dev` 在国内的网络可用性未知，需要实际测试。语音服务仍然使用 RealtimeKit，游戏链路连通不代表语音必然连通。

## 仓库文件

```text
functions/
  health.js           # GET /health：调用原有 Worker，查询健康状态
  ws.js               # GET /ws：转发 WebSocket 升级和双向连接
  echo.js             # GET /echo：独立测试 Pages WSS
public/
  index.html          # 国内朋友打开的测试页 / 游戏启动页
  _routes.json        # 仅动态路由调用 Functions
package.json          # 本地测试（无需额外依赖）
tests/relay.test.js   # 关键路由与安全边界测试
README.md             # 本说明
```

## 一、上传到 GitHub（推荐独立仓库）

1. 打开 https://github.com/new 。
2. Owner 选 `KileMoran`，Repository name 填 `chuiniubi-relay`（若已占用可改名）。
3. 选择 Public，并点击 Create repository。
4. 解压本 ZIP，在新仓库中通过 `Add file → Upload files` 上传 **functions、public、tests 文件夹，以及根目录的 package.json、README.md**。确保文件结构与上方一致，尤其必须是 `functions/health.js`，不能把内容额外套一层文件夹。
5. 点击 Commit changes。

> 也可以把本项目作为主仓库的 `pages-relay/` 子目录，但创建 Pages 时 Root directory 必须填 `pages-relay`。

## 二、创建 Cloudflare Pages 项目

1. 登录 https://dash.cloudflare.com/ ，进入 **Workers & Pages → Create → Pages → Connect to Git**（Cloudflare 的界面文字可能略有区别）。
2. 连接已有的 GitHub 账户，选择刚创建的 `KileMoran/chuiniubi-relay` 仓库。注意：**选择 Pages 项目，不是创建另一个 Worker**。
3. Pages project name：例如 `chuiniubi-km-relay`，以控制台实际可用名称为准。建成后会获得由 Cloudflare 分配的 `https://<项目名>.pages.dev`。
4. Production branch：`main`。
5. Framework preset：`None`；Build command：留空（如果界面必须填写可用 `exit 0`）；Build output directory：`public`；Root directory：仓库根目录 `/`。
6. 点击 Save and Deploy。首次部署后主页 `/` 应可见，不过**还需要绑定 Worker 才能让 `/health` 正常返回**。

**不要使用 Pages 的 Dashboard 拖拽 ZIP Direct Upload**：Cloudflare 官方目前不支持通过该方式部署 `/functions`，会导致网页存在但代理 API 不运行。

## 三、添加 Service Binding（必需）

在新建的 **Pages 项目**里（不是 `my-chuiniubi-room` Worker）：

1. 点击 **Settings → Bindings → Add → Service binding**。
2. **Variable name** 填 `GAME`（必须完全一致，大写）。
3. **Service** 选择已经在运行的 `my-chuiniubi-room`。
4. 如果有 Environment 选项，请选择 Production；有需要也给 Preview 添加相同绑定。
5. 保存后，务必返回部署页面点击 **Retry deployment / Redeploy**，使绑定在新部署中生效。Cloudflare 官方明确要求重新部署才能生效。

不需要填写原来的 API Token，也不需要创建第二个 Durable Object，更不能把语音密钥复制进 Pages 项目。

## 四、让国内朋友测试

按顺序进行：

1. **静态网页**：在国内手机直接访问 `https://<你的实际Pages项目>.pages.dev/`。如果这个都打不开，说明备用域名没解决问题，本实验就止步于此。
2. **HTTP**：点“测试游戏服务器”，或者访问 `https://<项目名>.pages.dev/health`。应看到原 Worker 的 `ok: true`，版本 `1.1-voice`。如果是 503 且错误 `GAME_SERVICE_BINDING_MISSING`，检查第三步的 Service binding 和重新部署。
3. **WSS**：点“测试 Pages WebSocket”，页面应显示“握手及双向数据正常”。
4. **真实游戏**：输入未开局的六位房间号，点击“通过备用入口进入游戏”；或者在原游戏首页 → 高级设置中填写 `wss://<实际项目名>.pages.dev`，再加入房间。
5. 英国玩家仍可从原网址直连 `workers.dev`，双方使用同一房间号。如果同一房间号不是同一个房间，检查是否误部署了新的游戏 Worker（本方案不需要）。

⚠️ 原游戏不允许全新玩家中途加入已开始的牌局；请先让朋友进入房间，再由房主开始游戏。老玩家恢复需要原浏览器保存的身份凭证。

## 五、可能遇到的情况

| 现象 | 解释和处理 |
|---|---|
| Pages 首页打不开 | `pages.dev` 在朋友网络中不可达。本方案不适用，需要独立域名或其他网络接入。 |
| `/` 正常、`/health` 404 | Functions 没部署成功。检查仓库目录结构和 Cloudflare 构建日志。 |
| `/health` 503 GAME_SERVICE_BINDING_MISSING | 没在 Pages 项目绑定 `GAME`，或绑定后没有重新部署。 |
| `/health` 200，但 `/echo` WSS 失败 | 网络或浏览器对 WebSocket 有限制；检查 Safari/浏览器、4G/Wi-Fi 等。 |
| `/health` 和 `/echo` 均正常，但进不去房间 | 检查 Pages `GAME` 指向的 Worker、房间是否已开始、游戏中的 server 参数，以及开发者控制台的 WebSocket 错误。 |
| 页面进去但没有麦克风语音 | RealtimeKit 使用另一条网络连接，须单独测试；游戏 WebSocket 代理不会自动转发语音。 |
| `/health` 404 Use /health or /ws | 绑定到错误的 Worker 或 URL 路由错了。 |

## 六、安全与费用

- 代码**只**开放 `/health`、`/echo`、`/ws`，不是任意网址转发的开放代理。
- 游戏身份 Token 由原游戏生成，经 `/ws?...token=...` 转发。不要公开 WebSocket 完整连接 URL，特别是不要截图展示 token。
- Service Binding 调用 Worker 是 Cloudflare 内部通信；不需公开 Worker 的 API Secret。
- Pages Functions 与 Workers 存在请求额度与计费限制；几个朋友偶尔玩一般可以在免费额度下试验，但非无限免费承诺。
- 游戏网页及 Worker 的原有端点保持不变；需要退出测试时删除新 Pages 项目即可，原有游戏不受影响。

官方参考：
- https://developers.cloudflare.com/pages/functions/bindings/#service-bindings
- https://developers.cloudflare.com/pages/functions/get-started/
- https://developers.cloudflare.com/pages/configuration/monorepos/
- https://developers.cloudflare.com/workers/runtime-apis/websockets/

制作 / 维护：KyleMoran。
