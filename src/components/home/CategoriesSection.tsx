import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Music, Theater, Trophy, Mic2, GraduationCap, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const categoryConfig = [
  { name: "Show", displayName: "Shows", icon: Music, color: "from-pink-500 to-rose-500" },
  { name: "Teatro", displayName: "Teatro", icon: Theater, color: "from-purple-500 to-violet-500" },
  { name: "Esportes", displayName: "Esportes", icon: Trophy, color: "from-green-500 to-emerald-500" },
  { name: "Stand-up", displayName: "Stand-up", icon: Mic2, color: "from-yellow-500 to-amber-500" },
  { name: "Workshop", displayName: "Workshops", icon: GraduationCap, color: "from-blue-500 to-cyan-500" },
  { name: "Festival", displayName: "Festivais", icon: PartyPopper, color: "from-primary to-accent" },
];

const CategoriesSection = () => {
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchCategoryCounts = async () => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("category")
          .eq("status", "published")
          .gte("start_date", new Date().toISOString());

        if (error) throw error;

        const counts: Record<string, number> = {};
        (data || []).forEach((event) => {
          if (event.category) {
            counts[event.category] = (counts[event.category] || 0) + 1;
          }
        });
        setCategoryCounts(counts);
      } catch (error) {
        console.error("Error fetching category counts:", error);
      }
    };

    fetchCategoryCounts();
  }, []);

  return (
    <section className="py-20 bg-card/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Explore por <span className="text-gradient">categoria</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Encontre o tipo de evento perfeito para você
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categoryConfig.map((category, index) => {
            const count = categoryCounts[category.name] || 0;
            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Link
                  to={`/eventos?categoria=${category.name.toLowerCase()}`}
                  className="group block"
                >
                  <div className="gradient-card rounded-2xl p-6 text-center shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                      <category.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{category.displayName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {count} {count === 1 ? "evento" : "eventos"}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
