import {
  FaLinkedinIn,
  FaInstagram,
  FaFacebookF,
  FaXTwitter,
  FaYoutube,
  FaTiktok,
  FaBehance,
  FaGithub,
  FaWhatsapp,
} from "react-icons/fa6";

/**
 * Logos de redes de terceros.
 *
 * `react-icons` en lugar de lucide por la excepción sancionada del design
 * system: lucide no incluye logos de marcas (DESIGN-SYSTEM §7). Se renderizan
 * con `currentColor`, así que heredan el token de color del contenedor.
 */
const ICONS = {
  linkedin: FaLinkedinIn,
  instagram: FaInstagram,
  facebook: FaFacebookF,
  x: FaXTwitter,
  youtube: FaYoutube,
  tiktok: FaTiktok,
  behance: FaBehance,
  github: FaGithub,
  whatsapp: FaWhatsapp,
} as const;

export type SocialIconName = keyof typeof ICONS;

export function SocialIcon({
  name,
  className = "h-4 w-4",
}: {
  name: SocialIconName;
  className?: string;
}) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" className={className} />;
}
