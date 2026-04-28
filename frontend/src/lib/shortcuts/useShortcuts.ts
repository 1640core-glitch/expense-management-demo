import { RefObject, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SHORTCUTS, ShortcutRole } from './keymap';

const G_PREFIX_TIMEOUT_MS = 1000;

interface UseShortcutsOptions {
  role?: ShortcutRole;
  searchInputRef: RefObject<HTMLInputElement>;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

function isDialogOpen(): boolean {
  return document.querySelector('[role="dialog"][data-state="open"]') !== null;
}

export function useShortcuts({ role, searchInputRef }: UseShortcutsOptions): void {
  const navigate = useNavigate();
  const gPendingRef = useRef<{ timer: ReturnType<typeof setTimeout> } | null>(null);

  useEffect(() => {
    const clearPending = () => {
      if (gPendingRef.current) {
        clearTimeout(gPendingRef.current.timer);
        gPendingRef.current = null;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;
      if (isDialogOpen()) return;

      const key = event.key;

      if (gPendingRef.current) {
        clearPending();
        const entry = SHORTCUTS.find(
          (s) => s.keys.length === 2 && s.keys[0] === 'g' && s.keys[1] === key,
        );
        if (!entry) return;
        if (entry.roles && (!role || !entry.roles.includes(role))) return;
        if (entry.action.type === 'navigate') {
          event.preventDefault();
          navigate(entry.action.path);
        }
        return;
      }

      if (key === 'g') {
        event.preventDefault();
        const timer = setTimeout(() => {
          gPendingRef.current = null;
        }, G_PREFIX_TIMEOUT_MS);
        gPendingRef.current = { timer };
        return;
      }

      const entry = SHORTCUTS.find((s) => s.keys.length === 1 && s.keys[0] === key);
      if (!entry) return;
      if (entry.roles && (!role || !entry.roles.includes(role))) return;

      if (entry.action.type === 'navigate') {
        event.preventDefault();
        navigate(entry.action.path);
      } else if (entry.action.type === 'focusSearch') {
        const el = searchInputRef.current;
        if (el) {
          event.preventDefault();
          el.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearPending();
    };
  }, [navigate, role, searchInputRef]);
}
