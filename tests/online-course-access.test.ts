/**
 * مصفوفة وصول الدرس — كل تركيبة، حتميًا وبلا شبكة.
 *
 * القرار خرج من الصفحة إلى دالة خالصة لهذا السبب: قاعدة أمان مبعثرة بين
 * شروط JSX لا تُختبر إلا بتشغيل كامل بقاعدة بيانات، فتبقى فعليًا غير
 * مختبَرة. هنا تُغذّى بالحقائق وتُعيد حكمًا، فتُغطّى كل حالة.
 *
 * القواعد المحروسة:
 *  - النشر بوابة مطلقة على ثلاثة مستويات، و`free_preview` لا يتجاوزها.
 *  - وجود صف تسجيل ليس وصولًا: `active` غير المنتهي وحده يفتح.
 *  - التسجيل في الموقع وحده لا يمنح شيئًا.
 */
import { describe, expect, test } from "bun:test";

import {
  ACCESS_GRANTING_STATUS,
  ENROLLMENT_STATUSES,
  decideLessonAccess,
  enrollmentGrantsAccess,
  type EnrollmentStatus,
  type LessonAccessFacts,
} from "../src/lib/learning/access";

const NOW = new Date("2026-09-15T12:00:00.000Z");
const PAST = "2026-09-01T00:00:00.000Z";
const FUTURE = "2027-01-01T00:00:00.000Z";
const MEMBER = "11111111-1111-4111-8111-111111111111";

/** كل شيء منشور ودرس مدفوع — نقطة البداية، ونغيّر منها حقيقة واحدة. */
const base: LessonAccessFacts = {
  coursePublished: true,
  modulePublished: true,
  lessonPublished: true,
  freePreview: false,
  viewerId: null,
  enrollment: null,
};

const decide = (patch: Partial<LessonAccessFacts>) =>
  decideLessonAccess({ ...base, ...patch }, NOW);

const enrolled = (status: EnrollmentStatus, expiresAt: string | null = null) => ({
  viewerId: MEMBER,
  enrollment: { status, expiresAt },
});

describe("publication is an absolute gate at all three levels", () => {
  /* المسودة لا تُعرض لأحد من هذا المسار — ولا 'locked' تكشف وجودها. */
  const cases: Array<[string, Partial<LessonAccessFacts>, string]> = [
    ["دورة غير منشورة", { coursePublished: false }, "course-draft"],
    ["وحدة غير منشورة", { modulePublished: false }, "module-draft"],
    ["درس غير منشور", { lessonPublished: false }, "lesson-draft"],
  ];

  for (const [label, patch, reason] of cases) {
    test(`${label} → not-found حتى لمن يملك تسجيلًا فعّالًا`, () => {
      const decision = decide({ ...patch, ...enrolled("active") });
      expect(decision.outcome).toBe("not-found");
      expect(decision).toMatchObject({ reason });
    });

    test(`${label} → not-found حتى مع free_preview`, () => {
      /* هذه هي العلة التي كانت: المعاينة كانت تتجاوز المسودة. */
      expect(decide({ ...patch, freePreview: true }).outcome).toBe("not-found");
    });
  }

  test("المسودة تسبق كل اعتبار آخر — الترتيب جزء من الضمان", () => {
    const decision = decide({
      coursePublished: false,
      modulePublished: false,
      lessonPublished: false,
      freePreview: true,
      ...enrolled("active"),
    });
    expect(decision).toEqual({ outcome: "not-found", reason: "course-draft" });
  });
});

describe("free preview waives enrollment, nothing else", () => {
  test("زائر بلا حساب يشاهد درس معاينة منشورًا", () => {
    expect(decide({ freePreview: true })).toEqual({ outcome: "allow", reason: "free-preview" });
  });

  test("وعضو بتسجيل ملغى يشاهده أيضًا — المعاينة مجانية للجميع", () => {
    expect(decide({ freePreview: true, ...enrolled("cancelled") }).outcome).toBe("allow");
  });
});

describe("enrollment status decides paid access", () => {
  const expectations: Record<EnrollmentStatus, "allow" | "locked"> = {
    pending: "locked",
    active: "allow",
    cancelled: "locked",
    expired: "locked",
    refunded: "locked",
  };

  test("الحالات الخمس كلها مغطّاة — لا حالة بلا حكم", () => {
    expect(Object.keys(expectations).sort()).toEqual([...ENROLLMENT_STATUSES].sort());
  });

  for (const status of ENROLLMENT_STATUSES) {
    test(`${status} → ${expectations[status]}`, () => {
      const decision = decide(enrolled(status));
      expect(decision.outcome).toBe(expectations[status]);
      if (decision.outcome === "locked") expect(decision.reason).toBe(status);
    });
  }

  test("الحالة الوحيدة التي تفتح هي active", () => {
    expect(ACCESS_GRANTING_STATUS).toBe("active");
    const granting = ENROLLMENT_STATUSES.filter((status) =>
      enrollmentGrantsAccess({ status, expiresAt: null }, NOW),
    );
    expect(granting).toEqual(["active"]);
  });
});

describe("expiry is part of the decision", () => {
  test("active بلا تاريخ انتهاء = وصول دائم", () => {
    expect(decide(enrolled("active", null)).outcome).toBe("allow");
  });

  test("active بتاريخ في المستقبل = وصول", () => {
    expect(decide(enrolled("active", FUTURE)).outcome).toBe("allow");
  });

  test("active بتاريخ مضى = حجب", () => {
    expect(decide(enrolled("active", PAST)).outcome).toBe("locked");
  });

  test("تاريخ غير صالح يُعامل كمنتهٍ — لا نفتح على شك", () => {
    expect(enrollmentGrantsAccess({ status: "active", expiresAt: "ليس تاريخًا" }, NOW)).toBe(false);
  });
});

describe("registering on the site grants nothing", () => {
  test("زائر أمام درس مدفوع → تسجيل دخول لا حجب غامض", () => {
    expect(decide({}).outcome).toBe("sign-in");
  });

  test("عضو مسجّل في الموقع بلا تسجيل في الدورة → حجب", () => {
    const decision = decide({ viewerId: MEMBER, enrollment: null });
    expect(decision).toEqual({ outcome: "locked", reason: "no-enrollment" });
  });

  test("لا مسار يفتح محتوى مدفوعًا بلا تسجيل فعّال", () => {
    /* مسح شامل: كل تركيبة نشر × كل حالة × وجود العضو من عدمه. */
    const opened: string[] = [];
    for (const coursePublished of [true, false]) {
      for (const modulePublished of [true, false]) {
        for (const lessonPublished of [true, false]) {
          for (const viewerId of [null, MEMBER]) {
            for (const enrollment of [
              null,
              ...ENROLLMENT_STATUSES.map((status) => ({ status, expiresAt: null })),
            ]) {
              const decision = decideLessonAccess(
                {
                  coursePublished,
                  modulePublished,
                  lessonPublished,
                  freePreview: false,
                  viewerId,
                  enrollment,
                },
                NOW,
              );
              if (decision.outcome !== "allow") continue;
              const active = enrollment?.status === "active";
              const allPublished = coursePublished && modulePublished && lessonPublished;
              if (!active || !allPublished) {
                opened.push(
                  `${coursePublished}/${modulePublished}/${lessonPublished} ${viewerId ?? "guest"} ${enrollment?.status ?? "none"}`,
                );
              }
            }
          }
        }
      }
    }
    expect(opened).toEqual([]);
  });
});

describe("another course's lesson", () => {
  test("التسجيل يُقرأ لدورة هذا الدرس، فتسجيل دورة أخرى لا يصل أصلًا", () => {
    /* الصفحة تحمّل التسجيل بـ(المشاهد، courseId المشتق من الدرس نفسه)،
       فلا يمكن أن يصل هنا تسجيل دورة أخرى. غيابه = حجب. */
    expect(decide({ viewerId: MEMBER, enrollment: null }).outcome).toBe("locked");
  });
});
