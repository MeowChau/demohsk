jest.mock("server-only",()=>({}));
jest.mock("react",()=>({...jest.requireActual("react"),cache:(fn:unknown)=>fn}));
jest.mock("next/headers",()=>({cookies:jest.fn()}));
jest.mock("next/navigation",()=>({redirect:jest.fn((url:string)=>{throw new Error("REDIRECT:"+url);})}));
import {cookies} from "next/headers";
import {getApiUser,requireApiUser,serverApi} from "../server";
import {requireOnboarding} from "@/lib/auth/require-onboarding";
import {loginDestination} from "@/lib/auth/login-destination";
import type {HskUser} from "../types";
const fetchMock=jest.fn();const original=global.fetch;
const user:HskUser={id:7,username:"Learner",email:null,level:1,currentExp:0,role:{id:2}};
function session(token:string|null){jest.mocked(cookies).mockResolvedValue({get:()=>token?{value:token}:undefined} as unknown as Awaited<ReturnType<typeof cookies>>);}
beforeEach(()=>{fetchMock.mockReset();global.fetch=fetchMock;session("fixture-token");});afterAll(()=>{global.fetch=original;});
it("does not call the backend for a guest and redirects protected layouts",async()=>{
 session(null);expect(await getApiUser()).toBeNull();expect(fetchMock).not.toHaveBeenCalled();await expect(requireApiUser()).rejects.toThrow("REDIRECT:/login");
});
it("attaches auth server-side and never caches private responses",async()=>{
 fetchMock.mockResolvedValue(new Response(JSON.stringify(user)));expect(await requireOnboarding()).toEqual(user);
 const options=fetchMock.mock.calls[0]![1];expect(options.headers.get("Authorization")).toBe("Bearer fixture-token");expect(options.cache).toBe("no-store");
});
it.each([1,3])("redirects role %s to the separate administration application",async role=>{
 fetchMock.mockResolvedValue(new Response(JSON.stringify({...user,role:{id:role}})));await expect(requireOnboarding()).rejects.toThrow("REDIRECT:http://localhost:3000");
});
it("distinguishes an expired token from backend downtime",async()=>{
 fetchMock.mockResolvedValue(new Response("{}",{status:401}));expect(await getApiUser()).toBeNull();
 fetchMock.mockRejectedValue(new Error("network"));await expect(getApiUser()).rejects.toMatchObject({status:503});
});
it("preserves field errors and handles empty HTTP 204",async()=>{
 fetchMock.mockResolvedValue(new Response(JSON.stringify({statusCode:400,code:"BAD_REQUEST",errors:{email:"emailAlreadyExists"}}),{status:400}));
 await expect(serverApi("profile",{body:"{}",method:"PATCH"})).rejects.toMatchObject({status:400,fieldErrors:{email:expect.any(String)}});
 fetchMock.mockResolvedValue(new Response(null,{status:204}));expect(await serverApi("noop")).toBeNull();
});
it.each(["https://evil.test","//evil.test","/\\evil.test",null])("rejects unsafe login destinations %s",target=>{expect(loginDestination(user,target)).toBe("/dashboard");});
it("keeps trusted relative destinations and role-specific routes",()=>{
 expect(loginDestination(user,"/exams/1?x=1#q2")).toBe("/exams/1?x=1#q2");expect(loginDestination({...user,role:{id:1}})).toBe("/admin");expect(loginDestination({...user,role:{id:3}})).toBe("/teacher");
});
