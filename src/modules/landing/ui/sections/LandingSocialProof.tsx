import { BrandLogo } from "@/modules/landing/ui/components/BrandLogo";
import { LogoMarquee } from "@/modules/landing/ui/components/LogoMarquee";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { MARQUEE_MIN_ITEMS, SOCIAL_PROOF } from "@/modules/landing/ui/content/landing.content";

type Business = (typeof SOCIAL_PROOF.businesses)[number];

/**
 * Ítem del logo cloud: logo PNG independiente (con blur-up) y, debajo,
 * el nicho que se despliega al hover (`grid-rows 0fr → 1fr` + fade).
 * En táctil (`hover: none`) y con foco de teclado el nicho queda visible.
 * Si el negocio tiene `websiteUrl`, todo el ítem enlaza a su sitio.
 */
function LogoItem({ business }: { business: Business }) {
  /* Tipos anchos a propósito: el contenido puede traer URL, null o undefined
     según se vaya llenando — un literal siempre-truthy colapsaría la rama
     sin enlace a `never` (mismo caso que photoSrc en LandingCases). */
  const websiteUrl: string | null | undefined = business.websiteUrl;
  const logoSrc: string | null | undefined = business.logoSrc;

  const content = (
    <>
      <BrandLogo src={logoSrc} name={business.name} height={80} />
      <span className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-hover/logo:grid-rows-[1fr] group-focus-visible/logo:grid-rows-[1fr] [@media(hover:none)]:grid-rows-[1fr]">
        <span className="overflow-hidden">
          <span className="text-muted-foreground block pt-1.5 text-center text-[13px] whitespace-nowrap opacity-0 transition-opacity delay-75 duration-300 group-hover/logo:opacity-100 group-focus-visible/logo:opacity-100 [@media(hover:none)]:opacity-100">
            {business.detail}
          </span>
        </span>
      </span>
    </>
  );

  const itemClass =
    "group/logo flex flex-col items-center justify-start rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (websiteUrl) {
    return (
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${business.name} — ${business.detail}`}
        className={itemClass}
      >
        {content}
      </a>
    );
  }
  return (
    <div tabIndex={0} className={itemClass}>
      {content}
    </div>
  );
}

/**
 * §2 Barra de prueba social — logo cloud: logos reales de los negocios que
 * ya venden con Axi. Con `MARQUEE_MIN_ITEMS` o más, la fila de desktop pasa
 * a marquee automático (pausa al hover); en móvil siempre es un grid de dos
 * columnas con los nichos visibles.
 */
export default function LandingSocialProof() {
  const { businesses } = SOCIAL_PROOF;
  const useMarquee = businesses.length >= MARQUEE_MIN_ITEMS;

  return (
    <section className="border-border/60 w-full border-y">
      <Reveal className="mx-auto flex w-full max-w-[1100px] flex-col items-center gap-8 px-6 py-12 text-center">
        <span className="text-muted-foreground text-xs font-medium tracking-[0.14em] uppercase">
          {SOCIAL_PROOF.kicker}
        </span>

        {/* Móvil: grid de 2 columnas (el último ítem impar centra a lo ancho) */}
        <div className="grid w-full grid-cols-2 items-center gap-x-6 gap-y-8 sm:hidden [&>*:last-child:nth-child(odd)]:col-span-2">
          {businesses.map((business) => (
            <LogoItem key={business.name} business={business} />
          ))}
        </div>

        {/* Desktop: marquee con suficientes logos; si no, fila centrada */}
        <div className="w-full max-sm:hidden">
          {useMarquee ? (
            <LogoMarquee durationSeconds={businesses.length * 6}>
              {businesses.map((business) => (
                <LogoItem key={business.name} business={business} />
              ))}
            </LogoMarquee>
          ) : (
            // items-center: cada logo tiene su propia altura parametrizada;
            // el centrado vertical alinea la fila aunque las cajas difieran
            <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-8">
              {businesses.map((business) => (
                <LogoItem key={business.name} business={business} />
              ))}
            </div>
          )}
        </div>

        <span className="text-muted-foreground/80 text-[13px]">{SOCIAL_PROOF.closing}</span>
      </Reveal>
    </section>
  );
}
