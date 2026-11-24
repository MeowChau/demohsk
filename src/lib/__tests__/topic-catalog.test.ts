import {sortTopics,filterTopics,paginateTopics,getTextbookTopics,getVocabularyTopics,getVocabularyLessons,vocabularyForLesson} from "../topic-catalog";
import {hskLevelPriority,prioritizeCatalog} from "../catalog-query";
import type {HskTopic} from "../api/types";
const topic=(n:number,level=1)=>({id:String(n),topicKey:`HSK${level}-L${n}`,titleVi:`Bài ${n}`,titleCn:"你好",pinyin:"nǐ hǎo",hskLevel:level,totalSets:1,totalQuestions:20,vocabularyCount:10,listeningCount:1,readingCount:0,writingCount:0,speakingCount:0}) satisfies HskTopic;
it("orders lessons naturally and paginates 205 items without duplicates or omissions",()=>{
 const input=Array.from({length:205},(_,i)=>topic(205-i));const sorted=sortTopics(input);expect(sorted[0]!.titleVi).toBe("Bài 1");
 const pages=Array.from({length:23},(_,i)=>paginateTopics(sorted,i+1));expect(pages[0]!.data).toHaveLength(9);expect(pages.flatMap(x=>x.data)).toHaveLength(205);
 expect(new Set(pages.flatMap(x=>x.data.map(y=>y.id))).size).toBe(205);expect(paginateTopics([],99).page).toBe(1);expect(paginateTopics(sorted,999).page).toBe(23);
});
it("filters Chinese, Vietnamese and pinyin and prioritizes nearby HSK",()=>{
 const input=[topic(10),topic(2),topic(1,3)];expect(sortTopics(input).map(x=>x.topicKey)).toEqual(["HSK1-L2","HSK1-L10","HSK3-L1"]);
 expect(filterTopics(input,"你好")).toHaveLength(3);expect(filterTopics(input,"bài 10")).toHaveLength(1);
 expect(hskLevelPriority(3).slice(0,3)).toEqual([3,4,2]);expect(hskLevelPriority(null)[0]).toBe(1);expect(prioritizeCatalog(input,3)[0]!.hskLevel).toBe(3);
});

const textbook = (number: number, level = 1): HskTopic => ({
 ...topic(number, level), topicKey: `HSK${level}-L${String(number).padStart(2,"0")}`,
 titleVi: level === 1 ? `Bài ${number}: Chào bạn ${number}!` : `Bài ${number}: Du lịch ${number}`,
 vocabularyCount: 0,
});
const review = (number: number, level = 1): HskTopic => {
 const title = `Bài ${number}: Ôn từ vựng HSK ${level} (biên soạn)`;
 return {...topic(number,level),id:title,topicKey:title,titleVi:title,titleCn:title,pinyin:"",vocabularyCount:20};
};

it("keeps textbook lessons distinct from compiled reviews and unrelated skill topics before pagination",()=>{
 const input=[review(1),textbook(2),{...review(3),topicKey:"Đọc theo giáo trình mở"},textbook(1),review(2)];
 const lessons=sortTopics(getTextbookTopics(input));
 expect(lessons.map(item=>item.topicKey)).toEqual(["HSK1-L01","HSK1-L02"]);
 expect(paginateTopics(lessons,1,1)).toMatchObject({total:2,totalPages:2,data:[textbook(1)]});
 expect(input).toHaveLength(5);
});

it("uses the matching textbook title within each HSK level while preserving vocabulary identities and counts",()=>{
 const first=review(1),second=review(1,2);
 const input=[second,textbook(1),first,textbook(1,2)];
 const result=getVocabularyTopics(input);
 expect(result.find(item=>item.topicKey===first.topicKey)).toMatchObject({
  id:first.id,topicKey:first.topicKey,titleVi:"Bài 1: Chào bạn 1! (từ vựng)",vocabularyCount:20,totalSets:first.totalSets,
 });
 expect(result.find(item=>item.topicKey===second.topicKey)?.titleVi).toBe("Bài 1: Du lịch 1 (từ vựng)");
 expect(first.titleVi).toBe("Bài 1: Ôn từ vựng HSK 1 (biên soạn)");
 expect(filterTopics(result,"ni hao")).toHaveLength(2);
 expect(filterTopics(result,"你好")).toHaveLength(2);
});

it("keeps renamed vocabulary searchable by textbook title and adds the suffix only once",()=>{
 const input=[textbook(2),review(2)];
 const first=getVocabularyTopics(input);
 expect(filterTopics(first,"Chào bạn 2")).toHaveLength(1);
 expect(getVocabularyTopics([...input.filter(item=>item.vocabularyCount===0),...first])).toEqual(first);
 const renamedBook={...textbook(2),titleVi:"Bài 2: Tên bài khóa đã cập nhật"};
 expect(getVocabularyTopics([renamedBook,review(2)])[0]?.titleVi).toBe("Bài 2: Tên bài khóa đã cập nhật (từ vựng)");
});

it("uses distinct supplementary labels for reviews with no matching textbook instead of borrowing another level's title",()=>{
 const input=[textbook(16,2),review(16),review(26,3)];
 expect(getVocabularyTopics(input).map(item=>item.titleVi)).toEqual([
  "HSK 1 · Bài 16 bổ sung (từ vựng)","HSK 3 · Bài 26 bổ sung (từ vựng)",
 ]);
});

it("links a textbook to its original vocabulary group without mixing the practice topic keys",()=>{
 const lesson=textbook(1),vocabulary=review(1);
 const groups=getVocabularyTopics([lesson,vocabulary,review(1,2)]);
 expect(vocabularyForLesson(lesson,groups)?.topicKey).toBe(vocabulary.topicKey);
 expect(lesson.topicKey).toBe("HSK1-L01");
 expect(vocabularyForLesson(textbook(2),groups)).toBeUndefined();
 const native={...lesson,vocabularyCount:12};
 expect(vocabularyForLesson(lesson,getVocabularyTopics([native,vocabulary]))?.topicKey).toBe(native.topicKey);
});

it("preserves custom vocabulary groups without inventing textbook associations",()=>{
 const custom={...review(1),topicKey:"Chào hỏi tự chọn",titleVi:"Chào hỏi tự chọn"};
 const result=getVocabularyTopics([textbook(1),custom]);
 expect(result[0]?.titleVi).toBe("Chào hỏi tự chọn (từ vựng)");
 expect(vocabularyForLesson(textbook(1),result)).toBeUndefined();
});

it("hides unmatched reviews from lesson cards while keeping them available for the vocabulary list",()=>{
 const input=[textbook(1),review(1),review(16),review(26,3)];
 const lessons=getVocabularyLessons(input);
 expect(lessons.map(item=>item.topicKey)).toEqual([review(1).topicKey]);
 expect(getVocabularyTopics(input)).toHaveLength(3);
 expect(getVocabularyTopics(input).map(item=>item.vocabularyCount)).toEqual([20,20,20]);
});

const greetings = [
 {...topic(1), titleVi:"Bài 1: Chào bạn, AI Tiểu Ngữ!", titleCn:"AI 小语，你好！", pinyin:"AI Xiǎoyǔ, nǐ hǎo!"},
 {...topic(2), titleVi:"Bài 2: Chào các bạn", titleCn:"你们好", pinyin:"nǐmen hǎo"},
];
it.each(["ni hao", "nǐ hǎo", "NI HAO", "  ni   hao  ", "nǐ hǎo".normalize("NFD")])("finds accented pinyin with query %s", query => {
 expect(filterTopics(greetings,query).map(item=>item.topicKey)).toEqual(["HSK1-L1"]);
 expect(greetings[0]!.pinyin).toBe("AI Xiǎoyǔ, nǐ hǎo!");
});
it("preserves Chinese and topic-code searches and accepts unaccented Vietnamese titles",()=>{
 expect(filterTopics(greetings,"小语").map(item=>item.topicKey)).toEqual(["HSK1-L1"]);
 expect(filterTopics(greetings,"hsk1-l2").map(item=>item.topicKey)).toEqual(["HSK1-L2"]);
 expect(filterTopics(greetings,"chao ban").map(item=>item.topicKey)).toEqual(["HSK1-L1"]);
 expect(filterTopics(greetings,"khong co chu de nay")).toEqual([]);
 expect(filterTopics(greetings,"   ")).toEqual(greetings);
});
