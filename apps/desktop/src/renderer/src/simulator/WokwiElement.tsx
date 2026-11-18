import '@wokwi/elements';
import { useEffect, useRef } from 'react';

interface WokwiElementProps {
  tag: string;
  /** Assigned as element properties, which is how these custom elements are configured. */
  properties: Record<string, unknown>;
  events?: Record<string, (event: Event) => void>;
  label?: string;
  /** For state that elements take through methods rather than properties. */
  apply?: (element: HTMLElement) => void;
}

export function WokwiElement({ tag, properties, events, label, apply }: WokwiElementProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const element = document.createElement(tag);
    host.appendChild(element);
    elementRef.current = element;
    return () => {
      element.remove();
      elementRef.current = null;
    };
  }, [tag]);

  useEffect(() => {
    const element = elementRef.current as (HTMLElement & Record<string, unknown>) | null;
    if (!element) return;
    for (const [key, value] of Object.entries(properties)) element[key] = value;
    apply?.(element);
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !events) return;
    const entries = Object.entries(events);
    for (const [name, handler] of entries) element.addEventListener(name, handler);
    return () => {
      for (const [name, handler] of entries) element.removeEventListener(name, handler);
    };
  }, [events, tag]);

  return <div ref={hostRef} className="wokwi-host" role="img" aria-label={label} />;
}
