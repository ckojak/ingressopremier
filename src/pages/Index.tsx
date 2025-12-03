import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import TrustBar from "@/components/home/TrustBar";
import HeroSection from "@/components/home/HeroSection";
import FeaturedEvents from "@/components/home/FeaturedEvents";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO />
      <Header />
      <TrustBar />
      <main className="pt-8">
        <HeroSection />
        <FeaturedEvents />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
