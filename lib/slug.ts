export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "") // aman untuk huruf Indonesia
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
