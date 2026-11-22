import {createAttemptStore} from '../attempt-store';
import {scorePracticeAttempt} from '@/lib/practice-scoring';
import type {SubmittedLearningScore} from '@/lib/learning-scores';
it('keeps summary and review distinct and accepts the server result once',()=>{
 const s=createAttemptStore();const payload={attemptId:'a',kind:'exam' as const,sourceId:1,answers:{}};
 s.getState().review(true);expect(s.getState().phase).toBe('doing');
 s.getState().claim(payload);s.getState().complete({...scorePracticeAttempt([],{}),currentHskLevel:1} as SubmittedLearningScore);
 expect(s.getState().phase).toBe('saved');s.getState().review(true);expect(s.getState().phase).toBe('reviewing');
 s.getState().review(p=>!p);expect(s.getState().phase).toBe('saved');expect(s.getState().claim(payload)).toBe(false);
 s.getState().reset();expect(s.getState().result).toBeNull();expect(s.getState().phase).toBe('doing');
});
