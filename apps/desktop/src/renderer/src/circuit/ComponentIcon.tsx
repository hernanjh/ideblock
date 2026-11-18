/** Small drawings for the component palette and cards. */
export function ComponentIcon({ type, size = 34 }: { type: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 34 34', 'aria-hidden': true } as const;
  switch (type) {
    case 'led':
      return (
        <svg {...common}>
          <path d="M9 22 v-10 a8 8 0 0 1 16 0 v10z" fill="#ff3b30" />
          <line x1="13" y1="22" x2="13" y2="33" stroke="#888" strokeWidth="2" />
          <line x1="21" y1="22" x2="21" y2="33" stroke="#888" strokeWidth="2" />
        </svg>
      );
    case 'pushbutton':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="28" height="28" rx="4" fill="#2c2f35" />
          <circle cx="17" cy="17" r="8" fill="#2fa84f" />
        </svg>
      );
    case 'potentiometer':
      return (
        <svg {...common}>
          <circle cx="17" cy="17" r="14" fill="#cfd5e2" />
          <circle cx="17" cy="17" r="9" fill="#1f6fe0" />
          <line x1="17" y1="17" x2="23" y2="11" stroke="#fff" strokeWidth="2.5" />
        </svg>
      );
    case 'photoresistor':
      return (
        <svg {...common}>
          <circle cx="17" cy="12" r="9" fill="#d9a36a" />
          <path d="M11 9 h12 M11 12 h12 M11 15 h12" stroke="#8b4513" />
          <line x1="13" y1="21" x2="13" y2="33" stroke="#888" strokeWidth="2" />
          <line x1="21" y1="21" x2="21" y2="33" stroke="#888" strokeWidth="2" />
        </svg>
      );
    case 'servo':
      return (
        <svg {...common}>
          <rect x="3" y="12" width="28" height="16" rx="3" fill="#1f6fe0" />
          <rect x="12" y="5" width="20" height="6" rx="3" fill="#fff" stroke="#999" />
        </svg>
      );
    case 'buzzer':
      return (
        <svg {...common}>
          <circle cx="17" cy="17" r="14" fill="#26282c" />
          <circle cx="17" cy="17" r="3" fill="#666" />
        </svg>
      );
    case 'hc-sr04':
      return (
        <svg {...common}>
          <rect x="1" y="9" width="32" height="16" rx="3" fill="#1f6fe0" />
          <circle cx="10" cy="17" r="6" fill="#ccc" stroke="#555" />
          <circle cx="24" cy="17" r="6" fill="#ccc" stroke="#555" />
        </svg>
      );
    default:
      return <svg {...common} />;
  }
}
