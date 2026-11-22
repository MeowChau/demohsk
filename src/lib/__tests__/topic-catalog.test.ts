import {sortTopics,filterTopics,paginateTopics} from "../topic-catalog";
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
