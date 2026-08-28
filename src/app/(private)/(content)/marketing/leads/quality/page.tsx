import type { Metadata } from "next";

import { QualityView } from "@/modules/prospecting/ui/QualityView";

export const metadata: Metadata = {
  title: "Calidad de leads",
  description: "Qué es un buen lead para ti y qué se sabe de los que ya tienes.",
};

export default function QualityPage() {
  return <QualityView />;
}
