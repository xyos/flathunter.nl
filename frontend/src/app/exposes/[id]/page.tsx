import { notFound } from "next/navigation";
import { ExposeDetailClient } from "@/components/ExposeDetailClient";

export default async function ExposeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ crawler?: string }>;
}) {
  const [{ id }, { crawler }] = await Promise.all([params, searchParams]);
  const exposeId = Number(id);

  if (!Number.isFinite(exposeId) || !crawler) {
    notFound();
  }

  return <ExposeDetailClient exposeId={exposeId} crawler={crawler} />;
}
