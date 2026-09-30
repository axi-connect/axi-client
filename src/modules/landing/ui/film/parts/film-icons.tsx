import {
  Beef,
  Box,
  BriefcaseBusiness,
  CupSoda,
  Droplet,
  Hand,
  Headphones,
  Laptop,
  Package,
  Salad,
  ShieldPlus,
  Smartphone,
  Sparkles,
  Tablet,
  UtensilsCrossed,
  Watch,
  type LucideIcon,
} from "lucide-react";

import type { FilmIcon } from "@/modules/landing/domain/film/film-content";

/** Mapa cerrado nombre → icono: el dominio no conoce React ni lucide. */
export const FILM_ICONS: Record<FilmIcon, LucideIcon> = {
  utensils: UtensilsCrossed,
  smartphone: Smartphone,
  sparkles: Sparkles,
  briefcase: BriefcaseBusiness,
  burger: Beef,
  cup: CupSoda,
  salad: Salad,
  tablet: Tablet,
  headphones: Headphones,
  watch: Watch,
  laptop: Laptop,
  droplet: Droplet,
  hand: Hand,
  package: Package,
  box: Box,
  shield: ShieldPlus,
};
