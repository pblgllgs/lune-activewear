import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CATEGORIES,
  SITE_URL,
  TODAY,
  escapeXml,
  fetchGuides,
  fetchProducts,
} from "./seo-data.mjs";

const staticUrls = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/tienda", changefreq: "weekly", priority: "0.9" },
  ...CATEGORIES.map((id) => ({
    loc: `/categoria/${id}`,
    changefreq: "weekly",
    priority: "0.8",
  })),
  { loc: "/guias", changefreq: "weekly", priority: "0.7" },
  { loc: "/nosotros", changefreq: "monthly", priority: "0.6" },
  { loc: "/privacidad", changefreq: "monthly", priority: "0.3" },
];

const [products, guides] = await Promise.all([fetchProducts(), fetchGuides()]);

const urls = [
  ...staticUrls.map((item) => ({ ...item, lastmod: TODAY })),
  ...products.map((product) => ({
    loc: `/producto/${product.id}`,
    lastmod: product.lastmod || TODAY,
    changefreq: "weekly",
    priority: "0.7",
  })),
  ...guides.map((guide) => ({
    loc: `/guias/${guide.slug || guide.id}`,
    lastmod: guide.lastmod || TODAY,
    changefreq: "monthly",
    priority: "0.6",
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (item) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${item.loc}`)}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

const target = path.resolve("public/sitemap.xml");
await writeFile(target, xml, "utf8");
console.log(`[sitemap] ${urls.length} URLs escritas en ${target}`);
