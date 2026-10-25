// A small set of 16px line icons, drawn for this page. They inherit the text
// color, so a button's hover color reaches its icon too.

import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { readonly size?: number };

function icon(paths: ReactNode) {
  return function Icon({ size = 16, ...props }: IconProps) {
    return (
      <svg
        className="icon"
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

export const PlusIcon = icon(<path d="M8 3.5v9M3.5 8h9" />);
export const CloseIcon = icon(<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />);
export const CheckIcon = icon(<path d="M3.5 8.5l3 3 6-7" />);
export const ChevronDownIcon = icon(<path d="M4.5 6.5 8 10l3.5-3.5" />);
export const ArrowRightIcon = icon(<path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" />);
export const UndoIcon = icon(<path d="M5.5 3.5 2.5 6.5l3 3M2.5 6.5H10a3.5 3.5 0 0 1 0 7H8" />);
export const RedoIcon = icon(<path d="m10.5 3.5 3 3-3 3M13.5 6.5H6a3.5 3.5 0 0 0 0 7h2" />);
export const ShareIcon = icon(<path d="M8 10V2.5M5 5.5l3-3 3 3M3.5 9v3.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V9" />);
export const SearchIcon = icon(
  <>
    <circle cx="7" cy="7" r="4.25" />
    <path d="m10.25 10.25 3.25 3.25" />
  </>,
);
export const MoreIcon = icon(
  <>
    <circle cx="3.5" cy="8" r="0.9" fill="currentColor" />
    <circle cx="8" cy="8" r="0.9" fill="currentColor" />
    <circle cx="12.5" cy="8" r="0.9" fill="currentColor" />
  </>,
);
export const TrashIcon = icon(<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" />);
export const CopyIcon = icon(
  <>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 5.5v-1a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1" />
  </>,
);
export const BoltIcon = icon(<path d="M8.75 1.75 3.5 9h4l-.75 5.25L12 7H8z" />);
export const ResetIcon = icon(<path d="M2.75 3v3.5h3.5M3.2 6.5A5 5 0 1 1 3 9.5" />);
export const SparkIcon = icon(<path d="M8 2.5c.4 2.6 1.5 3.7 4 4-2.5.4-3.6 1.5-4 4.5-.4-3-1.5-4.1-4-4.5 2.5-.3 3.6-1.4 4-4z" />);
export const SlidersIcon = icon(
  <>
    <path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6" />
    <circle cx="10" cy="4.5" r="1.5" />
    <circle cx="6" cy="11.5" r="1.5" />
  </>,
);
export const TableIcon = icon(
  <>
    <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
    <path d="M2.5 6.5h11M2.5 10h11M6.5 6.5V13" />
  </>,
);
export const ChartIcon = icon(<path d="M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5" />);
export const InfoIcon = icon(
  <>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M8 7.25v3.5M8 5.25v.01" />
  </>,
);

/** The Dry Run mark: a lime chart rising inside a dark tile. */
export function Logo({ size = 26 }: { readonly size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
      <rect width="26" height="26" rx="7" fill="#0b0b0b" />
      <path d="M7 18.5v-3M11 18.5v-6M15 18.5v-4.5M19 18.5V8" stroke="#d9f24f" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
