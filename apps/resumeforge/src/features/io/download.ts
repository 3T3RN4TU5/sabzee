/** Client-side downloads and clipboard. OWNER: io agent. */

/** Trigger a download of `content` (string, bytes or Blob) as `filename`. Nothing leaves the browser. */
export function downloadFile(filename: string, content: BlobPart, mime = 'text/plain;charset=utf-8'): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename, rel: 'noopener' })
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Safari starts the download asynchronously; keep the URL alive for a while.
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** Copy text to the clipboard (async Clipboard API, with a textarea fallback). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text })
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    ta.remove()
    return ok
  }
}
