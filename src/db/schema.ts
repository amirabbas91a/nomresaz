import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const now = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const roles = pgTable("roles", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  permissions: text("permissions").array().notNull().default([]),
  isSystem: boolean("is_system").notNull().default(false),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    roleKey: text("role_key").notNull().default("student"),
    grade: text("grade").notNull().default("نهم"),
    active: boolean("active").notNull().default(true),
    leaderboardVisible: boolean("leaderboard_visible").notNull().default(true),
    createdAt: now(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: now(),
  },
  (t) => [uniqueIndex("sessions_token_idx").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  teacher: text("teacher"),
  imageUrl: text("image_url"),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  data: bytea("data"),
  telegramFileId: text("telegram_file_id"),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: now(),
});

export const resources = pgTable(
  "resources",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    chapter: text("chapter"),
    kind: text("kind").notNull().default("pdf"),
    fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
    externalUrl: text("external_url"),
    status: text("status").notNull().default("draft"),
    publisherId: uuid("publisher_id").references(() => users.id, { onDelete: "set null" }),
    downloads: integer("downloads").notNull().default(0),
    createdAt: now(),
  },
  (t) => [index("resources_subject_idx").on(t.subjectId)],
);

export const tips = pgTable("tips", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  chapter: text("chapter"),
  topic: text("topic"),
  status: text("status").notNull().default("published"),
  createdAt: now(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  noteDate: text("note_date").notNull(),
  color: text("color").notNull().default("yellow"),
  createdAt: now(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  assignDate: timestamp("assign_date", { withTimezone: true }),
  dueDate: timestamp("due_date", { withTimezone: true }),
  fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
  status: text("status").notNull().default("active"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: now(),
});

export const assignmentDone = pgTable(
  "assignment_done",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    assignmentId: integer("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
    doneAt: timestamp("done_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.assignmentId] })],
);

export const notebooks = pgTable("notebooks", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  style: text("style").notNull().default("full"),
  sources: jsonb("sources").$type<NotebookSource[]>().notNull().default([]),
  content: text("content").notNull().default(""),
  status: text("status").notNull().default("draft"),
  statusNote: text("status_note"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  baleSentAt: timestamp("bale_sent_at", { withTimezone: true }),
  docxFileId: uuid("docx_file_id").references(() => files.id, { onDelete: "set null" }),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type NotebookSource = { id: string; type: "text" | "image" | "audio"; name: string; text: string; uncertain?: boolean };

export type ExamQuestion = {
  id: string;
  type: "mcq" | "tf" | "blank" | "short" | "essay" | "multi";
  text: string;
  options?: string[];
  correct?: number | number[] | boolean | string;
  marks: number;
  explanation?: string;
};

export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  chapter: text("chapter"),
  durationMin: integer("duration_min").notNull().default(30),
  maxAttempts: integer("max_attempts").notNull().default(1),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  showResult: boolean("show_result").notNull().default(true),
  awardPoints: integer("award_points").notNull().default(0),
  status: text("status").notNull().default("draft"),
  questions: jsonb("questions").$type<ExamQuestion[]>().notNull().default([]),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: now(),
});

export const examAttempts = pgTable(
  "exam_attempts",
  {
    id: serial("id").primaryKey(),
    examId: integer("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    answers: jsonb("answers").$type<Record<string, unknown>>().notNull().default({}),
    manualScores: jsonb("manual_scores").$type<Record<string, number>>().notNull().default({}),
    score: real("score"),
    maxScore: real("max_score").notNull().default(0),
    status: text("status").notNull().default("in_progress"),
  },
  (t) => [index("attempts_exam_idx").on(t.examId), index("attempts_user_idx").on(t.userId)],
);

export const pointEvents = pgTable(
  "point_events",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    refId: text("ref_id").notNull(),
    points: integer("points").notNull(),
    reason: text("reason"),
    createdBy: text("created_by"),
    createdAt: now(),
  },
  (t) => [uniqueIndex("points_unique_idx").on(t.userId, t.kind, t.refId)],
);

export const userBadges = pgTable(
  "user_badges",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    badgeKey: text("badge_key").notNull(),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeKey] })],
);

export type SurveyQuestion = {
  id: string;
  type: "single" | "multi" | "text" | "scale";
  text: string;
  options?: string[];
  required?: boolean;
};

export const surveys = pgTable("surveys", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  anonymous: boolean("anonymous").notNull().default(false),
  status: text("status").notNull().default("draft"),
  questions: jsonb("questions").$type<SurveyQuestion[]>().notNull().default([]),
  createdAt: now(),
});

export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: serial("id").primaryKey(),
    surveyId: integer("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
    respondentKey: text("respondent_key").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    answers: jsonb("answers").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: now(),
  },
  (t) => [uniqueIndex("survey_resp_unique").on(t.surveyId, t.respondentKey)],
);

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  color: text("color").default("#2f6bff"),
  category: text("category").default("general"),
  createdAt: now(),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link"),
  imageUrl: text("image_url"),
  pinned: boolean("pinned").notNull().default(false),
  status: text("status").notNull().default("draft"),
  createdAt: now(),
});

export const ads = pgTable("ads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  placement: text("placement").notNull().default("home"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  clicks: integer("clicks").notNull().default(0),
  createdAt: now(),
});

export const suggestions = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  category: text("category").notNull().default("suggestion"),
  body: text("body").notNull(),
  status: text("status").notNull().default("new"),
  reply: text("reply"),
  createdAt: now(),
});

export const contests = pgTable("contests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  rules: text("rules"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  points: integer("points").notNull().default(0),
  status: text("status").notNull().default("draft"),
  createdAt: now(),
});

export const contestEntries = pgTable(
  "contest_entries",
  {
    contestId: integer("contest_id").notNull().references(() => contests.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    answer: text("answer"),
    createdAt: now(),
  },
  (t) => [primaryKey({ columns: [t.contestId, t.userId] })],
);

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull().default("special"),
  title: text("title").notNull(),
  body: text("body"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: now(),
});

export type PageBlock = {
  id: string;
  type: "hero" | "text" | "image" | "list" | "cta";
  title?: string;
  text?: string;
  imageUrl?: string;
  items?: string[];
  buttonLabel?: string;
  buttonUrl?: string;
};

export const pages = pgTable(
  "pages",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    blocks: jsonb("blocks").$type<PageBlock[]>().notNull().default([]),
    status: text("status").notNull().default("draft"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: now(),
  },
  (t) => [uniqueIndex("pages_slug_idx").on(t.slug)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id"),
    userName: text("user_name"),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: text("entity_id"),
    result: text("result").notNull().default("ok"),
    reason: text("reason"),
    createdAt: now(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
});

export const features = pgTable("features", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
});

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("گفت‌وگوی جدید"),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PendingAction = { callId: string; tool: string; args: Record<string, unknown>; summary: string; state: "pending" | "done" | "rejected" | "failed"; result?: string };

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    tools: jsonb("tools").$type<{ name: string; ok: boolean; summary: string }[]>(),
    pending: jsonb("pending").$type<PendingAction[]>(),
    createdAt: now(),
  },
  (t) => [index("ai_msg_conv_idx").on(t.conversationId)],
);
