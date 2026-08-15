import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAdminDb } from "@/lib/firebase/admin";
import { PUBLISHED_COLLECTION, type PublishedDoc } from "@/lib/publish/shared";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

interface PublishPageProps {
  params: Promise<{ slug: string }>;
}

async function getPublished(slug: string): Promise<PublishedDoc | null> {
  try {
    const snap = await getAdminDb().doc(`${PUBLISHED_COLLECTION}/${slug}`).get();
    if (!snap.exists) return null;
    return snap.data() as PublishedDoc;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PublishPageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getPublished(slug);
  if (!doc) return { title: "Not found" };
  return { title: doc.title, description: doc.content.slice(0, 160) };
}

/** Public read-only render of a published note. */
export default async function PublishPage({ params }: PublishPageProps) {
  const { slug } = await params;
  const doc = await getPublished(slug);
  if (!doc) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center">
      <header className="border-border flex w-full items-center justify-between border-b px-4 py-3">
        <span className="text-muted text-sm font-medium tracking-tight">Stxic</span>
        <span className="text-muted text-xs">Published note</span>
      </header>

      <article className="w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="text-foreground mb-8 text-3xl font-bold tracking-tight">{doc.title}</h1>
        <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
        </div>
      </article>

      <footer className={cn("text-muted w-full px-4 py-6 text-center text-xs")}>
        Published with Stxic · {new Date(doc.publishedAt).toLocaleDateString()}
      </footer>
    </main>
  );
}
