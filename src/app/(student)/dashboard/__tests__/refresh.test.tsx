/** @jest-environment jsdom */
import {act,render,cleanup,screen} from '@testing-library/react';
import type {ComponentProps} from 'react';
import Dashboard from '../dashboard-client';
import {markLearningScoresUpdated} from '@/lib/learning-scores';
import {apiFetch} from '@/lib/api/client';
jest.mock('@/lib/api/client',()=>({apiFetch:jest.fn()}));
jest.mock('next/navigation',()=>({useRouter:()=>({refresh:jest.fn()})}));
jest.mock('framer-motion',()=>{const React=jest.requireActual('react');return {useInView:()=>false,motion:new Proxy({},{get:(_t,tag)=>({children}:{children:unknown})=>React.createElement(tag,null,children)})};});
jest.mock('@/components/dashboard/band-progress-chart',()=>({BandProgressChart:()=>null}));
jest.mock('@/components/dashboard/skill-progress',()=>({SkillProgress:()=>null}));
jest.mock('@/components/dashboard/daily-checkin-card',()=>({DailyCheckInCard:()=>null}));
jest.mock('@/components/gamification/xp-gem',()=>({XpGem:()=>null}));
jest.mock('@/components/gamification/animated-flame',()=>({AnimatedFlame:()=>null}));
jest.mock('@/components/gamification/level-badge',()=>({LevelBadge:()=>null}));
const empty={score:null,sampleCount:0,questionCount:0,updatedAt:null};
const summary={currentHskLevel:1,estimatedHskLevel:null,evidence:null,hskLevel:1,skills:{Listening:empty,Reading:empty,Writing:empty,Speaking:empty},writingProgress:{completed:0,total:0,correctStrokes:0,totalStrokes:0,mistakes:0}};
const props={topics:[],student:{current_band:1,target_band:3},xpTotal:0,streak:null,levelInfo:{level:1,title:'Demo',currentXp:0,xpForNextLevel:1000,progressPercent:0},initialAssessment:summary,assessmentLoadedAt:100000,analytics:{timeZone:"Asia/Ho_Chi_Minh",studyDate:"2026-11-13",checkedInToday:false,timeTodaySeconds:0,time7DaysSeconds:0,timeTotalSeconds:0,chart7DaysSeconds:[],chart7Dates:[],longestStreak:0,totalDaysStudied:0,weekDaysStudied:0,weekAverageSeconds:0,weekLongestStreak:0,activityTimes:{review:0,practice:0,exam:0,pk:0},vocabularyStats:{learnedCount:0,masteredCount:0,learningCount:0,reviewCount:0}}} as ComponentProps<typeof Dashboard>;
beforeEach(()=>{jest.useFakeTimers({doNotFake:['queueMicrotask']});jest.setSystemTime(100000);sessionStorage.clear();jest.mocked(apiFetch).mockReset().mockResolvedValue(summary);});
afterEach(()=>{cleanup();jest.useRealTimers();});
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
 expect(screen.getAllByText("2 bài học",{exact:false})).toHaveLength(10);
});
