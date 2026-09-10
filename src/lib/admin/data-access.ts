import type { AdminData, AdminModule } from "@/data/admin/types";
import type { AdminSession } from "./session";
import { contactFromDb, footerFromDb, generalFromDb, homepageFromDb, seoFromDb } from "@/lib/cms/mappers";

/** Filter on the server before serializing the CMS store to a browser. */
export function scopeAdminData(data: AdminData, session: AdminSession): AdminData {
  const canView = (module: AdminModule) => session.role.permissions[module]?.includes("view") === true;
  return {
    ...data,
    currentUserId: session.userId,
    courses: canView("courses") ? data.courses
      : canView("homepage") || canView("paths") || canView("sessions")
        ? data.courses.filter((course) => course.status !== "draft") : [],
    trainers: canView("trainers") ? data.trainers
      : canView("courses") ? data.trainers.filter((trainer) => trainer.status === "active") : [],
    paths: canView("paths") ? data.paths : [],
    posts: canView("blog") ? data.posts : [],
    testimonials: canView("testimonials") ? data.testimonials
      : canView("homepage") ? data.testimonials.filter((item) => item.visible) : [],
    requests: canView("corporate-requests") ? data.requests : [],
    media: canView("media") ? data.media : [],
    payments: canView("payments") ? data.payments : [],
    legal: canView("legal") ? data.legal : [],
    users: canView("users") ? data.users : data.users.filter((user) => user.id === session.userId),
    roles: canView("roles") || canView("users") ? data.roles : data.roles.filter((role) => role.id === session.roleId),
    general: canView("settings") ? data.general : generalFromDb(null),
    contact: canView("settings") ? data.contact : contactFromDb(null),
    footer: canView("settings") ? data.footer : footerFromDb(null, []),
    seo: canView("settings") ? data.seo : seoFromDb(null),
    homepage: canView("homepage") ? data.homepage : homepageFromDb({
      rows: [], hero: null, stats: [], upcoming: null, categories: [], featured: null,
      featuredItems: [], whyUs: null, whyUsItems: [], accreditations: [], partners: [],
      testimonials: null, testimonialItems: [], cta: null,
    }),
  };
}
