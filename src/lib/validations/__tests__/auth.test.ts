import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../auth";
describe("HSK registration contract", () => {
  const valid = {username:"hsk_learner",email:"learner@example.com",password:"abcdef",confirmPassword:"abcdef"};
  it("accepts actual backend fields and six-character passwords", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });
  it("normalizes username and email", () => {
    const result = signupSchema.parse({...valid,username:" learner ",email:" LEARNER@EXAMPLE.COM "});
    expect(result.username).toBe("learner");
    expect(result.email).toBe("learner@example.com");
  });
  it.each([{username:" "},{username:"x".repeat(256)},{email:"invalid"},{password:"short",confirmPassword:"short"},{password:"x".repeat(73),confirmPassword:"x".repeat(73)},{confirmPassword:"different"}])("rejects invalid registration data %j", changes => {
    expect(signupSchema.safeParse({...valid,...changes}).success).toBe(false);
  });
  it("attributes confirmation errors to the confirmation field", () => {
    const result = signupSchema.safeParse({...valid,confirmPassword:"other"});
    if(result.success)throw new Error("Expected confirmation error");
    expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});
describe("HSK login and recovery", () => {
  it("accepts existing passwords without a new length rule", () => expect(loginSchema.safeParse({email:"a@b.com",password:"x"}).success).toBe(true));
  it("rejects empty passwords", () => expect(loginSchema.safeParse({email:"a@b.com",password:""}).success).toBe(false));
  it("requires a valid recovery email", () => expect(forgotPasswordSchema.safeParse({email:"invalid"}).success).toBe(false));
  it("requires matching reset passwords within backend limits", () => {
    expect(resetPasswordSchema.safeParse({password:"abcdef",confirmPassword:"abcdef"}).success).toBe(true);
    expect(resetPasswordSchema.safeParse({password:"abcdef",confirmPassword:"other"}).success).toBe(false);
  });
});
