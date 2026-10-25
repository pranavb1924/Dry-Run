// A floating panel anchored to a button: condition editors, menus and the
// action picker. It renders at the end of the page (a portal) so a
// scrolling panel can't clip it, opens below its anchor or above when
// there's more room there, and closes on Escape or a click outside.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PopoverProps {
  readonly anchor: HTMLElement | null;
  readonly onClose: () => void;
  readonly label: string;
  readonly width?: number;
  readonly align?: 'start' | 'end';
  readonly children: ReactNode;
}

const GAP = 6;
const MARGIN = 8;

export function Popover({ anchor, onClose, label, width = 300, align = 'start', children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    if (anchor === null) {
      return;
    }
    const update = (): void => {
      const rect = anchor.getBoundingClientRect();
      const height = ref.current?.scrollHeight ?? 320;
      const left = Math.max(MARGIN, Math.min(align === 'start' ? rect.left : rect.right - width, window.innerWidth - width - MARGIN));
      const below = window.innerHeight - rect.bottom - GAP - MARGIN;
      const above = rect.top - GAP - MARGIN;
      if (below >= Math.min(height, 360) || below >= above) {
        setPlace({ top: rect.bottom + GAP, left, maxHeight: below });
      } else {
        const maxHeight = above;
        setPlace({ top: rect.top - GAP - Math.min(height, maxHeight), left, maxHeight });
      }
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchor, align, width]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (!ref.current?.contains(target) && !anchor?.contains(target)) {
        onClose();
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        anchor?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className="popover"
      style={{
        width,
        top: place?.top ?? 0,
        left: place?.left ?? 0,
        maxHeight: place?.maxHeight,
        visibility: place === null ? 'hidden' : 'visible',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

/** Tracks which popover is open, and the button it hangs from. */
export function usePopover<T extends string = string>() {
  const [open, setOpen] = useState<{ key: T; anchor: HTMLElement } | null>(null);
  return {
    openKey: open?.key ?? null,
    anchor: open?.anchor ?? null,
    toggle: (key: T, anchor: HTMLElement) => setOpen((current) => (current?.key === key ? null : { key, anchor })),
    close: () => setOpen(null),
  };
}
