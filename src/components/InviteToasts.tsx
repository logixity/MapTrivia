import { AnimatePresence, motion } from "framer-motion";
import { Language, text } from "../i18n";
import { Invite } from "../duel";

interface Props {
  language: Language;
  invites: Invite[];
  onAccept: (invite: Invite) => void;
  onDecline: (invite: Invite) => void;
}

export default function InviteToasts({ language, invites, onAccept, onDecline }: Props) {
  return (
    <div className="toasts">
      <AnimatePresence>
        {invites.slice(0, 3).map((invite) => (
          <motion.div key={invite.id} className="toast" layout initial={{ opacity: 0, x: 120, scale: 0.8 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 120, scale: 0.8 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
            <p>⚔️ {text(language, "invited").replace("{name}", invite.from)}</p>
            <div className="toast-actions">
              <button className="play small" onClick={() => onAccept(invite)}>{text(language, "accept")}</button>
              <button className="ghost" onClick={() => onDecline(invite)}>{text(language, "decline")}</button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
