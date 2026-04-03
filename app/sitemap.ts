import type { MetadataRoute } from "next";

const siteUrl = "https://pharmapath.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/pharmacy-finder",
    "/pharmacy-finder/results",
    "/prescriber",
    "/methodology",
    "/contact",
    "/login",
    "/register",
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
  }));
}
