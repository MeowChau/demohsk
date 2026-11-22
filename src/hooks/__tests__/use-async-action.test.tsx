/** @jest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { useAsyncAction } from "../use-async-action";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
it("claims a mutation immediately and ignores a second click", async () => {
  const request = deferred<number>();
  const action = jest.fn(() => request.promise);
  const { result } = renderHook(() => useAsyncAction<string, number>(action));
  let first!: ReturnType<typeof result.current.execute>;
  await act(async () => {
    first = result.current.execute("word");
    expect(await result.current.execute("other")).toEqual({ status: "ignored" });
  });
  expect(action).toHaveBeenCalledTimes(1);
  await act(async () => { request.resolve(5); expect(await first).toEqual({ status: "success", data: 5 }); });
  expect(result.current.pending).toBe(false);
});
it("reports failure and allows a retry", async () => {
  const action = jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(7);
  const { result } = renderHook(() => useAsyncAction<string, number>(action));
  await act(async () => { await result.current.execute("word"); });
  expect(result.current.error?.message).toBe("offline");
  await act(async () => { expect(await result.current.execute("word")).toEqual({ status: "success", data: 7 }); });
  expect(result.current.error).toBeNull();
});
it("ignores an old response after reset while a new request stays pending", async () => {
  const old = deferred<number>(), fresh = deferred<number>();
  const action = jest.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  const { result } = renderHook(() => useAsyncAction<string, number>(action));
  let first!: ReturnType<typeof result.current.execute>;
  let second!: ReturnType<typeof result.current.execute>;
  act(() => { first = result.current.execute("old"); });
  act(() => { result.current.reset(); second = result.current.execute("new"); });
  await act(async () => { old.resolve(1); expect(await first).toEqual({ status: "ignored" }); });
  expect(result.current.pending).toBe(true);
  await act(async () => { fresh.resolve(2); await second; });
  expect(result.current.pending).toBe(false);
});
it("does not deliver a result to an unmounted consumer", async () => {
  const request = deferred<number>();
  const { result, unmount } = renderHook(() => useAsyncAction<string, number>(() => request.promise));
  let pending!: ReturnType<typeof result.current.execute>;
  act(() => { pending = result.current.execute("word"); });
  unmount();
  request.resolve(1);
  expect(await pending).toEqual({ status: "ignored" });
});
