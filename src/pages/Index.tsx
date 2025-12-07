import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import HeroSection from "@/components/home/HeroSection";
import PromoBanner from "@/components/home/PromoBanner";
import FeaturedEvents from "@/components/home/FeaturedEvents";
import CategoriesSection from "@/components/home/CategoriesSection";
import OrganizersSection from "@/components/home/OrganizersSection";
import StatsSection from "@/components/home/StatsSection";
import CTASection from "@/components/home/CTASection";
import TrustSection from "@/components/home/TrustSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO />
      <Header />
      <main>
        <HeroSection />
        <FeaturedEvents />
        <TrustSection />
        <CategoriesSection />
        <OrganizersSection />
        <StatsSection />
        <PromoBanner />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
