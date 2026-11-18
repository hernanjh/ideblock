import { useTranslation } from 'react-i18next';
import { Modal } from '../components/Modal';

interface MessageDialogProps {
  message: string | null;
  onClose: () => void;
}

export function MessageDialog({ message, onClose }: MessageDialogProps) {
  const { t } = useTranslation();
  return (
    <Modal
      open={message !== null}
      title={t('files.problemTitle')}
      onClose={onClose}
      testId="message-dialog"
      footer={
        <button type="button" className="button--primary" onClick={onClose}>
          {t('common.ok')}
        </button>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
