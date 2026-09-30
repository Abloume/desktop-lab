# Lesson 04 · 打包分发与自动更新

> 自查表述速记。demo 对应位置：`src/main.ts`（环境差异/asar 读取/更新骨架）、`electron-builder.yml`（配置资产）。

## 一句话结论

**asar 是应用资源归档（类似 tar，不是加密）；构建工具二选一——electron-builder（配置全、生态成熟）或 electron-forge（官方、插件化）；发布前必须签名：macOS = Developer ID 签名 + 公证 + staple，Windows = 代码签名证书；自动更新两条路——官方 autoUpdater 或 electron-updater，前提是已签名。**

## asar（Q7 ①）

| 维度 | 说明 |
| --- | --- |
| 是什么 | 归档格式（类似 tar，不解压可读内部文件），把整个 app 目录打成一个 `app.asar` |
| 好处 | 文件数骤减（IO 快）、路径集中、防误改源码 |
| ⚠️ 不是加密 | 资源可被提取（`npx asar extract` 即可），**机密别放 asar** |
| 代码无感 | Electron 透明映射：`fs.readFileSync` / `path.join` 打包前后写法一致（demo ②验证） |

## 构建工具（Q7 ②）

| | electron-builder | electron-forge |
| --- | --- | --- |
| 定位 | 配置化工具（yml/json 配置） | **Electron 官方**脚手架/工程化框架 |
| 特点 | 全平台 target（dmg/nsis/AppImage/deb）、文档多、生态成熟 | 插件系统（makers/publishers）、模板支持 vite/webpack、更现代 |
| 自动更新 | 配套 `electron-updater` | 官方 `autoUpdater` 路线 |
| 一句话 | 配置多而全，社区首选 | 官方推荐方向，工程化更强 |

## 签名与公证（Q7 ③）

**macOS（四步缺一不可）**：Developer ID 证书**签名** → hardened runtime + entitlements → `notarytool` 提交 Apple **公证**（云端扫描恶意代码）→ 公证票据 **staple** 进包。否则 Gatekeeper 拦截用户安装。

**Windows**：代码签名证书（EV 更贵但 SmartScreen 信任度更高 / OV）→ SignTool 或 builder 内置签名 → 降低 SmartScreen 拦截。

## 自动更新（Q7 ④）

| 方案 | 归属 | 能力 |
| --- | --- | --- |
| 官方 `autoUpdater` | Electron 内置 | 基础更新；需自建服务或 Squirrel |
| `electron-updater` | electron-builder 配套 | **差分更新**、发布源配置、更常用 |

流程骨架：`checkForUpdates` → `update-available` → 下载 → `update-downloaded` → `quitAndInstall()`。
⚠️ **签名是前提**：未签名无法自动更新（更新校验信任链）。

### 选型：官方 autoUpdater vs electron-updater

| 维度 | 官方 `autoUpdater` | `electron-updater` |
| --- | --- | --- |
| 归属 | Electron 内置，零依赖 | electron-builder 配套（第三方，社区主流） |
| 开箱程度 | 低层 API：下载/校验/安装/退出流程基本自己写 | 开箱即用：自动下载、校验、安装、退出提示 |
| 差分更新 | 无 | ✅ blockmap 增量，省流量 |
| 发布源 | 官方 `update.electronjs.org`（仅**公开 GitHub 仓库** + 部分平台）或自建 | generic（任意静态服务器/内网）/ GitHub / S3 等 |
| 配套 | electron-forge / 自建 Squirrel 流程 | electron-builder 打包链 |

决策规则：
1. **electron-builder 打包** → 用 `electron-updater`（publish 段一行配置）
2. **electron-forge / 已有 Squirrel 基建** → 官方 `autoUpdater`
3. **应用公开在 GitHub、想零成本** → 官方 `autoUpdater` + `update.electronjs.org`
4. **私有/内网/商业应用**（大多数生产场景）→ `electron-updater` + generic 自建发布源

一句话：**electron-updater 不是官方方案的替代，而是它的生产化封装（底层也基于 Electron 的 autoUpdater 机制）；选谁取决于「打包工具 + 发布渠道」。**

### 发布源与 S3 是什么

- **S3 = AWS 的对象存储（云存储）**：可理解为「云上的大网盘/文件夹」，文件有公开 URL；
- electron-updater 语境：**S3 地址 = 更新包的托管位置**，应用启动时从该 URL 拉取更新；
- 配置：`provider: s3` + `bucket`（桶，一级文件夹）+ `region`（区域），实际地址形如 `https://<bucket>.s3.<region>.amazonaws.com/latest-mac.yml`；
- **国内替代**：阿里云 OSS、腾讯云 COS、七牛云（同为对象存储，S3 在国内访问不稳定），通常配 `provider: generic` + 云存储公开 URL；
- **generic = 任意静态服务器/内网地址**，最通用的发布源，私有分发首选。

## 自查题 + 参考表述（demo 对应位置）

**Q7：asar / 构建工具 / 签名公证 / 自动更新？** → `main.ts` 各处 + `electron-builder.yml`
> "asar 是归档格式，把应用打成单文件，不是加密。构建工具有两套：electron-builder 配置化、生态成熟；electron-forge 是官方脚手架、插件化更现代。发布前 macOS 要 Developer ID 签名加 notarytool 公证加 staple，Windows 要代码签名证书，都是防 Gatekeeper/SmartScreen 拦。自动更新用 electron-updater（builder 配套，支持差分）或官方 autoUpdater，前提是应用已签名。"

## 坑清单（自查易错点）

- ❌ 把密钥/机密放 asar——可提取
- ❌ 忘了公证（只签名不公证）——macOS Gatekeeper 照样拦
- ❌ 未签名就想自动更新——更新链路直接失败
- ❌ `isPackaged` 判断写错方向——开发/打包逻辑分叉
- ⚠️ entitlements 与 hardened runtime 不匹配——签名后启动崩溃（沙箱/权限被禁）
- ⚠️ Windows 未签名 + SmartScreen——用户下载后大量拦截告警
