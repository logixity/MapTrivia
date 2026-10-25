import { FormEvent, useState } from "react";
import { Language, text } from "../i18n";

interface Props {
  language: Language;
  initial: string;
  onSave: (name: string) => void;
}

export default function NameScreen({ language, initial, onSave }: Props) {
  const [name, setName] = useState(initial);
  const valid = name.trim().length >= 2;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (valid) onSave(name.trim());
  }

  return (
    <form className="menu" onSubmit={submit}>
      <div className="title">🌍 Map Trivia</div>
      <h2 className="step-title">{text(language, "enterName")}</h2>
      <input className="name-input" value={name} maxLength={16} autoFocus placeholder={text(language, "username")} onChange={(event) => setName(event.target.value)} />
      <div className="wizard-nav" style={{ justifyContent: "center" }}>
        <button className="play" type="submit" disabled={!valid}>{text(language, "continue")}</button>
      </div>
    </form>
  );
}
