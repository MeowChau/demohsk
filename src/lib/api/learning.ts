import { byOrder, examSchema, practiceSchema, questionOptions } from "./question-adapter";
import { defaultExamMinutes } from "@/lib/exam-timing";
import "server-only";
import { practiceSetAttemptHref } from "@/lib/attempt-routes";
import { serverApi, requireApiUser } from "./server";
import { publicMedia } from "./config";
import type {
  HskAnalytics,
  HskTopic,
  HskWord,
  HskPractice,
  HskExam,
  HskUser,
  PageData,
} from "./types";
import type { StudentCourseView } from "@/types/courses";
import type { ProfileDetail } from "@/types/profile";
import type { VocabWord } from "@/types/vocab";
import type { TestWithQuestions } from "@/types/assessment";
import type { Skill, Question } from "@/types/assessment";
import { apiRole } from "./config";
import { writingPractice } from "@/lib/writing-practice";
const answerValues = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(answerValues);
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return [String(value)];
  return [];
};

export async function allPages<T>(path: string): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?";
  const first = await serverApi<PageData<T>>(
    `${path}${separator}limit=100&page=1`,
  );
  const result = [...first.data];
  for (let page = 2; page <= Math.min(first.totalPages, 100); page++) {
    result.push(
      ...(
        await serverApi<PageData<T>>(
          `${path}${separator}limit=100&page=${page}`,
        )
      ).data,
    );
  }
  return result;
}
export async function learningViews(
  user?: HskUser,
): Promise<StudentCourseView[]> {
  const profile = user || (await requireApiUser());
  const level = profile.currentHskLevel || 1;
  const [topics, sets] = await Promise.all([
    serverApi<HskTopic[]>(`practice-sets/topics?hskLevel=${level}`),
    allPages<HskPractice>(`practice-sets?hskLevel=${level}`),
  ]);
  return topics.map((topic) => ({
    enrollid: topic.topicKey,
    course: {
      courseid: topic.topicKey,
      course_code: topic.topicKey,
      title: topic.titleVi || topic.titleCn || topic.topicKey,
      description: `${topic.titleCn} · ${topic.pinyin}`,
      level: `HSK ${topic.hskLevel}`,
      duration: null,
      created_at: "",
    },
    contents: sets
      .filter((set) => set.topic === topic.topicKey)
      .map((set) => ({
        contentid: String(set.id),
        courseid: topic.topicKey,
        title: set.title,
        content_type: "Notes" as const,
        youtube_link: null,
        file_url: practiceSetAttemptHref(set.id),
        created_at: "",
      })),
  }));
}
export async function vocabularyWords(): Promise<VocabWord[]> {
  return (await allPages<HskWord>("vocabulary")).map((word) => ({
    wordid: String(word.id),
    word: word.hanzi,
    definition: word.meaning,
    example: word.pinyin,
    difficulty:
      word.hskLevel <= 3 ? "easy" : word.hskLevel <= 6 ? "medium" : "hard",
  }));
}
export function levelInfo(user: HskUser) {
  const level = Math.max(1, user.level || 1);
  const threshold = level * 1000;
  return {
    level,
    title: `Cấp ${level}`,
    currentXp: user.currentExp || 0,
    xpForNextLevel: threshold,
    progressPercent: Math.min(
      100,
      Math.round(((user.currentExp || 0) / threshold) * 100),
    ),
  };
}
export function totalXp(user: HskUser) {
  return (
    (user.currentExp || 0) + 500 * (user.level || 1) * ((user.level || 1) - 1)
  );
}
export async function activityStats(user: HskUser) {
  const [analytics, leaderboard] = await Promise.all([
    serverApi<HskAnalytics>("analytics/dashboard"),
    serverApi<{
      leaderboard: {
        id: number | string;
        currentStreak: number;
        longestStreak: number;
      }[];
    }>("leaderboard/streak?limit=100&timeframe=all"),
  ]);
  const self = leaderboard.leaderboard.find(
    (row) => String(row.id) === String(user.id),
  );
  // The leaderboard may omit this user; do not present a fabricated current streak.
  return {
    xpTotal: totalXp(user),
    streak: self
      ? {
          current_streak: self.currentStreak,
          longest_streak: self.longestStreak,
        }
      : null,
    achievements: [],
    recentXp: [],
    challenge: null,
    levelInfo: levelInfo(user),
    analytics,
  };
}
export function profileDetail(user: HskUser): ProfileDetail {
  return {
    userid: String(user.id),
    email: user.email || "",
    username: user.username,
    role: apiRole(user),
    display_id: user.studentCode ? String(user.studentCode) : null,
    created_at: user.createdAt || "",
    personid: String(user.id),
    dob: null,
    gender: null,
    phone: null,
    address: null,
    avatar_url: publicMedia(user.photo?.path),
    target_band: user.targetHskLevel || null,
    current_band: user.currentHskLevel || null,
    daily_study_time: user.dailyStudyTime || null,
  };
}
export async function practiceTests(skill: Skill) {
  return (
    await allPages<HskPractice>(`practice-sets?skill=${skill.toUpperCase()}`)
  ).map((set) => ({
    testid: `set-${set.id}`,
    title: set.title,
    category: `HSK ${set.hskLevel}`,
    duration: null,
    total_marks: set.totalQuestions || 0,
  }));
}
export async function testForTaking(
  reference: string,
): Promise<TestWithQuestions> {
  const match = /^(set|exam)-(\d+)$/.exec(reference);
  if (!match) throw new Error("Mã bài luyện HSK không hợp lệ.");
  const kind = match[1];
  const id = match[2];
  const data =
    kind === "set"
      ? practiceSchema.parse(await serverApi<unknown>(`practice-sets/${id}`))
      : examSchema.parse(await serverApi<unknown>(`exams/${id}`));
  const set = data as HskPractice;
  const groups =
    kind === "set"
      ? [
          {
            id: 0,
            order: 0,
            title: set.title,
            audioUrl: set.audioUrl,
            links: set.practiceSetQuestions || [],
          },
        ]
      : byOrder((data as HskExam).sections || []).map((section) => ({
          ...section,
          links: section.sectionQuestions,
        }));
  const questionsBySkill: TestWithQuestions["questionsBySkill"] = {};
  const passages: TestWithQuestions["passages"] = [];
  for (const group of groups) {
    const passageid = group.id ? String(group.id) : null;
    if (passageid)
      passages.push({
        passageid,
        testid: reference,
        title: group.title,
        passage_text: "",
        order_index: group.order,
      });
    for (const link of byOrder(group.links)) {
      const q = link.question;
      if (!q) continue;
      const skill = (q.skill.slice(0, 1) +
        q.skill.slice(1).toLowerCase()) as Skill;
      const payload = q.payload || {};
      const speechText = [
        payload.character,
        payload.hanzi,
        payload.source?.sourceWord,
        payload.sentence,
        payload.text,
        payload.questionText,
      ].find((value): value is string => typeof value === "string" && /\p{Script=Han}/u.test(value));
      const answerKey = q.correctAnswer || {};
      const hasTextAnswers = q.skill === "WRITING" || ["FILL_IN_BLANK", "SHORT_ANSWER", "ESSAY"].includes(q.type);
      const answerValuesForQuestion = hasTextAnswers
        ? [
            ...answerValues(answerKey.answer),
            ...answerValues(answerKey.answers),
          ]
        : answerValues(
            answerKey.optionId ??
            answerKey.id ??
            answerKey.correctOptionId ??
            answerKey.answer ??
            payload.correctOptionId,
          );
      const correctAnswers = [...new Set(answerValuesForQuestion.map(answer => answer.trim()).filter(Boolean))];
      const question: Question = {
        questionid: String(q.id),
        testid: reference,
        question: payload.text || (q.skill === "SPEAKING" ? speechText : undefined) || "Hoàn thành bài tập tiếng Trung.",
        passageid,
        skill,
        marks: 1,
        type: q.type,
        templateId: typeof payload.templateId === "string" ? payload.templateId : undefined,
        hskLevel: q.hskLevel,
        acceptedAnswers: correctAnswers,
        speechText: q.skill === "SPEAKING" ? speechText : undefined,
        manualGrading: Boolean(payload.manualGrading || (q.skill === "WRITING" && answerKey.rubric)),
        pinyin: payload.pinyin,
        translation: payload.translation || payload.meaning,
        image_url: publicMedia(payload.imageUrl),
        context_image_url: publicMedia(payload.contextImageUrl),
        continuation_image_url: publicMedia(payload.continuationImageUrl),
        audio_url: publicMedia(payload.audioUrl || group.audioUrl),
        sharedAudio: q.skill !== "SPEAKING" && Boolean(
          payload.audioScope === "source-track" ||
          (!payload.audioUrl && group.audioUrl) ||
          (group.audioUrl && publicMedia(payload.audioUrl) === publicMedia(group.audioUrl)),
        ),
      };
      if (writingPractice(question)) {
        question.audio_url = null;
        question.sharedAudio = false;
        question.manualGrading = true;
      }
      const options = questionOptions(payload, q.type).map(option => ({
        optionid: option.id, option_text: option.text, image_url: publicMedia(option.imageUrl),
      }));
      questionsBySkill[skill] ||= [];
      questionsBySkill[skill]!.push({
        question,
        options,
      });
    }
  }
  const items = Object.values(questionsBySkill).flatMap(questions => questions || []);
  const tracingOnly = items.length > 0 && items.every(item => writingPractice(item.question) !== null);
  return {
    test: {
      testid: reference,
      courseid: "",
      audio_url: kind === "set" && !tracingOnly ? publicMedia(set.audioUrl) : null,
      title: data.title,
      category: `HSK ${data.hskLevel}`,
      duration: kind === "exam" ? defaultExamMinutes(data.hskLevel) : 0,
      total_marks: Object.values(questionsBySkill).reduce(
        (sum, items) => sum + (items?.length || 0),
        0,
      ),
    },
    passages,
    questionsBySkill,
  };
}
