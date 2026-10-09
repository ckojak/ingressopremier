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

const SITE_URL = "https://premierpass.com.br";

const defaultMeta = {
  title: "Premier Pass - Sua Entrada para Experiências Únicas",
  description: "A melhor plataforma para descobrir e comprar ingressos para shows, festivais, teatro, esportes e muito mais. Garanta seu ingresso com segurança!",
  keywords: "ingressos, eventos, shows, festivais, teatro, esportes, stand-up, comprar ingressos, eventos ao vivo, premier pass",
  image: `${SITE_URL}/og-image.png`,
  url: SITE_URL,
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
  const absoluteImage = image.startsWith("http")
    ? image
    : `${SITE_URL}${image.startsWith("/") ? "" : "/"}${image}`;

  // Dados da empresa para o Google. Logo: adicionar "logo" aqui quando houver uma imagem quadrada (mín. 512x512) em /public.
  const defaultSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Premier Pass",
        alternateName: ["PremierPass"],
        url: SITE_URL,
        sameAs: ["https://www.instagram.com/premierpass.oficial/"],
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+55-21-97993-4676",
          contactType: "customer service",
          availableLanguage: "Portuguese",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "Premier Pass",
        alternateName: ["PremierPass", "premierpass.com.br"],
        url: SITE_URL,
        inLanguage: "pt-BR",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
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
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content="Premier Pass" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={absoluteImage} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(schema || defaultSchema)}
      </script>
    </Helmet>
  );
};

export default SEO;
