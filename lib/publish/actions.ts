/**
 * Stxic "Publish to web" — server actions.
 *
 * Notes are AES-GCM encrypted client-side, so the server can't decrypt them
 * itself. The client (which holds the session DEK) sends the plaintext title
 * + content for a note it owns; the Admin SDK writes the public `published`
 * collection (server-only writes — Firestore rules deny direct client writes).
 * See docs/AGENT_CORE_FEATURES.md + docs/API.md.
 */

"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUserId } from "@/lib/auth/session";
import { PUBLISHED_COLLECTION, sanitizeSlug, type PublishedDoc } from "@/lib/publish/shared";
import type { Envelope } from "@/types";

/**
 * Publish (or update) a note as a public page. Creating a new note requires a
 * free slug; updating keeps the existing slug's `publishedAt`.
 */
export async function publishNote(input: {
  slug: string;
  title: string;
  content: string;
}): Promise<Envelope<{ slug: string; url: string }>> {
  const uid = await getSessionUserId();
  if (!uid) return { ok: false, error: "Unauthorized" };

  const slug = sanitizeSlug(input.slug);
  if (!slug) return { ok: false, error: "Slug can only contain letters, numbers, and dashes." };
  if (!input.title.trim() && !input.content.trim()) {
    return { ok: false, error: "Nothing to publish — add a title or some content." };
  }

  try {
    const ref = getAdminDb().doc(`${PUBLISHED_COLLECTION}/${slug}`);
    const existing = await ref.get();
    if (existing.exists && existing.data()?.ownerUid !== uid) {
      return { ok: false, error: "That URL is already taken — pick a different slug." };
    }
    await ref.set({
      ownerUid: uid,
      title: input.title,
      content: input.content,
      publishedAt: existing.exists ? (existing.data()?.publishedAt ?? Date.now()) : Date.now(),
      updatedAt: Date.now(),
    } satisfies PublishedDoc);
    return { ok: true, data: { slug, url: `/p/${slug}` } };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/** Remove a published page (only the owning user). */
export async function unpublishNote(slug: string): Promise<Envelope<null>> {
  const uid = await getSessionUserId();
  if (!uid) return { ok: false, error: "Unauthorized" };
  try {
    const ref = getAdminDb().doc(`${PUBLISHED_COLLECTION}/${slug}`);
    const existing = await ref.get();
    if (!existing.exists) return { ok: true, data: null };
    if (existing.data()?.ownerUid !== uid) return { ok: false, error: "Not yours to unpublish." };
    await ref.delete();
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}
