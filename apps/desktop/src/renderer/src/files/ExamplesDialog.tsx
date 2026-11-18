import type { ExampleSummary } from '@ideblock/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../components/Modal';

interface ExamplesDialogProps {
  open: boolean;
  onClose: () => void;
  onChoose: (id: string) => void;
}

export function ExamplesDialog({ open, onClose, onChoose }: ExamplesDialogProps) {
  const { t, i18n } = useTranslation();
  const [examples, setExamples] = useState<ExampleSummary[]>([]);

  useEffect(() => {
    if (open) void window.ideblock.invoke('project:examples').then(setExamples);
  }, [open]);

  const language = i18n.language === 'es' ? 'es' : 'en';
  const levels = [...new Set(examples.map((example) => example.level))];

  return (
    <Modal
      open={open}
      title={t('files.examplesTitle')}
      onClose={onClose}
      testId="examples-dialog"
      wide
    >
      {levels.map((level) => (
        <section key={level} className="examples__level">
          <h3>{t('files.level', { level })}</h3>
          <ul className="examples__list">
            {examples
              .filter((example) => example.level === level)
              .map((example) => (
                <li key={example.id}>
                  <button
                    type="button"
                    className="example-card"
                    data-testid={`example-${example.id}`}
                    onClick={() => onChoose(example.id)}
                  >
                    <strong>{example.title[language] ?? example.title.en}</strong>
                    <span>{example.description[language] ?? example.description.en}</span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </Modal>
  );
}
