/** @jest-environment jsdom */
import {act,fireEvent,render,screen,cleanup} from '@testing-library/react';
import {PkArena} from '../pk-arena';
import {apiFetch,ApiError} from '@/lib/api/client';
import {pkStorageKey,parsePkMessage} from '@/types/pk';
jest.mock('next/navigation',()=>({useRouter:()=>router}));
jest.mock('@/lib/api/client',()=>{const original=jest.requireActual('@/lib/api/client');return {...original,apiFetch:jest.fn()};});
const router={refresh:jest.fn()};
class Stream {
 static all:Stream[]=[];onmessage:((e:{data:string})=>void)|null=null;onerror:(()=>void)|null=null;close=jest.fn();
 constructor(){Stream.all.push(this);}
 send(event:string,payload:unknown){this.onmessage?.({data:JSON.stringify({event,payload})});}
}
const roomId='6caec492-df62-4013-83a4-bb557c563846';
const fixture=()=>({revision:1,roomId,users:[7,8],players:[{id:7,name:'Self',photoUrl:null,hskLevel:1},{id:8,name:'Other',photoUrl:null,hskLevel:1}],readyUserIds:[],index:0,stage:'waiting',turnUserId:7,deadline:Date.now()+10000,serverNow:Date.now(),scores:[],questions:[{id:1,hanzi:'你好',pinyin:'ni hao',prompt:'Choose',options:[{id:'A',text:'hello'},{id:'B',text:'thanks'}]}]});
const originalFetch=global.fetch,originalSource=global.EventSource;
beforeEach(()=>{jest.useFakeTimers({doNotFake:["queueMicrotask"]});jest.setSystemTime(100000);Stream.all=[];sessionStorage.clear();jest.mocked(apiFetch).mockReset().mockResolvedValue({});global.EventSource=Stream as unknown as typeof EventSource;global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({ok:true})});});
afterEach(()=>{cleanup();jest.useRealTimers();global.fetch=originalFetch;global.EventSource=originalSource;});
async function mount(){render(<PkArena userId={7} level={1} backendOrigin="https://api.example/api/v1"/>);await act(async()=>{});return Stream.all[0]!;}
it('has no ticking timer in the lobby and keeps storage independent by account/backend',async()=>{
 const stream=await mount();act(()=>stream.send('pk_connected',{count:2,hskLevel:1}));expect(jest.getTimerCount()).toBe(0);
 expect(pkStorageKey('a',7,1)).not.toBe(pkStorageKey('a',8,1));expect(pkStorageKey('a',7,1)).not.toBe(pkStorageKey('b',7,1));
});
it('handles ready updates, rejects old revisions and colors a wrong selected answer',async()=>{
 const stream=await mount(),state=fixture();act(()=>{stream.send('pk_connected',{count:2,hskLevel:1});stream.send('match_found',state);stream.send('player_ready_update',{...state,revision:2,readyUserIds:[7]});});
 expect(screen.getByText('Đã sẵn sàng · Chờ đối thủ')).toBeTruthy();
 act(()=>stream.send('game_started',{...state,revision:3,stage:'playing'}));
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:/B. thanks/})));
 act(()=>stream.send('answer_result',{...state,revision:4,stage:'reveal',userId:7,questionId:1,optionId:'B',correct:false,correctOptionId:'A'}));
 expect(screen.getByRole('button',{name:/B. thanks/}).className).toContain('border-danger');expect(screen.getByRole('status').textContent).toContain('chưa đúng');
 act(()=>stream.send('turn_changed',{...state,revision:2,stage:'playing'}));expect(screen.getByRole('status').textContent).toContain('chưa đúng');
});
it('ignores malformed/foreign events and removes countdown timers on exit',async()=>{
 const stream=await mount();expect(parsePkMessage({event:'game_started',payload:{roomId}})).toBeNull();
 act(()=>stream.send('match_found',{...fixture(),users:[8,9]}));expect(screen.queryByText('Self')).toBeNull();
 act(()=>stream.send('match_found',fixture()));expect(jest.getTimerCount()).toBe(1);cleanup();expect(jest.getTimerCount()).toBe(0);
});
it('retries at most five times and stops on authentication refusal',async()=>{
 jest.mocked(apiFetch).mockRejectedValue(new Error('offline'));await mount();
 for(const delay of [1000,2000,4000,8000,16000])await act(async()=>{jest.advanceTimersByTime(delay);});
 expect(apiFetch).toHaveBeenCalledTimes(6);expect(jest.getTimerCount()).toBe(0);cleanup();
 jest.mocked(apiFetch).mockClear().mockRejectedValue(new ApiError('Pending',403));await mount();expect(apiFetch).toHaveBeenCalledTimes(1);expect(jest.getTimerCount()).toBe(0);
});
