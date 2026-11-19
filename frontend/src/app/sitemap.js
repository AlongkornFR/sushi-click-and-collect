import { SITE_URL as BASE } from "@/lib/site";

// sitemap.xml (lot M8)

export default function sitemap() {
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/menu`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/cgv`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/politique-de-confidentialite`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
