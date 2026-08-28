import { useEffect, useRef } from "react";
import { useAppDispatch } from "../app/hooks";
import { resetEditor } from "../commands/commitActions";

interface ResetDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResetDialog({ isOpen, onClose }: ResetDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  const handleConfirm = () => {
    dispatch(resetEditor());
    onClose();
  };

  return (
    <dialog ref={dialogRef} className="reset-dialog" aria-labelledby="reset-title">
      <div className="reset-dialog-content">
        <h2 id="reset-title">Reset Editor</h2>
        <p>
          Are you sure you want to reset the editor? This will permanently remove all your template edits and history from local storage.
        </p>
        <div className="reset-dialog-actions">
          <button type="button" onClick={onClose} className="cancel-button">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} className="confirm-button">
            Confirm Reset
          </button>
        </div>
      </div>
    </dialog>
  );
}
