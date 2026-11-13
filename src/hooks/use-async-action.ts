"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Outcome<T> = { status: "success"; data: T } | { status: "error"; error: Error } | { status: "ignored" };
type State<T> = { pending: boolean; input: T | null; error: Error | null };

/** One in-flight mutation per instance; reset/unmount invalidate stale responses. */
export function useAsyncAction<TInput, TOutput>(operation: (input: TInput) => Promise<TOutput>) {
  const action = useRef(operation);
  action.current = operation;
  const lifecycle = useRef({ mounted: false, busy: false, revision: 0 });
  const [state, setState] = useState<State<TInput>>({ pending: false, input: null, error: null });
  useEffect(() => {
    const current = lifecycle.current;
    current.mounted = true;
    return () => { current.mounted = false; current.revision++; current.busy = false; };
  }, []);
  const reset = useCallback(() => {
    const current = lifecycle.current;
    current.revision++; current.busy = false;
    if (current.mounted) setState({ pending: false, input: null, error: null });
  }, []);
  const execute = useCallback(async (input: TInput): Promise<Outcome<TOutput>> => {
    const current = lifecycle.current;
    if (!current.mounted || current.busy) return { status: "ignored" };
    current.busy = true;
    const revision = ++current.revision;
    setState({ pending: true, input, error: null });
    try {
      const data = await action.current(input);
      if (!current.mounted || revision !== current.revision) return { status: "ignored" };
      setState({ pending: false, input: null, error: null });
      return { status: "success", data };
    } catch (cause) {
      if (!current.mounted || revision !== current.revision) return { status: "ignored" };
      const error = cause instanceof Error ? cause : new Error(String(cause));
      setState({ pending: false, input: null, error });
      return { status: "error", error };
    } finally {
      if (revision === current.revision) current.busy = false;
    }
  }, []);
  return { ...state, execute, reset };
}
