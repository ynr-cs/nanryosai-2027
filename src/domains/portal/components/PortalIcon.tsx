import type { CSSProperties } from 'react';

export type PortalIconName =
  | 'menu'
  | 'close'
  | 'home'
  | 'grid'
  | 'bag'
  | 'mic'
  | 'map'
  | 'arrow-right'
  | 'chevron-left'
  | 'chevron-right'
  | 'geo'
  | 'geo-fill'
  | 'star'
  | 'star-fill'
  | 'calendar'
  | 'cursor'
  | 'alert-triangle'
  | 'alert-circle'
  | 'info'
  | 'trophy'
  | 'checks'
  | 'train'
  | 'megaphone'
  | 'credit-card'
  | 'chat-heart'
  | 'file-text'
  | 'sun'
  | 'moon'
  | 'display'
  | 'utensils'
  | 'sparkles';

interface PortalIconProps {
  readonly name: PortalIconName;
  readonly size?: number;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/**
 * CSP（外部CDN禁止）準拠の軽量インライン SVG アイコン群
 */
export function PortalIcon({ name, size = 18, className, style }: PortalIconProps) {
  const baseProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
    focusable: false,
    className,
    style,
  };

  switch (name) {
    case 'menu':
      return (
        <svg {...baseProps}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case 'close':
      return (
        <svg {...baseProps}>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      );
    case 'home':
      return (
        <svg {...baseProps} fill="currentColor" stroke="none">
          <path d="M11.4 2.7a1 1 0 0 1 1.2 0l8 6.3a1 1 0 0 1 .4.8V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.8a1 1 0 0 1 .4-.8l8-6.3Z" />
        </svg>
      );
    case 'grid':
      return (
        <svg {...baseProps} fill="currentColor" stroke="none">
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="8" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
          <rect x="13" y="13" width="8" height="8" rx="2" />
        </svg>
      );
    case 'bag':
      return (
        <svg {...baseProps} fill="currentColor" stroke="none">
          <path d="M8 7V6a4 4 0 1 1 8 0v1h3a1 1 0 0 1 1 1l1 12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1L4 8a1 1 0 0 1 1-1h3Zm2 0h4V6a2 2 0 1 0-4 0v1Z" />
        </svg>
      );
    case 'mic':
      return (
        <svg {...baseProps} fill="currentColor" stroke="none">
          <rect x="9" y="2" width="6" height="11" rx="3" />
          <path
            d="M5 11a7 7 0 0 0 14 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
          />
          <path d="M12 18v3M9 21h6" fill="none" stroke="currentColor" strokeWidth="2.1" />
        </svg>
      );
    case 'map':
      return (
        <svg {...baseProps}>
          <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
          <path d="M9 3v15M15 6v15" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...baseProps}>
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg {...baseProps}>
          <path d="m15 6-6 6 6 6" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...baseProps}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    case 'geo':
      return (
        <svg {...baseProps}>
          <path d="M12 21s-6-5.4-6-10a6 6 0 1 1 12 0c0 4.6-6 10-6 10Z" />
          <circle cx="12" cy="11" r="2.2" />
        </svg>
      );
    case 'geo-fill':
      return (
        <svg {...baseProps} fill="currentColor" stroke="none">
          <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
        </svg>
      );
    case 'star':
      return (
        <svg {...baseProps}>
          <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
        </svg>
      );
    case 'star-fill':
      return (
        <svg {...baseProps} fill="currentColor" stroke="none">
          <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...baseProps}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      );
    case 'cursor':
      return (
        <svg {...baseProps} fill="currentColor" stroke="none">
          <path d="m21 3-9.2 18-2.3-7.5L2 11.2 21 3Z" />
        </svg>
      );
    case 'alert-triangle':
      return (
        <svg {...baseProps} fill="currentColor" stroke="none">
          <path d="M10.3 3.6a2 2 0 0 1 3.4 0l8 13.8A2 2 0 0 1 20 20.4H4a2 2 0 0 1-1.7-3l8-13.8ZM11 9v5h2V9h-2Zm0 7v2h2v-2h-2Z" />
        </svg>
      );
    case 'alert-circle':
      return (
        <svg {...baseProps} fill="currentColor" stroke="none">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 5h2v6h-2V7Zm0 8h2v2h-2v-2Z" />
        </svg>
      );
    case 'info':
      return (
        <svg {...baseProps} fill="currentColor" stroke="none">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z" />
        </svg>
      );
    case 'trophy':
      return (
        <svg {...baseProps} fill="currentColor" stroke="none">
          <path d="M6 3h12v5a6 6 0 0 1-5 5.9V17h3v2H8v-2h3v-3.1A6 6 0 0 1 6 8V3Zm-3 2h2v4a3 3 0 0 1-2-2.8V5Zm16 0h2v1.2A3 3 0 0 1 19 9V5Z" />
        </svg>
      );
    case 'checks':
      return (
        <svg {...baseProps}>
          <path d="m9 11 3 3L20 6M4 17l3 3 9-9" />
        </svg>
      );
    case 'train':
      return (
        <svg {...baseProps}>
          <rect x="5" y="3" width="14" height="14" rx="3" />
          <path d="M5 11h14M9 17l-2 4M15 17l2 4" />
          <circle cx="9" cy="14" r="1" fill="currentColor" />
          <circle cx="15" cy="14" r="1" fill="currentColor" />
        </svg>
      );
    case 'megaphone':
      return (
        <svg {...baseProps}>
          <path d="m3 11 13-5v12L3 13v-2Z" />
          <path d="M16 9a3 3 0 0 1 0 6M7 14l1.5 5H11l-1.5-5" />
        </svg>
      );
    case 'credit-card':
      return (
        <svg {...baseProps}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case 'chat-heart':
      return (
        <svg {...baseProps}>
          <path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 20l1.4-4.7A8.5 8.5 0 1 1 21 11.5Z" />
          <path
            d="M12 14.5s-3-1.8-3-3.7a1.7 1.7 0 0 1 3-1 1.7 1.7 0 0 1 3 1c0 1.9-3 3.7-3 3.7Z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );
    case 'file-text':
      return (
        <svg {...baseProps}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
          <path d="M14 2v6h6M8 13h8M8 17h6" />
        </svg>
      );
    case 'sun':
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    case 'moon':
      return (
        <svg {...baseProps}>
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
        </svg>
      );
    case 'display':
      return (
        <svg {...baseProps}>
          <rect x="2" y="4" width="20" height="13" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      );
    case 'utensils':
      return (
        <svg {...baseProps}>
          <path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3v18M17 3c2 0 3 2.5 3 6s-1 5-3 5" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg {...baseProps}>
          <path d="m12 3 1.7 4.6L18.3 9l-4.6 1.7L12 15.3l-1.7-4.6L5.7 9l4.6-1.7L12 3Z" />
          <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
        </svg>
      );
  }
}
