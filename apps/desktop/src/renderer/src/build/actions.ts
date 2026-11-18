import { useBuildStore } from '../state/build';
import { usePortsStore } from '../state/ports';
import { useSettingsStore } from '../state/settings';
import { useSimulationStore } from '../state/simulation';

async function showConsoleIfFailed(ok: boolean | undefined): Promise<void> {
  if (ok === false) await useSettingsStore.getState().update({ consoleVisible: true });
}

export async function verify(): Promise<void> {
  const result = await useBuildStore.getState().compile();
  await showConsoleIfFailed(result?.ok);
}

export async function upload(): Promise<void> {
  const port = usePortsStore.getState().selected;
  const result = await useBuildStore.getState().uploadTo(port);
  await showConsoleIfFailed(result?.ok ?? false);
}

export async function simulate(): Promise<void> {
  const { settings, update } = useSettingsStore.getState();
  if (!settings.simulatorVisible) await update({ simulatorVisible: true });
  await useSimulationStore.getState().start();
}
