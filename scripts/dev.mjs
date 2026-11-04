// Geliştirme modu: arayüz değişiklikleri anında yansır, ana süreç değişince uygulama kendini yeniden başlatır.
// Bazı editörlerin terminali ELECTRON_RUN_AS_NODE tanımlar; bu, Electron'u düz Node gibi çalıştırır. Kaldırıyoruz.
// Ctrl+C: electron-vite ve açtığı Electron penceresi dahil bütün süreç grubunu kapatır.
import { spawn, execSync } from 'node:child_process'

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
const win = process.platform === 'win32'
// Mac/Linux: ayrı süreç grubu; kapatırken grubun tamamına sinyal gönderilir
const child = spawn('npx', ['electron-vite', 'dev', '--watch'], { stdio: 'inherit', env, shell: win, detached: !win })

let stopping = false
function stop() {
  if (stopping) return
  stopping = true
  console.log('\nSouthAstra geliştirme modu kapatılıyor…')
  try {
    if (win) execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' })
    else process.kill(-child.pid, 'SIGTERM')
  } catch (e) { console.error("kapatma:", e.message) }
  // kapanmazsa 3 sn sonra zorla
  setTimeout(() => { try { if (!win) process.kill(-child.pid, 'SIGKILL') } catch { /* yok */ } process.exit(0) }, 3000).unref()
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
process.on('SIGHUP', stop)
child.on('exit', (code) => process.exit(stopping ? 0 : code ?? 0))
