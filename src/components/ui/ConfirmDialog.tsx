import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  extraAction?: { label: string; onClick: () => void }
}

/** Every destructive action in the app (remove from library, delete list,
 * clear local data, replace on import) routes through this so nothing
 * one-clicks its way to permanent data loss. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Onayla',
  cancelLabel = 'Vazgeç',
  destructive = true,
  onConfirm,
  extraAction,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          {extraAction && (
            <Button variant="outline" onClick={extraAction.onClick}>
              {extraAction.label}
            </Button>
          )}
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}
