/**
 * "Share a read-only link" dialog. The resume (content + design) is compressed into the URL hash
 * (lib/share.ts), so nothing is uploaded: the link *is* the resume. Shows the link, its length and a
 * warning when it gets long (photos make links huge), with copy / open / native share.
 * OWNER: io agent.
 */
import { AlertTriangle, Check, Copy, ExternalLink, Info, Share2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { formatBytes, shareLevel, SHARE_LIMITS } from '../../lib/ioHelpers.ts'
import { shareUrl } from '../../lib/share.ts'
import type { ResumeDoc } from '../../lib/types.ts'
import { toast } from '../../store'
import { Button, cn, inputClass, Modal, Toggle } from '../../ui'
import { copyText } from './download.ts'

export interface ShareDialogProps {
  open: boolean
  onClose: () => void
  doc: ResumeDoc
}

export function ShareDialog({ open, onClose, doc }: ShareDialogProps) {
  const [includePhoto, setIncludePhoto] = useState(false)
  const [copied, setCopied] = useState(false)
  const photo = doc.data.basics.photo
  const url = useMemo(
    () => (open ? shareUrl(window.location.href, { data: doc.data, design: doc.design }, { includePhoto: includePhoto && !!photo }) : ''),
    [open, doc.data, doc.design, includePhoto, photo],
  )
  const level = shareLevel(url.length)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  const copy = async () => {
    const ok = await copyText(url)
    setCopied(ok)
    toast(ok ? 'Share link copied — paste it anywhere' : 'Could not copy — select the link and copy it manually', ok ? 'success' : 'error')
  }
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Share a read-only link"
      description="Anyone with the link can view and print this resume. Nothing is uploaded — the resume is compressed into the link itself."
      footer={
        <>
          <Button variant="ghost" icon={ExternalLink} onClick={() => window.open(url, '_blank', 'noopener')}>
            Preview
          </Button>
          {canShare && (
            <Button
              icon={Share2}
              onClick={() => {
                navigator.share({ title: `${doc.data.basics.name || 'My'} resume`, url }).catch(() => undefined)
              }}
            >
              Share…
            </Button>
          )}
          <Button variant="primary" icon={copied ? Check : Copy} onClick={() => void copy()} data-autofocus>
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="rf-share-url" className="mb-1 flex items-baseline justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>Link</span>
            <span className={cn('font-mono font-normal tabular-nums', level === 'ok' ? 'text-slate-400' : 'text-amber-600 dark:text-amber-400')} data-share-length={url.length}>
              {url.length.toLocaleString()} characters
            </span>
          </label>
          <input id="rf-share-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className={cn(inputClass, 'font-mono text-xs')} spellCheck={false} />
        </div>

        <Toggle
          checked={includePhoto && !!photo}
          onChange={setIncludePhoto}
          disabled={!photo}
          label="Include photo"
          description={photo ? `Adds about ${formatBytes(Math.round(photo.length * 1.05))} to the link` : 'This resume has no photo'}
        />

        {level !== 'ok' ? (
          <div role="status" className="flex gap-2.5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/30">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <p>
              {level === 'very-long' ? (
                <>
                  <strong>This link is very long.</strong> Browsers open it fine, but email, chat and social apps often cut links longer than ~{SHARE_LIMITS.long.toLocaleString()} characters.
                  {includePhoto && photo ? ' Turn off the photo to make it much shorter, or' : ' Consider'} sending the PDF instead.
                </>
              ) : (
                <>
                  <strong>This link is fairly long.</strong> It works in browsers, but a few email and chat apps shorten long links — test it before sending, or share the PDF.
                </>
              )}
            </p>
          </div>
        ) : null}

        <p className="flex gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden />
          The link is a snapshot: later edits won’t appear. Copy a new link after you change your resume.
        </p>
      </div>
    </Modal>
  )
}
