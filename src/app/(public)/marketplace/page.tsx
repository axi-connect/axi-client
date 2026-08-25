import type { Metadata } from 'next';

import { pageMetadata } from '@/core/seo/metadata';
import MarketplaceHero from '@/shared/components/layout/marketplace-hero';

export const metadata: Metadata = pageMetadata({
	title: 'Marketplace',
	description:
		'Conecta marcas e influencers de alto impacto. El marketplace de Axi Connect está en construcción: déjanos tus datos y te avisamos cuando abra.',
	path: '/marketplace',
});

export default function MarketplacePage() {
	return <MarketplaceHero />;
}
