import { redirect } from "next/navigation";

/**
 * Una plantilla no tiene más vista que su edición (hsm-media F3): esta ruta
 * existe para que la miga «Plantilla» enlace a algo y no a un 404. Conserva
 * `?channel=`.
 */
export default async function MetaTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const channel = query.channel ? `?channel=${encodeURIComponent(query.channel)}` : "";
  redirect(`/settings/meta-templates/${encodeURIComponent(id)}/edit${channel}`);
}
