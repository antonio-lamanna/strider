import { useEffect, useRef } from "react";
export function useKeyboardShortcuts(
  actions: Record<string, () => void>,
  disabled = false,
) {
  const ref = useRef(actions);
  ref.current = actions;
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (disabled) return;
      const element = event.target as HTMLElement,
        editing = !!element.closest(
          'input,textarea,select,[contenteditable="true"]',
        );
      const mod = event.ctrlKey || event.metaKey,
        key = event.key.toLowerCase();
      if (editing && !(mod && key === "s") && key !== "escape") return;
      const shortcut = mod
        ? `${event.shiftKey ? "mod+shift+" : "mod+"}${key}`
        : key;
      const action = ref.current[shortcut];
      if (action) {
        event.preventDefault();
        action();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [disabled]);
}
