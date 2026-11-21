import { redirect } from "next/navigation";

/**
 * Una búsqueda no tiene ficha propia: su miga («Búsqueda») lleva a lo que se
 * hace con ella, «Escribirles» (B2). Sin esta página, la miga era un 404.
 */
export default async function SearchPage({ params }: { params: Promise<{ searchId: string }> }) {
  const { searchId } = await params;
  redirect(`/marketing/leads/searches/${searchId}/escribir`);
}
