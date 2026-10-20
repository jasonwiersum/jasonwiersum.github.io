'use client';

import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * Modal estilo Apple Sheet: sube desde abajo en móvil (arrastrable para
 * cerrar) y aparece centrado en escritorio.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-card-solid shadow-2xl outline-none sm:max-w-2xl sm:rounded-[28px]"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
              <span className="h-1.5 w-10 rounded-full bg-ink-3/50" />
            </div>
            <div className="flex items-center justify-between px-5 pt-3 pb-2 sm:px-6 sm:pt-5">
              <h2 id={titleId} className="sr-only">
                {title}
              </h2>
              <span />
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="grid size-8 place-items-center rounded-full bg-fill text-ink-2 transition hover:text-ink active:scale-95"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 pb-8 sm:px-6" onPointerDownCapture={(e) => e.stopPropagation()}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
