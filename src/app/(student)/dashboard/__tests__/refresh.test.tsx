/** @jest-environment jsdom */
import {act,render,cleanup,screen} from '@testing-library/react';
import type {ComponentProps} from 'react';
import Dashboard from '../dashboard-client';
import {markLearningScoresUpdated} from '@/lib/learning-scores';
import {apiFetch} from '@/lib/api/client';
import {celebrate} from '@/lib/celebration';
import type {CheckInResponse} from '@/lib/daily-checkin';
let mockInView=false;
let mockConfirmCheckIn: ((reward: CheckInResponse) => void) | undefined;
jest.mock('@/lib/celebration',()=>({celebrate:jest.fn(),celebrateWithin:jest.fn().mockResolvedValue(jest.fn())}));
jest.mock('@/lib/api/client',()=>({apiFetch:jest.fn()}));
jest.mock('next/navigation',()=>({useRouter:()=>({refresh:jest.fn()})}));
jest.mock('framer-motion',()=>{const React=jest.requireActual('react');return {useInView:()=>mockInView,motion:new Proxy({},{get:(_t,tag)=>({children}:{children:unknown})=>React.createElement(tag,null,children)})};});
jest.mock('@/components/dashboard/band-progress-chart',()=>({BandProgressChart:()=>null}));
jest.mock('@/components/dashboard/skill-progress',()=>({SkillProgress:()=>null}));
jest.mock('@/components/dashboard/daily-checkin-card',()=>({DailyCheckInCard:({onConfirmed}:{onConfirmed:(reward:CheckInResponse)=>void})=>{mockConfirmCheckIn=onConfirmed;return null;}}));
jest.mock('@/components/gamification/xp-gem',()=>({XpGem:()=>null}));
jest.mock('@/components/gamification/animated-flame',()=>({AnimatedFlame:()=>null}));
jest.mock('@/components/gamification/level-badge',()=>({LevelBadge:()=>null}));
const empty={score:null,sampleCount:0,questionCount:0,updatedAt:null};
const summary={currentHskLevel:1,estimatedHskLevel:null,evidence:null,hskLevel:1,skills:{Listening:empty,Reading:empty,Writing:empty,Speaking:empty},writingProgress:{completed:0,total:0,correctStrokes:0,totalStrokes:0,mistakes:0}};
const props={topics:[],student:{current_band:1,target_band:3},xpTotal:0,streak:null,levelInfo:{level:1,title:'Demo',currentXp:0,xpForNextLevel:1000,progressPercent:0},initialAssessment:summary,assessmentLoadedAt:100000,analytics:{timeZone:"Asia/Ho_Chi_Minh",studyDate:"2026-11-13",checkedInToday:false,timeTodaySeconds:0,time7DaysSeconds:0,timeTotalSeconds:0,chart7DaysSeconds:[],chart7Dates:[],longestStreak:0,totalDaysStudied:0,weekDaysStudied:0,weekAverageSeconds:0,weekLongestStreak:0,activityTimes:{review:0,practice:0,exam:0,pk:0},vocabularyStats:{learnedCount:0,masteredCount:0,learningCount:0,reviewCount:0}}} as ComponentProps<typeof Dashboard>;
beforeEach(()=>{mockInView=false;jest.mocked(celebrate).mockClear();jest.useFakeTimers({doNotFake:['queueMicrotask']});jest.setSystemTime(100000);sessionStorage.clear();jest.mocked(apiFetch).mockReset().mockResolvedValue(summary);});
afterEach(()=>{cleanup();jest.useRealTimers();});
it('does not replay full-screen celebration on visits by a learner with an existing streak',()=>{
 mockInView=true;
 const streak={current_streak:2,longest_streak:2};
 const first=render(<Dashboard {...props} streak={streak}/>);
 act(()=>jest.advanceTimersByTime(1200));first.unmount();
 render(<Dashboard {...props} streak={streak}/>);act(()=>jest.advanceTimersByTime(1200));
 expect(celebrate).not.toHaveBeenCalled();
});
it('does not duplicate hydrated SSR requests and throttles rapid focus refreshes',async()=>{
 render(<Dashboard {...props}/>);expect(apiFetch).not.toHaveBeenCalled();
 await act(async()=>{window.dispatchEvent(new Event('focus'));});expect(apiFetch).not.toHaveBeenCalled();
 act(()=>jest.advanceTimersByTime(30000));await act(async()=>{window.dispatchEvent(new Event('focus'));});expect(apiFetch).toHaveBeenCalledTimes(1);
 await act(async()=>{window.dispatchEvent(new Event('focus'));});expect(apiFetch).toHaveBeenCalledTimes(1);
 await act(async()=>{window.dispatchEvent(new Event('hsk-scores-updated'));});expect(apiFetch).toHaveBeenCalledTimes(2);
});
it('ignores stale responses after unmount and loads when SSR data is unavailable',async()=>{
 let resolve!:(value:unknown)=>void;jest.mocked(apiFetch).mockImplementation(()=>new Promise(r=>{resolve=r;}));
 const view=render(<Dashboard {...props} initialAssessment={null}/>);expect(apiFetch).toHaveBeenCalledTimes(1);
 view.unmount();await act(async()=>resolve(summary));
});

it('refreshes cached back-navigation props after a submission elsewhere',async()=>{
 act(()=>{jest.setSystemTime(100001);markLearningScoresUpdated();});
 render(<Dashboard {...props}/>);await act(async()=>{});expect(apiFetch).toHaveBeenCalledTimes(1);
});

it('shows current EXP and the next threshold, including a level-up reward before refresh',()=>{
 const initial={...props,xpTotal:998,levelInfo:{level:1,title:'Cấp 1',currentXp:998,xpForNextLevel:1000,progressPercent:99.8}};
 const view=render(<Dashboard {...initial}/>);
 expect(screen.getByText('998 / 1.000 EXP')).toBeTruthy();
 act(()=>mockConfirmCheckIn?.({studyDate:'2026-11-24',alreadyCheckedIn:false,expAwarded:5,totalExp:1003,level:2,currentExp:3}));
 expect(screen.getByText('3 / 2.000 EXP')).toBeTruthy();
 expect(screen.getByText('Cấp 2')).toBeTruthy();
 view.rerender(<Dashboard {...initial} xpTotal={1010} levelInfo={{level:2,title:'Cấp 2',currentXp:10,xpForNextLevel:2000,progressPercent:0.5}}/>);
 expect(screen.getByText('10 / 2.000 EXP')).toBeTruthy();
});

const RealCheckIn = jest.requireActual<typeof import("@/components/dashboard/daily-checkin-card")>("@/components/dashboard/daily-checkin-card").DailyCheckInCard;
it("deduplicates attendance focus/visibility checks and honors fresh SSR status", async () => {
 jest.setSystemTime(new Date("2026-11-13T10:00:00Z"));
 let resolve!:(value:unknown)=>void;
 jest.mocked(apiFetch).mockImplementation(()=>new Promise(r=>{resolve=r;}));
 render(<RealCheckIn initialAnalytics={props.analytics}/>);
 await act(async()=>{window.dispatchEvent(new Event("focus"));});
 expect(apiFetch).not.toHaveBeenCalled();
 act(()=>jest.advanceTimersByTime(30000));
 await act(async()=>{window.dispatchEvent(new Event("focus"));document.dispatchEvent(new Event("visibilitychange"));});
 expect(apiFetch).toHaveBeenCalledTimes(1);
 await act(async()=>resolve(props.analytics));
 await act(async()=>{window.dispatchEvent(new Event("focus"));});
 expect(apiFetch).toHaveBeenCalledTimes(1);
});
it("retries stale-day attendance after a failed midnight refresh", async () => {
 jest.setSystemTime(new Date("2026-11-13T17:00:01Z"));
 jest.mocked(apiFetch).mockRejectedValueOnce(new Error("offline")).mockResolvedValue({...props.analytics,studyDate:"2026-11-14"});
 render(<RealCheckIn initialAnalytics={props.analytics}/>);
 await act(async()=>{});
 expect(apiFetch).toHaveBeenCalledTimes(1);
 await act(async()=>{jest.advanceTimersByTime(30000);});
 expect(apiFetch).toHaveBeenCalledTimes(2);
});

it("preserves the full topic total while rendering only ten topic cards", () => {
 const topics=Array.from({length:10},(_,i)=>({topicKey:String(i),titleVi:`Bài ${i+1}`,titleCn:"你好",hskLevel:1,totalSets:2}));
 render(<Dashboard {...props} topics={topics} topicCount={107}/>);
 expect(screen.getByText("Bạn có 107 chủ đề bài học HSK.")).toBeTruthy();
 expect(screen.getAllByText("2 bài luyện",{exact:false})).toHaveLength(10);
 const destinations = topics.map(topic => {
  const href = screen.getByText(topic.titleVi).closest("a")!.getAttribute("href")!;
  const url = new URL(href, "http://localhost");
  expect(url.pathname).toBe("/practice");
  expect(url.searchParams.get("topic")).toBe(topic.topicKey);
  expect(url.searchParams.get("hskLevel")).toBe(String(topic.hskLevel));
  return href;
 });
 expect(new Set(destinations).size).toBe(10);
 expect(screen.getByRole("link", {name: /Xem tất cả bài học/}).getAttribute("href")).toBe("/learning");
});

it("opens the selected topic with its own HSK level and safely encoded key", () => {
 const topics = [
  {topicKey:"HSK2-L01",titleVi:"Topic two",titleCn:"",hskLevel:2,totalSets:4},
  {topicKey:"HSK3 & 你好",titleVi:"Topic three",titleCn:"",hskLevel:3,totalSets:3},
 ];
 render(<Dashboard {...props} topics={topics}/>);
 for (const topic of topics) {
  const href = screen.getByText(topic.titleVi).closest("a")!.getAttribute("href")!;
  const url = new URL(href, "http://localhost");
  expect(url.pathname).toBe("/practice");
  expect(Object.fromEntries(url.searchParams)).toEqual({topic:topic.topicKey,hskLevel:String(topic.hskLevel)});
 }
});

it("guides a new learner directly to the study-goals fields in their profile", () => {
 render(<Dashboard {...props} student={{current_band:null,target_band:null}}/>);
 const setup = screen.getByRole("link", {name:"Thiết lập mục tiêu học"});
 expect(setup.getAttribute("href")).toBe("/profile#study-goals");
 expect(screen.queryByRole("link", {name:"Chỉnh sửa mục tiêu"})).toBeNull();
});

it("offers goal editing instead of first-time setup once the learner has a goal", () => {
 render(<Dashboard {...props}/>);
 expect(screen.getByRole("link", {name:"Chỉnh sửa mục tiêu"}).getAttribute("href")).toBe("/profile#study-goals");
 expect(screen.queryByRole("link", {name:"Thiết lập mục tiêu học"})).toBeNull();
});

it("explains that the current level has no practice content while keeping the full catalog reachable", () => {
 render(<Dashboard {...props} topics={[]} student={{current_band:3,target_band:3}}/>);
 expect(screen.getByText("Chưa có bài luyện ở cấp HSK hiện tại.")).toBeTruthy();
 expect(screen.getByRole("link", {name:/Xem tất cả bài học/}).getAttribute("href")).toBe("/learning");
});
