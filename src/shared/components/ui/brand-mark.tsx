import { useId } from "react"
import { cn } from "@/core/lib/utils"

/**
 * Isotipo de Axi Connect ("α" de tres cintas: coral, violeta y ámbar).
 *
 * SVG inline para que renderice al instante (splash/loaders, sin fetch) y
 * permita animar cada cinta por separado (`data-ribbon`). Los hex de los
 * gradientes son el artwork del logo (asset de marca, no color de UI); la
 * fuente de verdad es `public/brand/isologo-axi-connect.svg` — si el asset
 * cambia, se regeneran estos paths desde ese archivo.
 */
export function BrandMark({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  // Ids únicos por instancia: varios BrandMark en la misma página no deben
  // compartir defs (un ancestro oculto rompería los gradientes del resto).
  const id = useId()
  const coral = `${id}-coral`
  const violet = `${id}-violet`
  const amber = `${id}-amber`

  return (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("shrink-0", className)}
      {...props}
    >
      <path
        data-ribbon="coral"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M228.574 374.558C305.107 374.558 335.082 305.843 357.987 250.872C344.244 183.302 305.107 127.186 228.574 127.186C152.042 127.186 90 182.562 90 250.872C90 319.182 152.042 374.558 228.574 374.558ZM222.848 303.553C253.208 303.553 277.82 279.454 277.82 249.726C277.82 219.999 253.208 195.9 222.848 195.9C192.488 195.9 167.876 219.999 167.876 249.726C167.876 279.454 192.488 303.553 222.848 303.553Z"
        fill={`url(#${coral})`}
      />
      <path
        data-ribbon="violet"
        d="M270.948 257.743C300.724 150.09 349.97 127.185 408.377 127.186C383.182 159.252 341.953 337.444 292.708 360.815C238.652 386.468 181.619 371.122 161.005 358.524C196.507 366.541 247.824 341.346 270.948 257.743Z"
        fill={`url(#${violet})`}
      />
      <path
        data-ribbon="amber"
        d="M355.696 225.676C373.104 295.307 398.833 353.943 409.522 374.558C309.886 374.558 280.11 290.955 266.367 225.676C253.589 164.978 191.163 140.928 166.731 139.783C186.887 125.124 225.804 121.086 268.658 132.912C311.511 144.737 341.667 169.559 355.696 225.676Z"
        fill={`url(#${amber})`}
      />
      <defs>
        <linearGradient id={coral} x1="90" y1="265.286" x2="358.293" y2="250.973" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E65759" />
          <stop offset="1" stopColor="#803032" />
        </linearGradient>
        <linearGradient id={violet} x1="209.833" y1="374.8" x2="408.224" y2="127.145" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4D03B0" />
          <stop offset="1" stopColor="#9A4FFF" />
        </linearGradient>
        <linearGradient id={amber} x1="394.576" y1="374.8" x2="184.868" y2="115.827" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E39800" />
          <stop offset="1" stopColor="#FFD580" />
        </linearGradient>
      </defs>
    </svg>
  )
}
