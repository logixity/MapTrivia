import { motion } from "framer-motion";
import { Language, text } from "../i18n";

interface Props {
  language: Language;
  available: boolean;
  onDuel: () => void;
  onSendDuel: () => void;
  onParties: () => void;
  onBack: () => void;
}

export default function Multiplayer({ language, available, onDuel, onSendDuel, onParties, onBack }: Props) {
  const cards = [
    { icon: "⚔️", title: "duel", desc: "duelDesc", action: onDuel },
    { icon: "📨", title: "sendDuel", desc: "sendDuelDesc", action: onSendDuel },
    { icon: "🎉", title: "parties", desc: "partiesDesc", action: onParties },
  ];
  return (
    <div className="menu">
      <h2 className="step-title">{text(language, "multiplayer")}</h2>
      {!available && <p className="notice">{text(language, "unavailable")}</p>}
      <div className="mode-grid">
        {cards.map((card, i) => (
          <motion.button key={card.title} className="mode-card" onClick={card.action} initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18, delay: i * 0.08 }} whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.96 }}>
            <span className="mode-icon">{card.icon}</span>
            <strong>{text(language, card.title)}</strong>
            <small>{text(language, card.desc)}</small>
          </motion.button>
        ))}
      </div>
      <div className="wizard-nav">
        <button className="ghost" onClick={onBack}>← {text(language, "back")}</button>
      </div>
    </div>
  );
}
