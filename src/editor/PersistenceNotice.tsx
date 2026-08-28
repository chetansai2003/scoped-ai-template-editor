import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { setPersistenceNotice } from "../store/editorUISlice";
import { selectPersistenceNotice } from "../store/selectors";

export function PersistenceNotice() {
  const dispatch = useAppDispatch();
  const notice = useAppSelector(selectPersistenceNotice);

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => {
        dispatch(setPersistenceNotice(null));
      }, 5000); // Hide after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [notice, dispatch]);

  if (!notice) return null;

  return (
    <div className="persistence-notice" role="alert" aria-live="polite">
      {notice}
      <button 
        type="button" 
        onClick={() => dispatch(setPersistenceNotice(null))}
        aria-label="Dismiss notice"
      >
        &times;
      </button>
    </div>
  );
}
