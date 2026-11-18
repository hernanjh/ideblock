import { ExternalLink } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePortsStore } from '../state/ports';

export function NoBoardHelp() {
  const { t } = useTranslation();
  const missingDrivers = usePortsStore((state) => state.missingDrivers);
  const checkDrivers = usePortsStore((state) => state.checkDrivers);
  const showAll = usePortsStore((state) => state.showAll);
  const setShowAll = usePortsStore((state) => state.setShowAll);

  useEffect(() => {
    void checkDrivers();
  }, [checkDrivers]);

  return (
    <div className="build-result" data-testid="no-board-help">
      <p className="build-result__title">{t('ports.help.title')}</p>
      {missingDrivers.map((driver) => (
        <div key={driver.chip} className="notice notice--inline" role="status">
          <p>{t('ports.help.driver', { chip: driver.chip })}</p>
          <button
            type="button"
            onClick={() => void window.ideblock.invoke('app:open-external', driver.url)}
          >
            <ExternalLink aria-hidden="true" size="1em" />
            {t('ports.help.downloadDriver', { chip: driver.chip })}
          </button>
        </div>
      ))}
      <ol className="steps">
        <li>{t('ports.help.cable')}</li>
        <li>{t('ports.help.dataCable')}</li>
        <li>{t('ports.help.otherPort')}</li>
        <li>{t('ports.help.drivers')}</li>
      </ol>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={showAll}
          data-testid="show-all-ports"
          onChange={(event) => setShowAll(event.target.checked)}
        />
        {t('ports.showAll')}
      </label>
    </div>
  );
}
