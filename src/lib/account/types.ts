export interface EnrolledOnlineCourse {
  enrollmentId: string;
  courseId: string;
  courseSlug: string;
  courseName: string;
  category: string;
  imagePath: string | null;
  imageAlt: string | null;
  status: "active" | "pending" | "cancelled" | "expired" | "refunded";
  expiresAt: string | null;
  enrolledAt: string;
  firstLessonHref: string | null;
}

export interface ConfirmedSessionSeat {
  seatId: string;
  sessionId: string;
  courseId: string;
  courseSlug: string;
  courseName: string;
  category: string;
  batchName: string;
  startDate: string;
  startTime: string | null;
  location: string;
  city: string | null;
  status: "confirmed";
  confirmedAt: string | null;
  isUpcoming: boolean;
}

export interface AccountPaymentHistoryItem {
  paymentId: string;
  courseId: string;
  courseName: string;
  provider: string;
  totalAmount: number;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

export interface AccountCommunityInfo {
  hasProfile: boolean;
  username?: string;
  displayName?: string;
  avatarPath?: string | null;
}

export interface AccountDashboardData {
  user: {
    id: string;
    email: string;
    createdAt?: string;
  };
  community: AccountCommunityInfo;
  onlineCourses: EnrolledOnlineCourse[];
  physicalSessions: ConfirmedSessionSeat[];
  nearestUpcomingSession: ConfirmedSessionSeat | null;
  recentPayments: AccountPaymentHistoryItem[];
  hasAnyActivity: boolean;
}
