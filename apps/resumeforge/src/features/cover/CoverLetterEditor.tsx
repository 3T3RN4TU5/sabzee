/**
 * Cover letter editor ("Cover letter" side-panel tab). The preview pane shows <CoverLetterDocument>
 * while this panel is active. OWNER: cover agent (working baseline).
 */
import { Wand2 } from 'lucide-react'
import { LETTER_STARTERS, starterLetter } from '../../lib/coverLetter.ts'
import { resumeActions, useActiveDoc } from '../../store'
import { Button, TextArea, TextField } from '../../ui'

export function CoverLetterEditor() {
  const doc = useActiveDoc()
  if (!doc) return null
  const l = doc.coverLetter
  const set = resumeActions.updateCoverLetter
  return (
    <div className="space-y-5 p-4 sm:p-5">
      <div className="rounded-xl bg-indigo-50 p-4 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:ring-indigo-500/20">
        <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Start from a template</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {LETTER_STARTERS.map((s) => (
            <Button key={s.id} size="xs" icon={Wand2} title={s.description} onClick={() => set(starterLetter(s.id, doc.data, l), null)}>
              {s.name}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Company" value={l.company} onValue={(v) => set({ company: v })} placeholder="Acme Corp" />
        <TextField label="Role" value={l.role} onValue={(v) => set({ role: v })} placeholder="Frontend Engineer" />
        <TextField label="Recipient" value={l.recipient} onValue={(v) => set({ recipient: v })} placeholder="Priya Sharma" />
        <TextField label="Recipient title" value={l.recipientTitle} onValue={(v) => set({ recipientTitle: v })} placeholder="Engineering Manager" />
        <TextField label="Date" type="date" value={l.date} onValue={(v) => set({ date: v })} />
        <TextField label="Address (optional)" value={l.address} onValue={(v) => set({ address: v })} />
      </div>
      <TextField label="Greeting" value={l.greeting} onValue={(v) => set({ greeting: v })} placeholder="Dear Hiring Manager," />
      <TextArea label="Letter" hint="Separate paragraphs with a blank line. **bold** and *italic* work." rows={14} value={l.body} onValue={(v) => set({ body: v })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Closing" value={l.closing} onValue={(v) => set({ closing: v })} placeholder="Sincerely," />
        <TextField label="Signature" value={l.signature} onValue={(v) => set({ signature: v })} placeholder={doc.data.basics.name} />
      </div>
    </div>
  )
}
