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
