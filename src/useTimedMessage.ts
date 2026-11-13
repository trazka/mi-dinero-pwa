import { useCallback, useEffect, useState, type SetStateAction } from "react";

export default function useTimedMessage(duration: number, enabled = true) {
  const [message, update] = useState({ text: "", revision: 0 });
  const setMessage = useCallback((value: SetStateAction<string>) => {
    update((previous) => ({
      text: typeof value === "function" ? value(previous.text) : value,
      revision: previous.revision + 1,
    }));
  }, []);
  useEffect(() => {
    if (!enabled || !message.text) return;
    const timer = window.setTimeout(() => setMessage(""), duration);
    return () => window.clearTimeout(timer);
  }, [message, duration, enabled, setMessage]);
  return [message.text, setMessage] as const;
}
