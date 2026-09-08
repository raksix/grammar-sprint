import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const SITE_URL = "http://learneng.fermag.com.tr";

/** Static robots.txt for the exported site (P29). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
