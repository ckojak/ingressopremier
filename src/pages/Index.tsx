import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import HeroSection from "@/components/home/HeroSection";
import FeaturedCarousel from "@/components/home/FeaturedCarousel";
import DiscoverBar from "@/components/home/DiscoverBar";
import FeaturedEvents from "@/components/home/FeaturedEvents";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Ingressos para os Melhores Eventos"
        description="Compre ingressos para os melhores eventos com segurança e praticidade. PremierPass - Sua porta de entrada para experiências únicas."
        url="https://premierpass.com.br/"
      />
      <Header />
      <main>
        <HeroSection />
        <FeaturedCarousel />
        <DiscoverBar />
        <FeaturedEvents />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
