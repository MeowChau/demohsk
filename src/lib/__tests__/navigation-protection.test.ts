/** @jest-environment jsdom */
import {installNavigationProtection} from "../navigation-protection";
it("blocks real links, allows anchors/modifier keys and restores browser methods on disposal",()=>{
 const navigate=jest.fn(),block=jest.fn();const original=history.pushState;const c=installNavigationProtection(navigate);c.setBlocker(block);
 history.pushState({},"","/exams/1/attempt");history.replaceState({},"","/exams/1/attempt");
 const a=document.createElement("a");a.href="/exams/1";document.body.appendChild(a);
 a.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true}));expect(block).toHaveBeenCalledTimes(1);expect(navigate).not.toHaveBeenCalled();
 block.mock.calls[0]![0]();expect(navigate).toHaveBeenCalledWith("/exams/1");
 a.href="/exams/1/attempt#q1";a.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true}));expect(block).toHaveBeenCalledTimes(1);
 c.setBlocker(null);const direct=jest.fn();c.requestLeave(direct);expect(direct).toHaveBeenCalledTimes(1);
 c.dispose();a.remove();expect(history.pushState).toBe(original);
});
it("registers and removes the beforeunload guard with the blocker",()=>{
 const c=installNavigationProtection(()=>{});c.setBlocker(()=>{});const e=new Event("beforeunload",{cancelable:true});window.dispatchEvent(e);expect(e.defaultPrevented).toBe(true);
 c.setBlocker(null);const f=new Event("beforeunload",{cancelable:true});window.dispatchEvent(f);expect(f.defaultPrevented).toBe(false);c.dispose();
});
