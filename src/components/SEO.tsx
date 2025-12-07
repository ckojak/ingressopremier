import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "event";
  schema?: object;
}

const defaultMeta = {
  title: "Premier Pass - Sua Entrada para Experiências Únicas",
  description: "A melhor plataforma para descobrir e comprar ingressos para shows, festivais, teatro, esportes e muito mais. Garanta seu ingresso com segurança!",
  keywords: "ingressos, eventos, shows, festivais, teatro, esportes, stand-up, comprar ingressos, eventos ao vivo, premier pass",
  image: "/og-image.png",
  url: "https://premierpass.com.br",
};

const SEO = ({
  title,
  description = defaultMeta.description,
  keywords = defaultMeta.keywords,
  image = defaultMeta.image,
  url = defaultMeta.url,
  type = "website",
  schema,
}: SEOProps) => {
  const fullTitle = title ? `${title} | Premier Pass` : defaultMeta.title;

  const defaultSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Premier Pass",
    url: url,
    logo: `${url}/logo.png`,
    sameAs: [
      "https://instagram.com/premierpass",
      "https://facebook.com/premierpass",
      "https://twitter.com/premierpass",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+55-21-99999-9999",
      contactType: "customer service",
      availableLanguage: "Portuguese",
    },
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Premier Pass" />
      <meta name="robots" content="index, follow" />
      <meta name="language" content="Portuguese" />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content="Premier Pass" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(schema || defaultSchema)}
      </script>
    </Helmet>
  );
};

export default SEO;
