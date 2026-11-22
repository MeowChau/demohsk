import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") return {rules:{userAgent:"*",disallow:"/"}};
  return {
    rules: { userAgent:"*", allow:"/", disallow:["/api/","/login","/register","/signup","/dashboard","/learning","/vocabulary","/practice","/exams","/results","/history","/profile","/games","/leaderboard","/rewards","/support","/admin","/teacher","/onboarding","/tutor","/live-classes","/announcements"] },
    sitemap:"https://trike-hsk-web-tau.vercel.app/sitemap.xml",
  };
}
