import { useParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Users, Share2, Heart, Ticket, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

// Mock event data - will be replaced with real data from backend
const mockEvent = {
  id: "1",
  title: "Rock in Rio 2024 - Dia 1",
  description: `O maior festival de música do mundo está de volta! Rock in Rio 2024 promete ser inesquecível com uma lineup de artistas internacionais e nacionais que vão fazer você vibrar do início ao fim.

Prepare-se para uma experiência única com:
• Palco Mundo com as maiores atrações internacionais
• Palco Sunset com performances memoráveis
• Experiências gastronômicas incríveis
• Espaços interativos e muito mais!

Não perca a chance de fazer parte deste momento histórico.`,
  date: "15 de Setembro de 2024",
  time: "14:00 às 04:00",
  location: "Parque Olímpico",
  address: "Av. Embaixador Abelardo Bueno, 3401 - Barra da Tijuca, Rio de Janeiro - RJ",
  image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200",
  category: "Festival",
  organizer: "Rock World S.A.",
  tickets: [
    { id: "1", name: "Pista", price: 595, available: 234 },
    { id: "2", name: "Pista Premium", price: 850, available: 120 },
    { id: "3", name: "Camarote", price: 1500, available: 45 },
  ],
};

const EventDetails = () => {
  const { id } = useParams();
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const selectedTicketData = mockEvent.tickets.find(t => t.id === selectedTicket);
  const total = selectedTicketData ? selectedTicketData.price * quantity : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        {/* Hero Image */}
        <div className="relative h-[50vh] md:h-[60vh]">
          <img
            src={mockEvent.image}
            alt={mockEvent.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        <div className="container mx-auto px-4 -mt-32 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Event Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-2"
            >
              <Badge className="gradient-primary text-primary-foreground border-0 mb-4">
                {mockEvent.category}
              </Badge>

              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                {mockEvent.title}
              </h1>

              <div className="flex flex-wrap gap-4 mb-8">
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartilhar
                </Button>
                <Button variant="outline" size="sm">
                  <Heart className="w-4 h-4 mr-2" />
                  Favoritar
                </Button>
              </div>

              <div className="gradient-card rounded-2xl p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                      <Calendar className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Data</h3>
                      <p className="text-muted-foreground">{mockEvent.date}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Horário</h3>
                      <p className="text-muted-foreground">{mockEvent.time}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 md:col-span-2">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{mockEvent.location}</h3>
                      <p className="text-muted-foreground">{mockEvent.address}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Sobre o evento</h2>
                <div className="text-muted-foreground whitespace-pre-line">
                  {mockEvent.description}
                </div>
              </div>

              <div className="gradient-card rounded-2xl p-6">
                <h3 className="font-semibold text-foreground mb-2">Organizador</h3>
                <p className="text-muted-foreground">{mockEvent.organizer}</p>
              </div>
            </motion.div>

            {/* Ticket Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="gradient-card rounded-2xl p-6 sticky top-24">
                <h2 className="text-xl font-bold text-foreground mb-6">Selecione seu ingresso</h2>

                <div className="space-y-3 mb-6">
                  {mockEvent.tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket.id)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        selectedTicket === ticket.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-foreground">{ticket.name}</span>
                        <span className="text-xl font-bold text-gradient">
                          R$ {ticket.price.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{ticket.available} disponíveis</span>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedTicket && (
                  <div className="mb-6">
                    <label className="text-sm text-muted-foreground mb-2 block">Quantidade</label>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        -
                      </button>
                      <span className="text-xl font-semibold text-foreground w-8 text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(10, quantity + 1))}
                        className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {selectedTicket && (
                  <div className="border-t border-border pt-4 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-muted-foreground">Total</span>
                      <span className="text-2xl font-bold text-gradient">
                        R$ {total.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  variant="hero"
                  size="xl"
                  className="w-full"
                  disabled={!selectedTicket}
                >
                  <Ticket className="w-5 h-5 mr-2" />
                  Comprar ingresso
                </Button>

                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Compra 100% segura</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EventDetails;
