/**
 * 差分更新模拟器（Lesson 04 · 打包分发与自动更新）
 *
 * 用简化的 blockmap 机制（真实 electron-updater 的原理）演示三个场景：
 *   node simulate.mjs normal           —— 正常差分：只下载变化的块
 *   node simulate.mjs missing-blockmap —— 服务器漏传 .blockmap → 差分失败 → 回退全量
 *   node simulate.mjs mismatch-sha     —— 版本串了（换了安装包但 latest.yml 没更新）→ 校验失败 → 回退全量也失败
 *
 * 机制（与真实实现一一对应）：
 *  1. 打包时把安装包按 BLOCK_SIZE 切块，每块算 sha256 → 生成 .blockmap
 *  2. 更新时：新旧 blockmap 对比 → 找出哈希变化的块
 *  3. HTTP Range 只下载变化的块（这里用 fs 按 offset 模拟）
 *  4. 本地旧安装包 + 下载的新块拼装成完整新包
 *  5. sha512 校验（latest.yml 里声明的整体哈希）
 * 兜底：差分任一步失败 → catch → 全量下载 → 校验
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const FX = path.join(import.meta.dirname, '.fixtures')
const BLOCK_SIZE = 256 // 演示用小块（真实 NSIS 打包块更小/可配置）
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const sha512 = (buf) => crypto.createHash('sha512').update(buf).digest('hex')

function buildBlockmap(buf) {
  const blocks = []
  for (let off = 0; off < buf.length; off += BLOCK_SIZE) {
    blocks.push({ off, hash: sha256(buf.subarray(off, off + BLOCK_SIZE)) })
  }
  return { blockSize: BLOCK_SIZE, blocks, fileSha512: sha512(buf) }
}

// 生成测试数据：旧包 v1.0.0（本地）、新包 v1.1.0（服务器，仅改 3 个块模拟小版本更新）
function makeFixtures() {
  fs.mkdirSync(FX, { recursive: true })
  const oldBuf = Buffer.alloc(4096, 0x41)
  const newBuf = Buffer.from(oldBuf)
  for (const [off, byte] of [[100, 0x42], [500, 0x43], [900, 0x44]]) newBuf[off] = byte

  const oldMap = buildBlockmap(oldBuf)
  const newMap = buildBlockmap(newBuf)

  fs.writeFileSync(path.join(FX, 'app-1.0.0.exe'), oldBuf) // 本地旧安装包（差分底座）
  fs.writeFileSync(path.join(FX, 'app-1.1.0.exe'), newBuf) // 服务器新安装包
  fs.writeFileSync(path.join(FX, 'app-1.1.0.exe.blockmap'), JSON.stringify(newMap))
  fs.writeFileSync(
    path.join(FX, 'latest.yml'),
    ['version: 1.1.0', 'files:', '  - url: app-1.1.0.exe', `    sha512: ${newMap.fileSha512}`, `    size: ${newBuf.length}`].join('\n'),
  )
  return { oldBuf, newMap, total: newBuf.length }
}

// 模拟 HTTP Range 下载：从服务器文件按 offset 读指定长度
function rangeDownload(file, off, size) {
  const fd = fs.openSync(file, 'r')
  const buf = Buffer.alloc(size)
  fs.readSync(fd, buf, 0, size, off)
  fs.closeSync(fd)
  return buf
}

function readBlockmap(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8')) // 场景二：文件不存在 → ENOENT
}

// 差分核心：旧包 + 新 blockmap → 只下载变化的块 → 本地拼装 → sha512 校验
function differentialUpdate(oldBuf, newMap, newExePath, log) {
  const oldBlocks = new Set()
  for (let off = 0; off < oldBuf.length; off += BLOCK_SIZE) {
    oldBlocks.add(sha256(oldBuf.subarray(off, off + BLOCK_SIZE)))
  }
  const changed = newMap.blocks.filter((b) => !oldBlocks.has(b.hash))
  log(`对比新旧 blockmap：共 ${newMap.blocks.length} 块，${changed.length} 块发生变化`)

  const assembled = Buffer.alloc(newMap.blocks.length * BLOCK_SIZE)
  let downloaded = 0
  for (const b of newMap.blocks) {
    if (oldBlocks.has(b.hash)) {
      oldBuf.subarray(b.off, b.off + BLOCK_SIZE).copy(assembled, b.off)
    } else {
      rangeDownload(newExePath, b.off, BLOCK_SIZE).copy(assembled, b.off)
      downloaded++
    }
  }
  log(`Range 下载 ${downloaded} 块（${downloaded * BLOCK_SIZE} 字节），本地拼装完成（${assembled.length} 字节）`)

  if (sha512(assembled) !== newMap.fileSha512) {
    throw new Error(`sha512 校验失败：期望 ${newMap.fileSha512.slice(0, 12)}… 实际 ${sha512(assembled).slice(0, 12)}…`)
  }
  log('sha512 校验通过 ✅')
  return downloaded * BLOCK_SIZE
}

function fullDownload(newExePath, expectedSha512, log) {
  const buf = fs.readFileSync(newExePath)
  if (sha512(buf) !== expectedSha512) throw new Error('全量下载 sha512 校验也失败（服务器数据不一致，等运维修复）')
  log(`全量下载 ${buf.length} 字节，sha512 校验通过 ✅`)
  return buf
}

// ── 主流程：跑差分 → 失败则回退全量 ──
function run() {
  const scenario = process.argv[2] || 'normal'
  makeFixtures()
  const oldBuf = fs.readFileSync(path.join(FX, 'app-1.0.0.exe'))
  const newExe = path.join(FX, 'app-1.1.0.exe')
  const steps = []
  const log = (s) => steps.push(s)

  // 场景二：删掉 blockmap，模拟「上传时漏传」
  if (scenario === 'missing-blockmap') {
    fs.unlinkSync(path.join(FX, 'app-1.1.0.exe.blockmap'))
  }
  // 场景三：latest.yml 的 sha512 与服务器安装包不符，模拟「换包没更新 yml」（版本串了）
  if (scenario === 'mismatch-sha') {
    const newBuf = fs.readFileSync(newExe)
    const yml = path.join(FX, 'latest.yml')
    fs.writeFileSync(yml, ['version: 1.1.0', 'files:', '  - url: app-1.1.0.exe', `    sha512: ${'0'.repeat(128)}`, `    size: ${newBuf.length}`].join('\n'))
  }

  console.log(`\n===== 场景：${scenario} =====`)

  try {
    const newMap = readBlockmap(path.join(FX, 'app-1.1.0.exe.blockmap'))
    const expected = fs.readFileSync(path.join(FX, 'latest.yml'), 'utf-8').match(/sha512: (\w+)/)[1]
    newMap.fileSha512 = expected // 用 yml 声明的哈希做最终校验（场景三这里就错了）
    const bytes = differentialUpdate(oldBuf, newMap, newExe, log)
    steps.forEach((s) => console.log('  ' + s))
    console.log(`\n  ✅ 差分更新成功：只下载 ${bytes} 字节（全量 ${oldBuf.length} 字节）`)
  } catch (e) {
    steps.forEach((s) => console.log('  ' + s))
    console.log(`  ❌ 差分失败：${e.message}`)
    console.log('  ↳ 触发兜底：回退全量下载…')
    try {
      const expected = fs.readFileSync(path.join(FX, 'latest.yml'), 'utf-8').match(/sha512: (\w+)/)[1]
      fullDownload(newExe, expected, (s) => console.log('  ' + s))
    } catch (e2) {
      console.log(`  ❌ ${e2.message} → 更新流程中止（问题在服务器数据，客户端无需处理）`)
    }
  }
}

run()
