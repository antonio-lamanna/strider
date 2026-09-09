import { useCallback, useRef, useState } from "react";
import type { Diagram } from "../model/diagram";
import { cleanDiagram, createDiagram, fingerprint } from "../model/diagram";
type Updater = (diagram: Diagram) => Diagram;
export function useDiagramHistory() {
  const [diagram, setDiagram] = useState<Diagram>(createDiagram);
  const ref = useRef(diagram),
    past = useRef<Diagram[]>([]),
    future = useRef<Diagram[]>([]),
    transaction = useRef<Diagram | null>(null),
    lastMerge = useRef({ key: "", at: 0 });
  const [saved, setSaved] = useState(() => fingerprint(diagram));
  const publish = useCallback((d: Diagram) => {
    ref.current = d;
    setDiagram(d);
  }, []);
  const replace = useCallback(
    (fn: Updater) => publish(fn(ref.current)),
    [publish],
  );
  const commit = useCallback(
    (fn: Updater, key = "") => {
      const before = ref.current,
        next = fn(before);
      if (next === before) return;
      if (fingerprint(before) === fingerprint(next)) {
        publish(next);
        return;
      }
      if (!transaction.current) {
        const now = Date.now();
        if (
          !key ||
          key !== lastMerge.current.key ||
          now - lastMerge.current.at > 700
        )
          past.current = [...past.current.slice(-79), cleanDiagram(before)];
        lastMerge.current = { key, at: now };
        future.current = [];
      }
      publish({ ...next, updatedAt: new Date().toISOString() });
    },
    [publish],
  );
  const begin = useCallback(() => {
    if (!transaction.current) transaction.current = cleanDiagram(ref.current);
    lastMerge.current = { key: "", at: 0 };
  }, []);
  const end = useCallback(() => {
    const before = transaction.current;
    transaction.current = null;
    if (before && fingerprint(before) !== fingerprint(ref.current)) {
      past.current = [...past.current.slice(-79), before];
      future.current = [];
      publish({ ...ref.current, updatedAt: new Date().toISOString() });
    }
  }, [publish]);
  const undo = useCallback(() => {
    if (!past.current.length) return;
    future.current.push(cleanDiagram(ref.current));
    publish(past.current.pop()!);
    lastMerge.current = { key: "", at: 0 };
  }, [publish]);
  const redo = useCallback(() => {
    if (!future.current.length) return;
    past.current.push(cleanDiagram(ref.current));
    publish(future.current.pop()!);
    lastMerge.current = { key: "", at: 0 };
  }, [publish]);
  const load = useCallback(
    (d: Diagram, markClean = true) => {
      past.current = [];
      future.current = [];
      transaction.current = null;
      lastMerge.current = { key: "", at: 0 };
      publish(d);
      setSaved(markClean ? fingerprint(d) : "");
    },
    [publish],
  );
  const markSaved = useCallback(
    (d: Diagram) => {
      publish(d);
      setSaved(fingerprint(d));
      lastMerge.current = { key: "", at: 0 };
    },
    [publish],
  );
  return {
    diagram,
    ref,
    replace,
    commit,
    begin,
    end,
    undo,
    redo,
    load,
    markSaved,
    dirty: fingerprint(diagram) !== saved,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
