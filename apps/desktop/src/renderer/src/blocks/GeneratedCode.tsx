import { useProjectStore } from '../state/project';

/** Read-only view of the generated sketch, replaced by the code editor later. */
export function GeneratedCode() {
  const code = useProjectStore((state) => state.sketch?.code ?? '');
  return (
    <pre className="generated-code" data-testid="generated-code">
      {code}
    </pre>
  );
}
