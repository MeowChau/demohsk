/** @jest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { AttemptAudioDock, type AttemptAudioTrack } from "../attempt-audio-dock";

const tracks: AttemptAudioTrack[] = [
  { id: "first", src: "/first.wav", label: "Câu 1–10", questionIds: ["1", "10"] },
  { id: "second", src: "/second.wav", label: "Câu 11–20", questionIds: ["11", "20"] },
];
const originalObserver = globalThis.ResizeObserver;
const disconnect = jest.fn();
let resize: ResizeObserverCallback;
let height = 96;

function Fixture({ questionId }: { questionId: string }) {
  const form = useRef<HTMLFormElement>(null);
  return <form ref={form}><AttemptAudioDock tracks={tracks} activeQuestionId={questionId} formRef={form} /></form>;
}

beforeEach(() => {
  height = 96;
  disconnect.mockClear();
  globalThis.ResizeObserver = class {
    constructor(callback: ResizeObserverCallback) { resize = callback; }
    observe() {}
    unobserve() {}
    disconnect = disconnect;
  } as unknown as typeof ResizeObserver;
  jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => (
    { top: 0, left: 0, right: 300, bottom: height, width: 300, height, x: 0, y: 0, toJSON() {} }
  ));
  jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  globalThis.ResizeObserver = originalObserver;
});

it("keeps playback position when selecting another question or resizing the dock", () => {
  const view = render(<Fixture questionId="1" />);
  const player = screen.getByLabelText("Audio dùng chung cho câu 1–10") as HTMLAudioElement;
  player.currentTime = 37;
  jest.mocked(player.pause).mockClear();
  view.rerender(<Fixture questionId="10" />);
  act(() => { height = 64; resize([], {} as ResizeObserver); });
  expect(screen.getByLabelText("Audio dùng chung cho câu 1–10")).toBe(player);
  expect(player.currentTime).toBe(37);
  expect(player.pause).not.toHaveBeenCalled();
  expect(view.container.querySelector("form")!.style.getPropertyValue("--practice-audio-dock-height")).toBe("64px");
});

it("switches shared tracks, pauses the previous one, and preserves its position on return", () => {
  const view = render(<Fixture questionId="1" />);
  const first = screen.getByLabelText("Audio dùng chung cho câu 1–10") as HTMLAudioElement;
  const second = screen.getByLabelText("Audio dùng chung cho câu 11–20") as HTMLAudioElement;
  first.currentTime = 37;
  const pause = jest.spyOn(first, "pause");
  view.rerender(<Fixture questionId="11" />);
  expect(first.closest("[data-shared-audio-player]")!.hasAttribute("hidden")).toBe(true);
  expect(second.closest("[data-shared-audio-player]")!.hasAttribute("hidden")).toBe(false);
  expect(pause).toHaveBeenCalled();
  view.rerender(<Fixture questionId="1" />);
  expect(screen.getByLabelText("Audio dùng chung cho câu 1–10")).toBe(first);
  expect(first.currentTime).toBe(37);
});

it("keeps the last listening track accessible when moving to reading questions", () => {
  const view = render(<Fixture questionId="11" />);
  const second = screen.getByLabelText("Audio dùng chung cho câu 11–20");
  view.rerender(<Fixture questionId="21" />);
  expect(second.closest("[data-shared-audio-player]")!.hasAttribute("hidden")).toBe(false);
});

it("stops other practice audio on play and releases observers and players on unmount", () => {
  const view = render(<Fixture questionId="1" />);
  const first = screen.getByLabelText("Audio dùng chung cho câu 1–10");
  const second = screen.getByLabelText("Audio dùng chung cho câu 11–20") as HTMLAudioElement;
  const pause = jest.fn();
  Object.defineProperty(second, "pause", { configurable: true, value: pause });
  fireEvent.play(first);
  expect(pause).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(pause).toHaveBeenCalledTimes(2);
});
