import { useEffect, useMemo, useRef, useState } from 'react'
import { fold } from '../search'

export interface Command {
  id: string
  label: string
  group: string // Haritalar, Görünüm, Araçlar, Komutlar
  hint?: string // sağda gri (ör. tarih, kısayol)
  keywords?: string
  run: () => void
}

/** Puan: tüm sözcükler geçmeli; başta eşleşme ve sözcük başı öne */
function score(c: Command, words: string[]): number {
  const hay = fold(`${c.label} ${c.keywords ?? ''} ${c.hint ?? ''}`)
  const label = fold(c.label)
  let s = 0
  for (const w of words) {
    const i = hay.indexOf(w)
    if (i < 0) return -1
    s += label.startsWith(w) ? 30 : label.includes(' ' + w) ? 20 : i < label.length ? 10 : 2
  }
  return s
}

/** ⌘K hızlı arama: harita aç, görünüm değiştir, araç aç, komut çalıştır */
export default function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const list = useRef<HTMLUListElement>(null)
  const shown = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean)
    if (!words.length) return commands.slice(0, 60)
    return commands.map((c) => ({ c, s: score(c, words) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s).slice(0, 60).map((x) => x.c)
  }, [q, commands])
  useEffect(() => setI(0), [q])
  useEffect(() => { list.current?.querySelector('.on')?.scrollIntoView({ block: 'nearest' }) }, [i])
  const run = (c?: Command) => { if (!c) return; onClose(); c.run() }
  let lastGroup = ''
  return (
    <div className="modal-back palette-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="palette" role="dialog" aria-label="Hızlı arama">
        <input
          id="palette-q" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Harita, görünüm, araç veya komut ara…"
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); onClose() }
            else if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(shown.length - 1, x + 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)) }
            else if (e.key === 'Enter') { e.preventDefault(); run(shown[i]) }
          }}
        />
        <ul ref={list}>
          {shown.map((c, k) => {
            const head = c.group !== lastGroup ? c.group : null
            lastGroup = c.group
            return [
              head && <li key={'g' + head + k} className="pal-group">{head}</li>,
              <li key={c.id} className={k === i ? 'on' : ''} onMouseEnter={() => setI(k)} onMouseDown={(e) => { e.preventDefault(); run(c) }}>
                <span>{c.label}</span>{c.hint && <span className="muted small">{c.hint}</span>}
              </li>
            ]
          })}
          {!shown.length && <li className="muted pal-empty">Sonuç yok</li>}
        </ul>
        <div className="pal-foot muted small">↑↓ seç · Enter aç · Esc kapat</div>
      </div>
    </div>
  )
}
