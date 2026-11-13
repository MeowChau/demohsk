/** @jest-environment jsdom */
import { act,render,screen } from "@testing-library/react";
import { Attempt } from "../../attempt-form";
beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date("2026-11-13T00:00:00Z"));});
afterEach(()=>{jest.useRealTimers();});
it("submits once at deadline, including when focus resumes",()=>{
  const expire=jest.fn();render(<Attempt.Timer duration={1} deadline={Date.now()+2000} version={0} stopped={false} blocked={false} onExpire={expire}/>);
  act(()=>{jest.advanceTimersByTime(3000);window.dispatchEvent(new Event("focus"));});expect(expire).toHaveBeenCalledTimes(1);
});
it("waits for speech work then submits and gives a retake its own timer",()=>{
  const expire=jest.fn();const start=Date.now();const view=render(<Attempt.Timer duration={1} deadline={start+1000} version={0} stopped={false} blocked onExpire={expire}/>);
  act(()=>jest.advanceTimersByTime(2000));expect(expire).not.toHaveBeenCalled();
  view.rerender(<Attempt.Timer duration={1} deadline={start+1000} version={0} stopped={false} blocked={false} onExpire={expire}/>);expect(expire).toHaveBeenCalledTimes(1);
  view.rerender(<Attempt.Timer duration={1} deadline={Date.now()+60000} version={1} stopped={false} blocked={false} onExpire={expire}/>);
  expect(expire).toHaveBeenCalledTimes(1);expect(screen.getByText(/01:00/)).toBeTruthy();
  act(()=>jest.advanceTimersByTime(60000));expect(expire).toHaveBeenCalledTimes(2);
});
it("cleans intervals on unmount",()=>{
  const view=render(<Attempt.Timer duration={1} deadline={Date.now()+60000} version={0} stopped={false} blocked={false} onExpire={()=>{}}/>);
  view.unmount();expect(jest.getTimerCount()).toBe(0);
});
