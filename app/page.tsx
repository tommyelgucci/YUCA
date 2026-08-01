import Hero from '@/components/landing/Hero';
import FrutigerBanner from '@/components/landing/FrutigerBanner';
import Gallery from '@/components/landing/Gallery';
import ProximosEventos from '@/components/landing/ProximosEventos';
import Categories from '@/components/landing/Categories';
import CommunityCTA from '@/components/landing/CommunityCTA';
import VineDivider from '@/components/ui/VineDivider';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <VineDivider />
      <FrutigerBanner />
      <ProximosEventos />
      <Gallery />
      <VineDivider flip />
      <Categories />
      <CommunityCTA />
    </>
  );
}
