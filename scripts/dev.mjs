// Geliştirme modu: arayüz değişiklikleri anında yansır, ana süreç değişince uygulama kendini yeniden başlatır.
// Bazı editörlerin terminali ELECTRON_RUN_AS_NODE tanımlar; bu, Electron'u düz Node gibi çalıştırır. Kaldırıyoruz.
import { spawn } from 'node:child_process'

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
const child = spawn('npx', ['electron-vite', 'dev', '--watch'], { stdio: 'inherit', env, shell: process.platform === 'win32' })
child.on('exit', (code) => process.exit(code ?? 0))
