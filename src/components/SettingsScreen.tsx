import { LANGUAGES, Language, text } from "../i18n";

interface Props {
  language: Language;
  onLanguage: (language: Language) => void;
  onBack: () => void;
}

export default function SettingsScreen({ language, onLanguage, onBack }: Props) {
  return (
    <div className="menu">
      <h2 className="step-title">{text(language, "settings")}</h2>
      <p className="subtitle">{text(language, "language")}</p>
      <div className="chip-row">
        {LANGUAGES.map((item) => (
          <button key={item.code} className={`chip ${language === item.code ? "active" : ""}`} onClick={() => onLanguage(item.code)}>{item.label}</button>
        ))}
      </div>
      <div className="wizard-nav">
        <button className="ghost" onClick={onBack}>← {text(language, "back")}</button>
      </div>
    </div>
  );
}
