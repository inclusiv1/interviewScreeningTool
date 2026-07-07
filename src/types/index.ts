export interface InterviewQuestion {
  id: number;
  role: string;
  topic: string; // This will represent the "Skill"
  skillLevel: string; // Experience/skill level for this specific skill
  question: string;
  answer: string;
  codingExample?: string;
  challenges?: string;
  note?: string;
  set_id?: number;
  set_name?: string;
  role_id?: number;
  skill_id?: number;
  skill_level?: string;
  coding_example?: string;
}

export type InterviewQuestionCollection = InterviewQuestion[];
