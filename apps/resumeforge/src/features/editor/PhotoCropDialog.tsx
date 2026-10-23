/** Square crop with circle / rounded / square preview mask: drag or arrow keys to pan, slider / wheel / +− to zoom. OWNER: shell agent. */
import { ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { clampCrop, coverScale, cropRect, CROP_ZOOM, type CropState } from '../../lib/shell.ts'
import type { PhotoShape } from '../../lib/types.ts'
import { Button, Modal, Segmented, Slider } from '../../ui'
import { renderSquare } from './photo.ts'

const VIEW = 260
const RADIUS: Record<PhotoShape, string> = { circle: '50%', rounded: '18%', square: '4px' }

export function PhotoCropDialog({ img, src, shape: initialShape, onCancel, onSave }: { img: HTMLImageElement; src: string; shape: PhotoShape; onCancel: () => void; onSave: (dataUrl: string, shape: PhotoShape) => void }) {
  const [crop, setCrop] = useState<CropState>({ zoom: 1, x: 0, y: 0 })
  const [shape, setShape] = useState<PhotoShape>(initialShape)
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const W = img.naturalWidth
  const H = img.naturalHeight
  const update = (c: CropState) => setCrop(clampCrop(c, W, H, VIEW))
  const s = coverScale(W, H, VIEW) * crop.zoom

  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setCrop((c) => clampCrop({ ...c, zoom: c.zoom * (1 - e.deltaY * 0.002) }, W, H, VIEW))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [W, H])

  const onDown = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, cx: crop.x, cy: crop.y }
  }
  const onMove = (e: PointerEvent) => {
    const d = drag.current
    if (d) update({ ...crop, x: d.cx + e.clientX - d.x, y: d.cy + e.clientY - d.y })
  }
  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 20 : 5
    const map: Record<string, Partial<CropState>> = { ArrowLeft: { x: crop.x - step }, ArrowRight: { x: crop.x + step }, ArrowUp: { y: crop.y - step }, ArrowDown: { y: crop.y + step }, '+': { zoom: crop.zoom + 0.1 }, '=': { zoom: crop.zoom + 0.1 }, '-': { zoom: crop.zoom - 0.1 } }
    if (!map[e.key]) return
    e.preventDefault()
    update({ ...crop, ...map[e.key] })
  }

  return (
    <Modal
      open
      onClose={onCancel}
      size="sm"
      title="Crop your photo"
      description="Drag to position, zoom to frame your face. Use a recent, professional photo."
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onSave(renderSquare(img, cropRect(crop, W, H, VIEW)), shape)} data-autofocus>
            Use photo
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          ref={box}
          tabIndex={0}
          role="application"
          aria-label="Photo crop area. Arrow keys move the photo, plus and minus zoom."
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={() => (drag.current = null)}
          onKeyDown={onKey}
          className="relative mx-auto cursor-grab touch-none overflow-hidden bg-slate-900 outline-none select-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:cursor-grabbing"
          style={{ width: VIEW, height: VIEW }}
        >
          <img
            src={src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{ width: W * s, height: H * s, left: VIEW / 2 + crop.x - (W * s) / 2, top: VIEW / 2 + crop.y - (H * s) / 2 }}
          />
          <div className="rf-crop-mask pointer-events-none absolute inset-0 ring-2 ring-white/80" style={{ borderRadius: RADIUS[shape] }} />
        </div>
        <div className="flex items-center gap-2">
          <ZoomOut className="size-4 shrink-0 text-slate-400" aria-hidden />
          <Slider className="flex-1" label="Zoom" value={crop.zoom} min={CROP_ZOOM.min} max={CROP_ZOOM.max} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(zoom) => update({ ...crop, zoom })} />
          <ZoomIn className="size-4 shrink-0 text-slate-400" aria-hidden />
        </div>
        <Segmented
          label="Shape on the resume"
          value={shape}
          onChange={setShape}
          options={[
            { value: 'circle', label: 'Circle' },
            { value: 'rounded', label: 'Rounded' },
            { value: 'square', label: 'Square' },
          ]}
        />
      </div>
    </Modal>
  )
}
