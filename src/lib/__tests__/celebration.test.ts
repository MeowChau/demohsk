/** @jest-environment jsdom */
import { celebrate, celebrateWithin } from "../celebration";
import confetti from "canvas-confetti";
jest.mock("canvas-confetti", () => ({__esModule: true, default: Object.assign(jest.fn(), {create:jest.fn()})}));
const effect = jest.mocked(confetti);
beforeEach(() => {
  effect.mockReset();
  jest.mocked(confetti.create).mockReset();
  document.body.innerHTML = "";
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

it("keeps achievement particles inside the supplied canvas and exposes cleanup",async()=>{
 const canvas=document.createElement("canvas");document.body.append(canvas);
 const reset=jest.fn();const burst=Object.assign(jest.fn(),{reset});
 jest.mocked(confetti.create).mockReturnValue(burst);
 const stop=await celebrateWithin(canvas,{particleCount:28});
 expect(confetti.create).toHaveBeenCalledWith(canvas,{resize:true,disableForReducedMotion:true});
 expect(burst).toHaveBeenCalledTimes(1);expect(effect).not.toHaveBeenCalled();
 stop();expect(reset).toHaveBeenCalledTimes(1);
});
it("does not create an achievement canvas for reduced motion or after unmount",async()=>{
 const canvas=document.createElement("canvas");document.body.append(canvas);
 jest.mocked(window.matchMedia).mockReturnValue({matches:true} as MediaQueryList);
 await celebrateWithin(canvas,{});expect(confetti.create).not.toHaveBeenCalled();
 jest.mocked(window.matchMedia).mockReturnValue({matches:false} as MediaQueryList);
 const pending=celebrateWithin(canvas,{});canvas.remove();await pending;
 expect(confetti.create).not.toHaveBeenCalled();
});
