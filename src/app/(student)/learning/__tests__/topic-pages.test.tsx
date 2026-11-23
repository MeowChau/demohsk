/** @jest-environment jsdom */
import { cleanup, render, screen, within } from "@testing-library/react";
import LearningPage from "../page";
import VocabularyPage from "../../vocabulary/page";
import { getTopics, getWords, getLessonWords } from "@/lib/api/catalog";
import { getApiUser } from "@/lib/api/server";
import type { HskTopic, HskWord } from "@/lib/api/types";

jest.mock("@/lib/api/catalog",()=>({getTopics:jest.fn(),getWords:jest.fn(),getLessonWords:jest.fn()}));
jest.mock("@/lib/api/server",()=>({getApiUser:jest.fn()}));
jest.mock("next/navigation",()=>({useRouter:()=>({refresh:jest.fn()})}));
jest.mock("@/components/shell/study-tracker",()=>({StudyTracker:()=>null}));

const lesson: HskTopic={id:"HSK1-L01",topicKey:"HSK1-L01",titleVi:"Bài 1: Chào bạn, AI Tiểu Ngữ!",titleCn:"AI 小语，你好！",pinyin:"AI Xiǎoyǔ, nǐ hǎo!",hskLevel:1,totalSets:2,totalQuestions:11,vocabularyCount:0,listeningCount:1,readingCount:1,speakingCount:0,writingCount:0};
const reviewName="Bài 1: Ôn từ vựng HSK 1 (biên soạn)";
const review: HskTopic={...lesson,id:reviewName,topicKey:reviewName,titleVi:reviewName,titleCn:reviewName,pinyin:"",vocabularyCount:20,totalSets:4};
const extraName="Bài 16: Ôn từ vựng HSK 1 (biên soạn)";
const extra: HskTopic={...review,id:extraName,topicKey:extraName,titleVi:extraName,titleCn:extraName,vocabularyCount:1};
const word: HskWord={id:321,hanzi:"你好",pinyin:"nǐ hǎo",meaning:"Xin chào",hskLevel:1,topic:extraName};

beforeEach(()=>{
 jest.mocked(getTopics).mockResolvedValue([review,lesson,extra]);
 jest.mocked(getApiUser).mockResolvedValue({currentHskLevel:1} as Awaited<ReturnType<typeof getApiUser>>);
 jest.mocked(getWords).mockResolvedValue({data:[word],total:1,page:1,limit:9,totalPages:1});
 jest.mocked(getLessonWords).mockResolvedValue([{...word,topic:reviewName}]);
});
afterEach(()=>{cleanup();jest.clearAllMocks();});

it("shows one textbook card with separate links to textbook practice and its existing vocabulary",async()=>{
 render(await LearningPage({searchParams:Promise.resolve({page:"999"})}));
 expect(screen.getAllByRole("heading",{level:2}).map(item=>item.textContent)).toEqual([lesson.titleVi]);
 expect(screen.getByText("1 chủ đề · 9 chủ đề mỗi trang")).toBeTruthy();
 const words=screen.getByRole("link",{name:"Học 20 từ"}) as HTMLAnchorElement;
 expect(new URL(words.href).searchParams.get("topic")).toBe(reviewName);
 const practice=screen.getByRole("link",{name:"2 bài luyện"}) as HTMLAnchorElement;
 expect(new URL(practice.href).searchParams.get("topic")).toBe(lesson.topicKey);
});

it("finds vocabulary by textbook title and hides unmatched reviews from lesson cards",async()=>{
 render(await VocabularyPage({searchParams:Promise.resolve({search:"AI Tiểu Ngữ"})}));
 expect(screen.getAllByRole("heading",{level:3}).map(item=>item.textContent)).toEqual([lesson.titleVi+" (từ vựng)"]);
 const link=screen.getByRole("link",{name:"Học bằng flashcard"}) as HTMLAnchorElement;
 expect(new URL(link.href).searchParams.get("topic")).toBe(reviewName);
 expect(screen.queryByText(/bổ sung/)).toBeNull();
});

it("keeps unmatched words and their source identifiers accessible in list mode",async()=>{
 render(await VocabularyPage({searchParams:Promise.resolve({view:"list",topic:extraName})}));
 expect(getWords).toHaveBeenCalledWith(expect.objectContaining({topic:extraName,view:"list"}),1);
 expect(screen.getByRole("heading",{name:"你好"})).toBeTruthy();
 expect(screen.getByText("Chủ đề: HSK 1 · Bài 16 bổ sung (từ vựng)")).toBeTruthy();
 expect(within(screen.getByRole("combobox",{name:"Chủ đề"})).getByRole("option",{name:"HSK 1 · Bài 16 bổ sung (từ vựng)"})).toBeTruthy();
});

it("uses the textbook name inside the flashcard lesson without changing the request key",async()=>{
 render(await VocabularyPage({searchParams:Promise.resolve({view:"cards",topic:reviewName})}));
 expect(getLessonWords).toHaveBeenCalledWith(expect.objectContaining({topic:reviewName}));
 expect(screen.getByRole("heading",{name:lesson.titleVi+" (từ vựng)"})).toBeTruthy();
 expect(screen.getByText(/1 từ cùng chủ đề/)).toBeTruthy();
});
