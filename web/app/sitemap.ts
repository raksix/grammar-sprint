import type { MetadataRoute } from "next";
import { LEVEL_ORDER, TOPICS } from "../lib/topics";

export const dynamic = "force-static";

const SITE_URL = "http://learneng.fermag.com.tr";

/**
 * Full static sitemap for the exported site (P29).
 *
 * 1 home + 4 level pages + 48 lesson pages + 48 quiz pages + 4 gate pages
 * + /final + /review + /stats = 108 URLs. Pure function of the static
 * topic catalogue (no fs reads) so it prerenders under `output: export`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const urls: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
  ];
  for (const level of LEVEL_ORDER) {
    urls.push({
      url: `${SITE_URL}/levels/${level}`,
      changeFrequency: "weekly",
      priority: 0.9,
    });
  }
  for (const topic of TOPICS) {
    urls.push({
      url: `${SITE_URL}/learn/${topic.slug}`,
      changeFrequency: "monthly",
      priority: 0.8,
    });
    urls.push({
      url: `${SITE_URL}/quiz/${topic.slug}`,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }
  for (const level of LEVEL_ORDER) {
    urls.push({
      url: `${SITE_URL}/gate/${level}`,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }
  urls.push(
    { url: `${SITE_URL}/final`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/review`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/stats`, changeFrequency: "weekly", priority: 0.5 },
  );
  return urls;
}
