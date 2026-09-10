/**
 * أنواع المجتمع (CP-H V1) — الواجهة فقط؛ التحويل من/إلى DB في mappers.ts
 * قاعدة: لا تُعرض أخطاء DB خام؛ كل نص للمستخدم عربي.
 */

export type ExperienceLevel = "beginner" | "intermediate" | "professional";
export type CommunityMemberStatus = "active" | "suspended";
export type ContentStatus = "published" | "hidden";
export type NotificationType = "follow" | "like" | "comment";
export type ReportTargetType = "post" | "comment" | "profile";
export type ReportReason =
  | "spam"
  | "inappropriate"
  | "harassment"
  | "copyright"
  | "impersonation"
  | "other";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

/** هوية العضو — الظهور العام والتحرير */
export interface CommunityMember {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  city: string;
  country: string;
  specialties: string[];
  experienceLevel: ExperienceLevel;
  avatarUrl: string;
  coverUrl: string;
  availableForWork: boolean;
  websiteUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  createdAt: string;
}

/** بطاقة منشور في الـfeed */
export interface FeedPost {
  id: string;
  authorUserId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string;
  caption: string;
  category: string;
  camera: string;
  lens: string;
  locationName: string;
  media: PostMediaView[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  createdAt: string;
}

export interface PostMediaView {
  path: string;
  url: string;
  alt: string;
}

export interface PortfolioProjectView {
  id: string;
  title: string;
  description: string;
  category: string;
  locationName: string;
  projectDate: string;
  coverUrl: string;
  published: boolean;
  media: PostMediaView[];
}

/** الملف العام الكامل */
export interface PublicProfileView {
  member: CommunityMember;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  projects: PortfolioProjectView[];
  isFollowing: boolean;
}

/** مدخل محرر الملف الشخصي */
export interface CommunityProfileInput {
  username: string;
  displayName: string;
  bio: string;
  city: string;
  country: string;
  specialties: string[];
  experienceLevel: ExperienceLevel;
  avatarPath: string;
  coverPath: string;
  availableForWork: boolean;
  websiteUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
}

export interface PostInput {
  caption: string;
  category: string;
  camera: string;
  lens: string;
  locationName: string;
  media: { path: string; alt: string }[];
}

export interface PortfolioInput {
  title: string;
  description: string;
  category: string;
  locationName: string;
  projectDate: string;
  coverPath: string;
  published: boolean;
  media: { path: string; alt: string }[];
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  actorName: string;
  actorUsername: string;
  actorAvatarUrl: string;
  entityType: "post" | "profile";
  entityId: string | null;
  read: boolean;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetPreview: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  reporterUsername: string;
  createdAt: string;
}

/** أسباب البلاغ المحددة مسبقًا — تسميات عربية */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: "محتوى مزعج أو دعائي",
  inappropriate: "محتوى غير لائق",
  harassment: "تحريز أو مضايقة",
  copyright: "انتحال أو مخالفة حقوق",
  impersonation: "انتحال شخصية",
  other: "سبب آخر",
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  professional: "محترف",
};

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  follow: "بدأ متابعتك",
  like: "أعجب بمنشورك",
  comment: "علّق على منشورك",
};
