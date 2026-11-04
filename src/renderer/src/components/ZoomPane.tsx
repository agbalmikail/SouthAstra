import { useCallback, useEffect, useRef, useState } from 'react'
import { isMac } from '../platform'

/**
 * Orta alan için yakınlaştırma: trackpad sıkıştırma veya ⌘/Ctrl + tekerlek ile yakınlaş,
 * sürükleyerek kaydır, çift tıkla sığdır. Sürükleme sonrası tıklama (gezegen seçimi) tetiklenmez.
 */
export default function ZoomPane({ children, resetKey }: { children: React.ReactNode; resetKey?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [z, setZ] = useState({ s: 1, x: 0, y: 0 })
  const drag = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)

  useEffect(() => { setZ({ s: 1, x: 0, y: 0 }) }, [resetKey])

  const clampPan = useCallback((s: number, x: number, y: number) => {
    const el = box.current
    if (!el || s <= 1) return { s: Math.max(1, s), x: 0, y: 0 }
    const w = el.clientWidth
    const h = el.clientHeight
    const mx = ((s - 1) * w) / 2
    const my = ((s - 1) * h) / 2
    return { s, x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) }
  }, [])

  /** (cx, cy) kutu merkezine göre noktayı sabit tutarak yakınlaştır */
  const zoomAt = useCallback((factor: number, cx = 0, cy = 0) => {
    setZ((p) => {
      const s = Math.max(1, Math.min(8, p.s * factor))
      const k = s / p.s
      return clampPan(s, cx - (cx - p.x) * k, cy - (cy - p.y) * k)
    })
  }, [clampPan])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const r = el.getBoundingClientRect()
      const cx = e.clientX - r.left - r.width / 2
      const cy = e.clientY - r.top - r.height / 2
      if (e.ctrlKey || e.metaKey) {
        // trackpad sıkıştırma Chromium'da ctrlKey'li tekerlek olayı olarak gelir
        e.preventDefault()
        zoomAt(Math.exp(-e.deltaY * 0.01), cx, cy)
      } else {
        setZ((p) => {
          if (p.s <= 1) return p
          e.preventDefault()
          return clampPan(p.s, p.x - e.deltaX, p.y - e.deltaY)
        })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt, clampPan])

  const onPointerDown = (e: React.PointerEvent) => {
    if (z.s <= 1 || e.button !== 0) return
    drag.current = { px: e.clientX, py: e.clientY, x: z.x, y: z.y, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.px
    const dy = e.clientY - d.py
    if (!d.moved && Math.hypot(dx, dy) > 4) { d.moved = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) }
    if (d.moved) setZ((p) => clampPan(p.s, d.x + dx, d.y + dy))
  }
  const onPointerUp = () => {
    if (drag.current?.moved) suppressClick.current = true
    drag.current = null
  }

  const pct = Math.round(z.s * 100)
  return (
    <div
      ref={box}
      className={z.s > 1 ? 'zoom-pane zoomed' : 'zoom-pane'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(e) => { if (suppressClick.current) { e.stopPropagation(); e.preventDefault(); suppressClick.current = false } }}
      onDoubleClick={(e) => { if ((e.target as Element).closest('.zoom-ctrl')) return; setZ({ s: 1, x: 0, y: 0 }) }}
    >
      <div className="zoom-inner" style={{ transform: `translate(${z.x}px, ${z.y}px) scale(${z.s})` }}>{children}</div>
      <div className="zoom-ctrl" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => zoomAt(1 / 1.25)} disabled={z.s <= 1} title="Uzaklaştır">−</button>
        <button className="pct" onClick={() => setZ({ s: 1, x: 0, y: 0 })} title="Sığdır (çift tıklama da sığdırır)">{pct}%</button>
        <button onClick={() => zoomAt(1.25)} disabled={z.s >= 8} title={isMac ? "Yakınlaştır (⌘ + tekerlek veya trackpad'de sıkıştırma)" : 'Yakınlaştır (Ctrl + tekerlek)'}>+</button>
      </div>
    </div>
  )
}
