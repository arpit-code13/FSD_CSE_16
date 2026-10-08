import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

export default function ConfirmDialog({ title, message, confirmLabel, cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) {
  return (
    <Modal title={title} hideTitle onClose={onCancel} className="max-w-md rounded-2xl border border-line p-6">
      <div className="flex gap-4">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-accent'}`}>
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{message}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn btn-secondary" onClick={onCancel} data-autofocus>
          {cancelLabel}
        </button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
