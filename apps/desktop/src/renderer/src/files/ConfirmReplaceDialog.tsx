import { useTranslation } from 'react-i18next';
import { Modal } from '../components/Modal';

export type ReplaceChoice = 'save' | 'discard' | 'cancel';

interface ConfirmReplaceDialogProps {
  open: boolean;
  onChoose: (choice: ReplaceChoice) => void;
}

/** Shown before replacing a project that was edited but never saved to a folder. */
export function ConfirmReplaceDialog({ open, onChoose }: ConfirmReplaceDialogProps) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      title={t('files.unsavedTitle')}
      onClose={() => onChoose('cancel')}
      testId="confirm-replace-dialog"
      footer={
        <>
          <button type="button" onClick={() => onChoose('cancel')}>
            {t('common.cancel')}
          </button>
          <button type="button" data-testid="confirm-discard" onClick={() => onChoose('discard')}>
            {t('files.discard')}
          </button>
          <button
            type="button"
            className="button--primary"
            data-testid="confirm-save"
            onClick={() => onChoose('save')}
          >
            {t('files.saveFirst')}
          </button>
        </>
      }
    >
      <p>{t('files.unsavedBody')}</p>
    </Modal>
  );
}
