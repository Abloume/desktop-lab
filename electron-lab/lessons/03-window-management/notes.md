# Lesson 03 · 窗口管理

> 自查表述速记。所有结论都能在 `src/main.ts` / `src/renderer/frameless.html` 里找到对应代码。

## 一句话结论

**无边框窗口 = `frame: false` + CSS `-webkit-app-region: drag/no-drag` 自画标题栏；多窗口通信三条路——主进程转发（最常用）/ MessagePort 直连 / BroadcastChannel；父子窗口用 `parent` 选项，模态用 `modal: true`，解决「窗口关系」问题。**

## 无边框窗口（Q6 ①）

| 方案 | 写法 | 特点 |
| --- | --- | --- |
| 完全无边框 | `frame: false` | 去掉系统标题栏/边框，全部自绘；**系统按钮也没了，最小化/关闭要自实现** |
| 保留系统按钮 | `titleBarStyle: 'hidden'`（macOS） | 隐藏标题栏但保留红绿灯按钮，适合 macOS |
| Windows 变体 | `titleBarStyle: 'hidden'` + `titleBarOverlay` | Windows 下用 overlay 保留系统按钮 |

拖拽实现（`frameless.html` 的核心）：
```css
.titlebar {
  -webkit-app-region: drag;   /* 拖拽窗口 */
}
.titlebar button {
  -webkit-app-region: no-drag; /* 交互元素必须反标记，否则点不到 */
}
```
要点：**drag 区域的交互元素必须 no-drag**（按钮、输入框、滚动条），这是无边框窗口最容易踩的坑。

## 多窗口通信（Q6 ②）

| 方式 | 路径 | 适用 |
| --- | --- | --- |
| **主进程转发**（最常用） | A → ipcMain → `webContents.send` 给 B | 定向/广播、需要主进程参与的 |
| MessagePort 直连 | 主进程 `MessageChannelMain` 搭桥 → A ⇄ B 直连 | 高频、大数据（Lesson 02 已演示） |
| BroadcastChannel | 渲染进程间同源广播 | 纯前端广播，主进程不参与 |

主进程转发细节（`main.ts` 的 `broadcast`）：
- 定向：`target.webContents.send('channel', data)` 发给指定窗口；
- 广播：遍历窗口集合，跳过发送者（`w !== from`）；
- 防御：异步/遍历时先 `w.isDestroyed()` 再 send（Lesson 01 的防御点复用）。

## 父子窗口（Q6 ③）

| 选项 | 行为 | 场景 |
| --- | --- | --- |
| `parent: parentWin` | 子窗口**永远浮在父窗口之上**；随父窗口**最小化/关闭** | 工具窗、预览窗、跟随主窗口的浮层 |
| `parent` + `modal: true` | 模态：**父窗口被锁定**，不关子窗无法交互父窗口 | 设置弹窗、登录窗、确认框 |

要点：
- 父子是「窗口关系」而非数据关系；子窗口的通信仍走正常 IPC/转发；
- 模态窗口必须先关才能回父窗口，注意别在里面开死循环等待；
- macOS 上模态窗口还带窗口动画和禁用父窗口菜单行为。

## 自查题 + 参考表述（demo 对应位置）

**Q6：无边框窗口怎么拖拽？多窗口怎么通信？父子窗口什么场景？** → `main.ts` 三块 + `frameless.html`
> "无边框用 frame: false，拖拽靠 CSS -webkit-app-region: drag，交互元素必须 no-drag，而且系统按钮没了要自实现最小化关闭。多窗口通信三条路：主进程转发最常用，定向用 webContents.send、广播遍历窗口；MessagePort 直连适合高频大数据；BroadcastChannel 做纯前端广播。父子窗口用 parent 选项，子窗口浮在父之上、随父最小化关闭，适合工具窗；加 modal: true 变模态，锁定父窗口，适合设置弹窗和登录窗。"

## 坑清单（自查易错点）

- ❌ 把按钮/输入框放在 drag 区域却没标 `no-drag`——交互全部失效
- ❌ `frame: false` 后忘了自实现最小化/关闭按钮——用户无法操作窗口
- ❌ 模态窗口里异步任务没结束就关窗——注意关闭时清理（复用 isDestroyed 防御）
- ❌ 父子窗口的「父」提前销毁——子窗口会一并关闭，先确认 parent 存在
- ❌ 广播遍历时对已销毁窗口 `send`——报 "Object has been destroyed"
- ⚠️ `titleBarStyle: 'hidden'` 在不同平台的按钮行为不同，跨平台要分别验证
