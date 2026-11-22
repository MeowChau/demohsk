/** @jest-environment jsdom */
import { act, cleanup, render, screen } from "@testing-library/react";
import { SharedAudioSection } from "../shared-audio-section";

const originalHeight = window.innerHeight;
const originalFrame = window.requestAnimationFrame;
const originalCancelFrame = window.cancelAnimationFrame;
const originalObserver = globalThis.ResizeObserver;
const originalViewport = window.visualViewport;
let playerHeight = 80;
let callbacks: ResizeObserverCallback[] = [];
const disconnect = jest.fn();

function availableHeight(container: HTMLElement) {
  return parseFloat(container.querySelector<HTMLElement>("[data-shared-audio-section]")!.style.getPropertyValue("--practice-shared-questions-height"));
}

beforeEach(() => {
  jest.useFakeTimers();
  playerHeight = 80;
  callbacks = [];
  disconnect.mockClear();
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 900, writable: true });
  Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
  window.requestAnimationFrame = callback => window.setTimeout(() => callback(0), 0);
  window.cancelAnimationFrame = id => window.clearTimeout(id);
  globalThis.ResizeObserver = class {
    constructor(callback: ResizeObserverCallback) { callbacks.push(callback); }
    observe() {}
    unobserve() {}
    disconnect = disconnect;
  } as unknown as typeof ResizeObserver;
  jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const top = this.hasAttribute("data-shared-audio-section") ? 240 : 0;
    const height = this.hasAttribute("data-shared-audio-player") ? playerHeight : 0;
    return { x: 0, y: top, top, bottom: top + height, left: 0, right: 700, width: 700, height, toJSON() {} };
  });
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  jest.useRealTimers();
  window.requestAnimationFrame = originalFrame;
  window.cancelAnimationFrame = originalCancelFrame;
  globalThis.ResizeObserver = originalObserver;
  Object.defineProperty(window, "innerHeight", { configurable: true, value: originalHeight, writable: true });
  Object.defineProperty(window, "visualViewport", { configurable: true, value: originalViewport });
});

it("reduces the question viewport when the player grows or the screen becomes shorter", () => {
  const view = render(<SharedAudioSection src="/shared.wav" label="Câu 1–20" fitToViewport><p>Câu hỏi</p></SharedAudioSection>);
  expect(screen.getByRole("region", { name: "Câu hỏi dùng chung audio: câu 1–20" })).toBeTruthy();
  const initial = availableHeight(view.container);
  act(() => { playerHeight = 128; callbacks[0]!([], {} as ResizeObserver); jest.runOnlyPendingTimers(); });
  expect(availableHeight(view.container)).toBe(initial - 48);
  act(() => { window.innerHeight = 700; window.dispatchEvent(new Event("resize")); jest.runOnlyPendingTimers(); });
  expect(availableHeight(view.container)).toBe(initial - 48 - 200);
});

it("keeps the same audio and playback position when answers or viewport size change", () => {
  const view = render(<SharedAudioSection src="/shared.wav" label="Câu 1–20" fitToViewport><p>Chưa trả lời</p></SharedAudioSection>);
  const player = screen.getByLabelText("Audio dùng chung cho câu 1–20") as HTMLAudioElement;
  player.currentTime = 37;
  view.rerender(<SharedAudioSection src="/shared.wav" label="Câu 1–20" fitToViewport><p>Đã chọn đáp án A</p></SharedAudioSection>);
  act(() => { window.dispatchEvent(new Event("resize")); jest.runOnlyPendingTimers(); });
  expect(screen.getByLabelText("Audio dùng chung cho câu 1–20")).toBe(player);
  expect(player.currentTime).toBe(37);
  expect(player.pause).not.toHaveBeenCalled();
  view.unmount();
  expect(player.pause).toHaveBeenCalledTimes(1);
  expect(disconnect).toHaveBeenCalledTimes(1);
});

it("responds to the visible mobile viewport without resetting audio", () => {
  const viewport = new EventTarget() as EventTarget & { height: number; offsetTop: number };
  viewport.height = 800;
  viewport.offsetTop = 0;
  Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
  const view = render(<SharedAudioSection src="/shared.wav" label="Câu 1–20" fitToViewport><p>Câu hỏi</p></SharedAudioSection>);
  const initial = availableHeight(view.container);
  act(() => { viewport.height = 600; viewport.dispatchEvent(new Event("resize")); jest.runOnlyPendingTimers(); });
  expect(availableHeight(view.container)).toBe(initial - 200);
});

it("preserves the existing non-scrollable layout for history review", () => {
  render(<SharedAudioSection src="/shared.wav" label="Câu 1–20"><p>Nội dung đã nộp</p></SharedAudioSection>);
  expect(screen.queryByRole("region")).toBeNull();
  expect(screen.getByText("Nội dung đã nộp")).toBeTruthy();
  expect(screen.getByLabelText("Audio dùng chung cho câu 1–20")).toBeTruthy();
});
