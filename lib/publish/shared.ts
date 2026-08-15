/**
 * Stxic "Publish to web" — shared helpers/types.
 *
 * Importable from both server actions and client components (unlike
 * `actions.ts`, which is `"use server"` and may only export async functions).
 */

export const PUBLISHED_COLLECTION = "published";

/** Normalize a user-entered slug: lowercase, dashes, alphanumeric only. */
export function sanitizeSlug(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug;
}

export interface PublishedDoc {
  ownerUid: string;
  title: string;
  content: string;
  publishedAt: number;
  updatedAt: number;
}
