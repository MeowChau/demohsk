/** @jest-environment jsdom */
import { celebrate } from "../celebration";
import confetti from "canvas-confetti";
jest.mock("canvas-confetti", () => ({__esModule: true, default: jest.fn()}));
const effect = jest.mocked(confetti);
beforeEach(() => {
  effect.mockReset();
  Object.defineProperty(window, "matchMedia", {configurable: true, value: jest.fn().mockReturnValue({matches: false})});
});
it("runs the optional shared effect with reduced-motion protection", async () => {
  await celebrate({particleCount: 60});
  expect(effect).toHaveBeenCalledWith({particleCount: 60, disableForReducedMotion: true});
});
it("skips decorative work when the user requests reduced motion", async () => {
  jest.mocked(window.matchMedia).mockReturnValue({matches: true} as MediaQueryList);
  await celebrate({particleCount: 60});
  expect(effect).not.toHaveBeenCalled();
});
it("does not reject the study action if optional decoration fails", async () => {
  effect.mockImplementation(() => {throw new Error("optional chunk failure");});
  await expect(celebrate({})).resolves.toBeUndefined();
});
