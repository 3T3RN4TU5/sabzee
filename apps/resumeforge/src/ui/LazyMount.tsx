import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface LazyMountProps {
  /** Rendered once the placeholder scrolls near the viewport (and kept mounted afterwards). */
  children: (width: number) => ReactNode
  /** Placeholder / container class (give it a size, e.g. an aspect ratio). */
  className?: string
  /** IntersectionObserver rootMargin. */
  margin?: string
}

/**
 * Mount expensive content (live resume thumbnails) only when it is about to become visible, and
 * pass it the container's current width (tracked with a ResizeObserver).
 */
export function LazyMount({ children, className, margin = '300px' }: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(Math.floor(el.clientWidth)))
    ro.observe(el)
    setWidth(Math.floor(el.clientWidth))
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return () => ro.disconnect()
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => {
      ro.disconnect()
      io.disconnect()
    }
  }, [margin])
  return (
    <div ref={ref} className={className}>
      {visible && width > 0 ? children(width) : null}
    </div>
  )
}
