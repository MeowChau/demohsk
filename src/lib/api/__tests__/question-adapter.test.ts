import { byOrder, publicText, questionOptions, practiceSchema, examSchema } from "../question-adapter";
describe("question API boundary",()=>{
  it("uses stored order, never primary key order, and keeps ties stable",()=>{
    const input=[{id:2,order:3},{id:91,order:1},{id:7,order:1}];
    expect(byOrder(input).map(x=>x.id)).toEqual([91,7,2]);expect(input[0]!.id).toBe(2);
  });
  it("normalizes image-only choices and never renders an object as text",()=>{
    expect(questionOptions({options:[{id:"A",text:{bad:true},imageUrl:"/a.png"},"hello"],optionImages:["","/b.png"]},"MCQ"))
      .toEqual([{id:"A",text:"A",imageUrl:"/a.png"},{id:"B",text:"hello",imageUrl:"/b.png"}]);
    expect(publicText({bad:true},"fallback")).toBe("fallback");
  });
  it("provides true-false options without inventing other answers",()=>{
    expect(questionOptions({},"TRUE_FALSE").map(x=>x.id)).toEqual(["A","B"]);
    expect(questionOptions({},"SHORT_ANSWER")).toEqual([]);
  });
  it("rejects invalid question bodies at the network boundary",()=>{
    expect(practiceSchema.safeParse({id:1,title:"Test",hskLevel:1,skill:"LISTENING",practiceSetQuestions:[{question:{id:2,type:"MCQ",skill:"READING",hskLevel:1,payload:{text:{bad:true}}}}]}).success).toBe(false);
    expect(examSchema.safeParse({id:1,title:"Test",hskLevel:12}).success).toBe(false);
  });
  it("accepts nullable deleted links and preserves compatible payload extensions",()=>{
    const data=practiceSchema.parse({id:1,title:"Test",hskLevel:1,skill:"READING",practiceSetQuestions:[{question:null},{question:{id:2,type:"MCQ",skill:"READING",hskLevel:1,payload:{extension:"keep"}}}]});
    expect(data.practiceSetQuestions[0]!.question).toBeNull();expect(data.practiceSetQuestions[1]!.question!.payload.extension).toBe("keep");
  });
});
