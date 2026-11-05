import { useCallback, useRef, useState } from "react";
import type { Resume } from "@resume/model";

export function useResumeHistory(initialResume: () => Resume) {
  const [resume, setResume] = useState(initialResume);
  const currentResume = useRef(resume);
  const past = useRef<Resume[]>([]);
  const future = useRef<Resume[]>([]);
  const lastChange = useRef(0);
  const update = useCallback((fn: (resume: Resume) => Resume, separate = false) => {
    const current = currentResume.current;
    if (separate || Date.now() - lastChange.current > 650) {
      past.current.push(current);
      if (past.current.length > 50) past.current.shift();
    }
    future.current = [];
    lastChange.current = Date.now();
    const next = fn(current);
    currentResume.current = next;
    setResume(next);
  }, []);
  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (previous) {
      future.current.push(currentResume.current);
      currentResume.current = previous;
      setResume(previous);
      lastChange.current = 0;
    }
  }, []);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next) {
      past.current.push(currentResume.current);
      currentResume.current = next;
      setResume(next);
      lastChange.current = 0;
    }
  }, []);
  return { resume, update, undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}
