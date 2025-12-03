import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Music, Theater, Trophy, Mic2, GraduationCap, PartyPopper } from "lucide-react";

const categories = [
  { name: "Shows", icon: Music, color: "from-pink-500 to-rose-500", count: 1234 },
  { name: "Teatro", icon: Theater, color: "from-purple-500 to-violet-500", count: 456 },
  { name: "Esportes", icon: Trophy, color: "from-green-500 to-emerald-500", count: 789 },
  { name: "Stand-up", icon: Mic2, color: "from-yellow-500 to-amber-500", count: 321 },
  { name: "Workshops", icon: GraduationCap, color: "from-blue-500 to-cyan-500", count: 567 },
  { name: "Festivais", icon: PartyPopper, color: "from-primary to-accent", count: 234 },
];

const CategoriesSection = () => {
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
          {categories.map((category, index) => (
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
                  <h3 className="font-semibold text-foreground mb-1">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.count} eventos</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
