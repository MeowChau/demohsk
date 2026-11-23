jest.mock("server-only", () => ({}));
jest.mock("@/lib/api/server", () => ({ serverApi: jest.fn(), requireApiUser: jest.fn() }));
import { serverApi } from "../server";
import { learningViews, testForTaking, profileDetail } from "../learning";
import { getCatalogOverview, getWords, getLessonWords, getDashboardTopics } from "../catalog";
import type { HskUser } from "../types";
const request = jest.mocked(serverApi);
describe("real admin catalog shape", () => {
  beforeEach(() => request.mockReset());
  it("uses username and study goals in the profile without exposing removed personal-name fields", () => {
    const result = profileDetail({ id: 2, username: "learner", email: null, firstName: null, lastName: "Existing surname", fullName: "Admin display name", level: 1, currentExp: 0, currentHskLevel: 3, targetHskLevel: 6, dailyStudyTime: 30 });
    expect(result).toMatchObject({ username: "learner", current_band: 3, target_band: 6, daily_study_time: 30 });
    expect(result).not.toHaveProperty("first_name");
    expect(result).not.toHaveProperty("last_name");
  });
  it("joins practice sets using topicKey instead of the nonexistent topic property", async () => {
    request.mockResolvedValueOnce([{ id: "HSK1-L01", topicKey: "HSK1-L01", titleVi: "Bài 1: Chào bạn, AI Tiểu Ngữ!", titleCn: "AI 小语，你好！", pinyin: "AI Xiǎoyǔ, nǐ hǎo!", hskLevel: 1 }]);
    request.mockResolvedValueOnce({ data: [{ id: 7, title: "Bài luyện nghe", topic: "HSK1-L01" }], totalPages: 1 });
    const user: HskUser = { id: 2, username: "learner", email: null, level: 1, currentExp: 0, currentHskLevel: 1 };
    const result = await learningViews(user);
    expect(result[0]?.course.courseid).toBe("HSK1-L01");
    expect(result[0]?.contents[0]?.file_url).toBe("/practice/sets/7/attempt");
    expect(result[0]?.course.description).toContain("AI 小语，你好！");
  });
  it("keeps partial catalog failures visible without fabricating statistics", async () => {
    const original=global.fetch;
    const fetchMock=jest.fn().mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response(JSON.stringify({data:[],total:12})))
      .mockResolvedValueOnce(new Response(JSON.stringify({data:[],total:12})))
      .mockResolvedValueOnce(new Response("[]"));
    global.fetch=fetchMock;
    try {
      const result=await getCatalogOverview();
      expect(result.words).toBeNull();expect(result.practices).toBe(12);expect(result.available).toBe(false);
      for(const [,options] of fetchMock.mock.calls){expect(options.headers).toBeUndefined();expect(options.next.revalidate).toBe(60);}
      expect(request).not.toHaveBeenCalled();
    } finally {global.fetch=original;}
  });
  it("keeps image-only choices and writing question types from the admin payload", async () => {
    request.mockResolvedValueOnce({ id: 8, title: "Bài luyện", hskLevel: 2, skill: "WRITING", practiceSetQuestions: [
      { question: { id: 41, type: "MULTIPLE_CHOICE", skill: "WRITING", hskLevel: 2, payload: { text: "选择图片", pinyin: "Xuǎnzé túpiàn", translation: "Chọn hình", optionImages: ["https://example.test/a.png", "https://example.test/b.png"] } } },
      { question: { id: 42, type: "ESSAY", skill: "WRITING", hskLevel: 2, payload: { text: "写句子", options: ["朋友", "今天"] } } },
    ] });
    const result = await testForTaking("set-8");
    const choice = result.questionsBySkill.Writing![0]!;
    const essay = result.questionsBySkill.Writing![1]!;
    expect(choice.question).toMatchObject({ type: "MULTIPLE_CHOICE", hskLevel: 2, pinyin: "Xuǎnzé túpiàn", translation: "Chọn hình" });
    expect(choice.options).toEqual([
      { optionid: "A", option_text: "A", image_url: "https://example.test/a.png" },
      { optionid: "B", option_text: "B", image_url: "https://example.test/b.png" },
    ]);
    expect(essay.question.type).toBe("ESSAY"); expect(essay.options).toHaveLength(2);
  });
  it("provides true/false choices and section audio without exposing an answer key", async () => {
    request.mockResolvedValueOnce({ id: 3, title: "Đề HSK", hskLevel: 3, sections: [{ id: 5, title: "听力", audioUrl: "https://example.test/listening.mp3", sectionQuestions: [{ question: { id: 43, type: "TRUE_FALSE", skill: "LISTENING", hskLevel: 3, payload: { text: "判断对错", correctAnswer: "A" } } }] }] });
    const result = await testForTaking("exam-3");
    const item = result.questionsBySkill.Listening![0]!;
    expect(item.options.map(option => option.option_text)).toEqual(["对 · Đúng", "错 · Sai"]);
    expect(item.question.audio_url).toBe("https://example.test/listening.mp3");
    expect(JSON.stringify(result)).not.toContain("correctAnswer");
  });

  it("keeps tracing metadata and suppresses inherited audio for compiled writing lessons", async () => {
    request.mockResolvedValueOnce({ id: 250, title: "HSK 3 · Ôn từ vựng 26 · Viết (biên soạn)", hskLevel: 3, skill: "WRITING", audioUrl: "/shared.mp3", practiceSetQuestions: [{ question: { id: 41, type: "SHORT_ANSWER", skill: "WRITING", hskLevel: 3, payload: { templateId: "write-tracing", text: "Luyện viết: 发烧", pinyin: "fā shāo", audioUrl: "/word.mp3" }, correctAnswer: { rubric: "private" } } }] });
    const result = await testForTaking("set-250");
    expect(result.questionsBySkill.Writing![0]!.question).toMatchObject({ templateId: "write-tracing", question: "Luyện viết: 发烧", pinyin: "fā shāo", audio_url: null });
    expect(result.test.audio_url).toBeNull();
    expect(JSON.stringify(result)).not.toContain("rubric");
  });
});

describe("large personalized catalog",()=>{
 beforeEach(()=>request.mockReset());
 function dataset(){
  const words=Array.from({length:205},(_,i)=>({id:i+1,hanzi:"你好",meaning:"xin chào",pinyin:"ni hao",hskLevel:i%3+1,topic:"demo"}));
  request.mockImplementation(async path=>{
   const q=new URL(String(path),"http://fixture").searchParams;const level=Number(q.get("hskLevel"));
   const list=words.filter(x=>!level || x.hskLevel===level);const page=Number(q.get("page")||1),limit=Number(q.get("limit")||9);
   return {data:list.slice((page-1)*limit,page*limit),total:list.length,totalPages:Math.ceil(list.length/limit),page,limit};
  });return words;
 }
 it("reads all 205 records across level boundaries without duplicates or missing entries",async()=>{
  dataset();const pages=[];for(let page=1;page<=23;page++)pages.push(await getWords({page,limit:9},2));
  expect(pages[0]!.data.every(x=>x.hskLevel===2)).toBe(true);expect(pages[22]!.data).toHaveLength(7);
  expect(new Set(pages.flatMap(x=>x.data.map(y=>y.id))).size).toBe(205);
  expect((await getWords({page:999,hskLevel:"3",limit:9},2)).page).toBe(8);
 });
 it("loads the whole selected lesson independently of the nine-item catalog page",async()=>{
  dataset();expect(await getLessonWords({topic:"demo"})).toHaveLength(205);await expect(getLessonWords({})).rejects.toThrow("Chọn một chủ đề");
 });
});

describe("dashboard topic summary", () => {
  beforeEach(() => request.mockReset());
  it("shows textbook topics without compiled vocabulary reviews in dashboard lesson cards",async()=>{
    const lesson={topicKey:"HSK1-L01",titleVi:"Bài 1: Chào bạn!",hskLevel:1,totalSets:2};
    request.mockResolvedValue([lesson,{...lesson,topicKey:"Bài 1: Ôn từ vựng HSK 1 (biên soạn)"}]);
    expect(await getDashboardTopics(1)).toMatchObject({total:1,topics:[lesson]});
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("uses one topic request and sends only ten compact cards to the client", async () => {
    const topics = Array.from({length: 31}, (_, i) => ({
      topicKey: `HSK1-L${i + 1}`, titleVi: `Bài ${i + 1}`, titleCn: "你好", hskLevel: 1,
      totalSets: 2, totalQuestions: 80, vocabularyCount: 20, pinyin: "ni hao",
    }));
    request.mockResolvedValue(topics);
    const { topics: result, total } = await getDashboardTopics(1);
    expect(total).toBe(31);
    expect(result).toHaveLength(10);
    expect(result.map(item => item.topicKey)).toEqual(topics.slice(0, 10).map(item => item.topicKey));
    expect(result[0]).toMatchObject({totalSets: 2});
    expect(result[0]).not.toHaveProperty("totalQuestions");
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("practice-sets/topics?hskLevel=1");
  });
  it("keeps upstream errors visible instead of reporting an empty successful dashboard", async () => {
    request.mockRejectedValue(new Error("unavailable"));
    await expect(getDashboardTopics(2)).rejects.toThrow("unavailable");
  });
});
