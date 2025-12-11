import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import HeroSection from "@/components/home/HeroSection";
import FeaturedEvents from "@/components/home/FeaturedEvents";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Quintal Barra - Gastro Music Bar | Ingressos"
        description="Garanta seu ingresso para os melhores eventos do Quintal Barra. Gastro Music Bar na Barra da Tijuca, Rio de Janeiro."
      />
      <Header />
      <main>
        <HeroSection />
        <FeaturedEvents />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
