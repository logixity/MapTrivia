import { motion } from "framer-motion";

const COLORS = ["#ffc857", "#22d3b6", "#5b5bff", "#ff5c7a", "#3ddc97"];

// Particles fly out from the centre; positions are fixed per index so renders stay stable.
export default function Burst({ count = 18 }: { count?: number }) {
  return (
    <div className="burst" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const distance = 90 + (i % 3) * 40;
        return (
          <motion.span
            key={i}
            style={{ background: COLORS[i % COLORS.length] }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, scale: 0, opacity: 0, rotate: 180 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}
