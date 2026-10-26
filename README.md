# 个人工作台 · Personal Workbench

一个**本地优先（local-first）**的个人工作台。参考 [ximing/vital](https://github.com/ximing/vital)「翡翠园」设计语言，融合健康管理模块与若干移动端优点。纯静态、零依赖、零后端，数据全部保存在浏览器 `localStorage`。

> 本程序是纯前端网页应用：一份 HTML + 一份 CSS + 一份 JS，无需安装任何运行时，任意现代浏览器双击即可运行，也能像 App 一样「添加到主屏幕」装在手机上。

## 功能模块

- **今日 / 收件箱 / 线程 / 任务 / 习惯 / 复盘**：GTD 式的资料与行动管理
- **健康管理**：每日打卡、周复盘、饮食记录、运动、心情、记账、月历视图
- **提醒中心**：桌面角标、浏览器通知、ICS 日历导出
- **智能简报**：可关闭 / 规则式 / 调用大模型（内置 11 家 OpenAI 兼容服务商下拉，仅粘贴 API Key 即可）
- **主题**：浅色 / 深色，外加 6 套品牌色（翡翠 / 天青 / 暮霞 / 紫罗兰 / 暖橙 / 石墨），**整页背景随主题色变化**
- **安全**：PIN 锁、照片压缩、震动反馈

## 快速开始（电脑）

**方式一：直接打开**
1. 下载本仓库（见下方「下载」），解压
2. 双击 `index.html` 即可在默认浏览器中打开使用

**方式二：本地静态服务器**（部分浏览器在 `file://` 下会限制通知/相机，推荐用此方式）
```bash
# 进入项目目录后
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```
或任意等价静态服务器，如 `npx serve`、VS Code Live Server 等。

## 在安卓手机上使用 / 下载

本工作台是网页应用，**没有传统意义上的 .apk 安装包**，但它能在安卓上获得「接近原生 App」的体验，有两种用法：

**用法 A：直接当网页用（最简单，推荐）**
1. 用安卓手机浏览器（推荐 Chrome / Edge / 系统自带浏览器）打开部署好的网站：
   ```
   https://cxy2333355.github.io/personal-workbench/
   ```
2. 登录你的账号、数据会自动存在这台手机的浏览器里，随开随用。

**用法 B：像 App 一样「安装」到手机主屏幕（可离线、全屏、无地址栏）**
1. 在手机浏览器中打开上面的网站
2. **Chrome**：右上角 `⋮` → **「添加到主屏幕」**（Add to Home screen）→ 命名「个人工作台」→ 添加
   **Edge**：`⋯` → **「添加到主屏幕」**
   **系统浏览器**：菜单 → **「添加至 / 安装应用」**
3. 桌面会生成图标，点击即全屏打开，体验与 App 一致，且支持离线使用。

**用法 C：下载源码包到手机本地运行**
1. 在电脑或手机的 Release 页面下载 `app.js`（核心逻辑）或完整源码压缩包
2. 把 `index.html` / `styles.css` / `app.js` 三个文件放在同一目录
3. 在手机文件管理器中点击 `index.html`，选择浏览器打开即可
4. 想长期在手机上用，建议配合「用法 B」把网页安装到主屏幕。

> 提示：iPad / iPhone 同理，Safari 中点击「分享」→「添加到主屏幕」。

## 打包成安卓 APK（生成 .apk 安装包）

本仓库是网页源码，要变成可安装的 `.apk`，需要用 Android Studio 把网页「套」进一个原生 WebView 壳里。仓库已备好现成的 **Android 工程**（`android/` 目录，或 Releases 里的 `android-wrapper.zip`），照做即可：

1. 安装 [Android Studio](https://developer.android.com/studio)（首次会下载 Android SDK，约 1 GB，需要联网）。
2. 下载 Releases 里的 `android-wrapper.zip` 并解压；或 `git clone` 本仓库后进入 `android/` 目录。
3. Android Studio → **Open** → 选择解压出的 `android` 文件夹，等待 Gradle 同步完成。
4. 菜单 **Build → Build Bundle(s) / APK(s) → Build APK(s)**。
5. 编译完成后，右下角提示里点 **locate**，即可得到 `app-debug.apk`。
6. 把 `app-debug.apk` 拷到手机，允许「未知来源」安装即可使用。

> 工程说明：`app/src/main/assets/` 里放的就是 `index.html` / `styles.css` / `app.js`，APP 启动后直接加载本地网页，无需联网也能用（仅「智能简报-调用模型」和在线功能需要网络）。想更新内容，替换这三个文件重新打包即可。正式发布到应用商店前，请在 `app/build.gradle` 里设置自己的 `applicationId` 并用 **Build → Generate Signed Bundle / APK** 生成签名包。

## 下载 / Downloads

- **最新源码与 `app.js`**：见仓库右侧 **Releases**（发布）页面，每个版本都会附带 `app.js` 等文件供直接下载。
- **安卓 APK 构建工程**：Releases 中提供 `android-wrapper.zip`，下载解压后用 Android Studio 打开即可一键打包成 `.apk`（详见下方「打包成安卓 APK」）。
- **在线试用**：
  - GitHub Pages：`https://cxy2333355.github.io/personal-workbench/`
  - WorkBuddy 在线版：`https://personal-workbench-24832.app.workbuddy.host/?sharecode=KMYAYVKCJR&shareId=965f608f734c404493300a11730627d6`

## 部署（自行托管）

纯静态文件，可部署到任意静态托管平台，无需任何后端：

- **GitHub Pages**：仓库 → Settings → Pages → Source 选 `main` 分支 `/` 根目录（本仓库已开启）
- **WorkBuddy Sites / Vercel / Netlify**：直接拖入目录或连接仓库即可
- 注意：托管平台只负责「展示网页」，你的个人数据仍只存在自己浏览器里，平台看不到。

## 数据说明

- 所有数据保存在浏览器 `localStorage`，**仅存于本机，不上传任何服务器**。
- 换设备 / 清缓存 / 卸载浏览器会丢失数据，请注意备份。
- 备份方法：浏览器开发者工具 → Application → Local Storage → 导出对应键值；或导出 ICS（日历）等格式。

## 文件结构

```
personal-workbench/
├── index.html    # 入口页面
├── styles.css    # 翡翠园主题样式 + 6 套品牌色
├── app.js        # 全部应用逻辑（核心文件）
├── README.md     # 本说明
└── .gitignore
```

## 更新

1. 在本地修改代码后提交：
   ```bash
   git add -A && git commit -m "更新说明"
   git push
   ```
2. GitHub Pages 会自动重新部署，网站链接不变。
3. 如需发布带 `app.js` 的下载包，到仓库 **Releases → Draft a new release** 上传 `app.js` 等文件即可。

## 技术栈

- 原生 HTML / CSS / JavaScript，无框架、无构建步骤、无第三方依赖
- 持久化：`localStorage`
- 大模型：OpenAI 兼容 `/chat/completions` 接口

## License

MIT —— 自由使用、修改与分发。
