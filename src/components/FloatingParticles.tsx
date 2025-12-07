import { motion } from "framer-motion";

interface Particle {
  id: number;
  size: number;
  x: string;
  y: string;
  color: "cyan" | "magenta";
  delay: number;
  duration: number;
}

const generateParticles = (count: number): Particle[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 12 + 4,
    x: `${Math.random() * 100}%`,
    y: `${Math.random() * 100}%`,
    color: Math.random() > 0.5 ? "cyan" : "magenta",
    delay: Math.random() * 5,
    duration: Math.random() * 6 + 6,
  }));
};

interface FloatingParticlesProps {
  count?: number;
}

const FloatingParticles = ({ count = 20 }: FloatingParticlesProps) => {
  const particles = generateParticles(count);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full blur-sm ${
            particle.color === "cyan"
              ? "bg-primary/40"
              : "bg-accent/40"
          }`}
          style={{
            width: particle.size,
            height: particle.size,
            left: particle.x,
            top: particle.y,
          }}
          animate={{
            y: [0, -30, -15, -40, 0],
            x: [0, 15, -10, 20, 0],
            scale: [1, 1.2, 0.9, 1.1, 1],
            opacity: [0.3, 0.6, 0.4, 0.7, 0.3],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default FloatingParticles;
