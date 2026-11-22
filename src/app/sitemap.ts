import type { MetadataRoute } from "next";
// Catalogs, attempts and history require a session; only publish public URLs.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://trike-hsk-web-tau.vercel.app/", changeFrequency: "weekly", priority: 1 }];
}
