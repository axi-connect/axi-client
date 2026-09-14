/**
 * Descarga de una URL same-origin (típicamente `/api/proxy/...` con
 * `Content-Disposition: attachment`) mediante un ancla efímera.
 *
 * Sustituye a `window.open(url, "_blank")`: no abre una pestaña en blanco, no
 * lo frena el bloqueador de ventanas y el nombre del archivo lo decide la
 * cabecera del backend (por eso `download` va vacío). Solo vale para el mismo
 * origen: en cross-origin el navegador ignora `download` y navega.
 */
export function triggerDownload(href: string): void {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = "";
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
