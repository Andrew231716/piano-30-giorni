import { useEffect, useId, useRef, useState } from 'react'
import { useAppState } from '../context/AppStateContext'
import { Modal } from './Modal'

type Props = {
  className?: string
  children?: string
}

export function NewCycleConfirmButton({
  className = 'btn btn-secondary',
  children = 'Inizia un nuovo ciclo',
}: Props) {
  const { startNewCycle } = useAppState()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const busyRef = useRef(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    // Ritarda il focus sulla conferma per evitare che il click di apertura
    // “cada” sul pulsante Conferma appena montato.
    const t = window.setTimeout(() => confirmRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [open])

  const close = () => {
    if (busyRef.current) return
    setOpen(false)
  }

  const confirm = () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setOpen(false)
    startNewCycle()
    window.setTimeout(() => {
      busyRef.current = false
      setBusy(false)
    }, 400)
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        disabled={busy}
        aria-haspopup="dialog"
      >
        {children}
      </button>
      <Modal open={open} title="Nuovo ciclo" onClose={close}>
        <div role="document" aria-labelledby={titleId}>
          <h3 id={titleId} className="sr-only">
            Conferma nuovo ciclo
          </h3>
          <p className="lede">Vuoi iniziare un nuovo ciclo?</p>
          <p style={{ marginBottom: 12 }}>
            Il ciclo attuale verrà salvato nell’archivio storico. Il nuovo ciclo
            ripartirà con le misurazioni e le giornate azzerate. Potrai consultare
            i cicli precedenti nella sezione Progressi.
          </p>
          <p className="muted tiny" style={{ marginBottom: 16 }}>
            Vuoi continuare?
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={close}>
              Annulla
            </button>
            <button
              ref={confirmRef}
              type="button"
              className="btn btn-primary"
              onClick={confirm}
              disabled={busy}
            >
              Conferma
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
