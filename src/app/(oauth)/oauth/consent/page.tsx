import { ConsentView } from "@/modules/connected-apps/ui/ConsentView"

/**
 * `/oauth/consent?request=<id>` — a donde redirige el `/oauth/authorize` del
 * servidor. El id es opaco; todo lo que se muestra se pide con la sesión.
 */
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string | string[] }>
}) {
  const { request } = await searchParams
  const requestId = typeof request === "string" && request.trim() !== "" ? request : null
  return <ConsentView requestId={requestId} />
}
