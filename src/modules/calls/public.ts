/**
 * Superficie pública del slice `calls` (§3.3 regla 5).
 *
 * Nace para el rail de contexto del inbox: su panel de llamadas consume la
 * lista compacta por contacto sin importar rutas internas del slice.
 */

export { ContactCallsList } from "@/modules/calls/ui/components/ContactCallsList";
// Plan de modos §7: «Llamar» a un contacto desde la ficha, el inbox o Cobros.
export { CallContactButton } from "@/modules/calls/ui/components/CallContactButton";
