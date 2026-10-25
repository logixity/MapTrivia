import { Continent } from "./data/countries";

export type Language = "en" | "de" | "fr" | "it" | "es" | "hu";

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "es", label: "Español" },
  { code: "hu", label: "Magyar" },
];

const strings: Record<Language, Record<string, string>> = {
  en: { tagline: "Pick a mode and test your geography skills", settings: "Settings", language: "Language", all: "All", questions: "questions", play: "Play", quit: "Quit", score: "Score", correct: "Correct!", gameOver: "Game over", newRecord: "New high score!", bestStreak: "Best streak", personalBest: "Personal best", again: "Play again", menu: "Menu", question: "Question", findCountry: "Find this country on the map", drawFlag: "Draw this flag", clear: "Clear", submit: "Check flag", accuracy: "Flag accuracy", tapCountry: "Tap a country on the map", answerWas: "It was", modeFlag: "Flag to Country", modeCapital: "Country to Capital", modeCapitalCountry: "Capital to Country", modeCountryFlag: "Country to Flag", modeDraw: "Draw the Flag", modeMap: "Find on Map" },
  de: { tagline: "Wähle einen Modus und teste dein Geografiewissen", settings: "Einstellungen", language: "Sprache", all: "Alle", questions: "Fragen", play: "Spielen", quit: "Beenden", score: "Punkte", correct: "Richtig!", gameOver: "Spiel beendet", newRecord: "Neuer Rekord!", bestStreak: "Beste Serie", personalBest: "Persönlicher Rekord", again: "Nochmal spielen", menu: "Menü", question: "Frage", findCountry: "Finde dieses Land auf der Karte", drawFlag: "Zeichne diese Flagge", clear: "Löschen", submit: "Flagge prüfen", accuracy: "Flaggen-Genauigkeit", tapCountry: "Tippe auf ein Land", answerWas: "Gesucht war", modeFlag: "Flagge zu Land", modeCapital: "Land zu Hauptstadt", modeCapitalCountry: "Hauptstadt zu Land", modeCountryFlag: "Land zu Flagge", modeDraw: "Flagge zeichnen", modeMap: "Auf der Karte finden" },
  fr: { tagline: "Choisissez un mode et testez votre géographie", settings: "Paramètres", language: "Langue", all: "Tout", questions: "questions", play: "Jouer", quit: "Quitter", score: "Score", correct: "Correct !", gameOver: "Partie terminée", newRecord: "Nouveau record !", bestStreak: "Meilleure série", personalBest: "Record personnel", again: "Rejouer", menu: "Menu", question: "Question", findCountry: "Trouvez ce pays sur la carte", drawFlag: "Dessinez ce drapeau", clear: "Effacer", submit: "Vérifier", accuracy: "Précision du drapeau", tapCountry: "Touchez un pays sur la carte", answerWas: "La réponse était", modeFlag: "Drapeau vers pays", modeCapital: "Pays vers capitale", modeCapitalCountry: "Capitale vers pays", modeCountryFlag: "Pays vers drapeau", modeDraw: "Dessiner le drapeau", modeMap: "Trouver sur la carte" },
  it: { tagline: "Scegli una modalità e metti alla prova la geografia", settings: "Impostazioni", language: "Lingua", all: "Tutti", questions: "domande", play: "Gioca", quit: "Esci", score: "Punteggio", correct: "Corretto!", gameOver: "Partita finita", newRecord: "Nuovo record!", bestStreak: "Serie migliore", personalBest: "Record personale", again: "Gioca ancora", menu: "Menu", question: "Domanda", findCountry: "Trova questo paese sulla mappa", drawFlag: "Disegna questa bandiera", clear: "Cancella", submit: "Controlla bandiera", accuracy: "Precisione bandiera", tapCountry: "Tocca un paese sulla mappa", answerWas: "La risposta era", modeFlag: "Bandiera al paese", modeCapital: "Paese alla capitale", modeCapitalCountry: "Capitale al paese", modeCountryFlag: "Paese alla bandiera", modeDraw: "Disegna la bandiera", modeMap: "Trova sulla mappa" },
  es: { tagline: "Elige un modo y pon a prueba tu geografía", settings: "Ajustes", language: "Idioma", all: "Todos", questions: "preguntas", play: "Jugar", quit: "Salir", score: "Puntos", correct: "¡Correcto!", gameOver: "Fin de la partida", newRecord: "¡Nuevo récord!", bestStreak: "Mejor racha", personalBest: "Récord personal", again: "Jugar de nuevo", menu: "Menú", question: "Pregunta", findCountry: "Encuentra este país en el mapa", drawFlag: "Dibuja esta bandera", clear: "Borrar", submit: "Comprobar bandera", accuracy: "Precisión de la bandera", tapCountry: "Toca un país en el mapa", answerWas: "Era", modeFlag: "Bandera a país", modeCapital: "País a capital", modeCapitalCountry: "Capital a país", modeCountryFlag: "País a bandera", modeDraw: "Dibuja la bandera", modeMap: "Encuentra en el mapa" },
  hu: { tagline: "Válassz módot, és teszteld a földrajztudásod", settings: "Beállítások", language: "Nyelv", all: "Mind", questions: "kérdés", play: "Játék", quit: "Kilépés", score: "Pontszám", correct: "Helyes!", gameOver: "Játék vége", newRecord: "Új rekord!", bestStreak: "Legjobb sorozat", personalBest: "Személyes rekord", again: "Újra", menu: "Menü", question: "Kérdés", findCountry: "Keresd meg ezt az országot a térképen", drawFlag: "Rajzold le ezt a zászlót", clear: "Törlés", submit: "Zászló ellenőrzése", accuracy: "Zászló pontossága", tapCountry: "Koppints egy országra a térképen", answerWas: "A helyes válasz", modeFlag: "Zászlótól az országig", modeCapital: "Országtól a fővárosig", modeCapitalCountry: "Fővárostól az országig", modeCountryFlag: "Országtól a zászlóig", modeDraw: "Zászlórajzolás", modeMap: "Keresd meg a térképen" },
};

const supplemental: Record<Language, Record<string, string>> = {
  en: { descFlag: "Name the country from its flag", descCapital: "Pick the capital city", descCapitalCountry: "Which country has this capital?", descCountryFlag: "Find the right flag", descDraw: "Sketch it and see how close you get", descMap: "Locate the country from its capital", modeCountryMap: "Country on Map", descCountryMap: "Find the named country on the map", promptFlag: "Which country does this flag belong to?", promptCapital: "What is its capital?", promptCapitalCountry: "Which country is this the capital of?", promptCountryFlag: "Which flag is theirs?" },
  de: { descFlag: "Erkenne das Land an seiner Flagge", descCapital: "Wähle die Hauptstadt", descCapitalCountry: "Zu welchem Land gehört diese Hauptstadt?", descCountryFlag: "Finde die richtige Flagge", descDraw: "Zeichne die Flagge und vergleiche", descMap: "Finde das Land anhand der Hauptstadt", modeCountryMap: "Land auf der Karte", descCountryMap: "Finde das genannte Land auf der Karte", promptFlag: "Zu welchem Land gehört diese Flagge?", promptCapital: "Was ist die Hauptstadt?", promptCapitalCountry: "Zu welchem Land gehört diese Hauptstadt?", promptCountryFlag: "Welche Flagge gehört dazu?" },
  fr: { descFlag: "Nomme le pays à partir de son drapeau", descCapital: "Choisissez la capitale", descCapitalCountry: "À quel pays appartient cette capitale ?", descCountryFlag: "Trouvez le bon drapeau", descDraw: "Dessinez le drapeau et comparez", descMap: "Situez le pays grâce à sa capitale", modeCountryMap: "Pays sur la carte", descCountryMap: "Trouvez le pays indiqué sur la carte", promptFlag: "À quel pays appartient ce drapeau ?", promptCapital: "Quelle est sa capitale ?", promptCapitalCountry: "De quel pays cette ville est-elle la capitale ?", promptCountryFlag: "Quel est son drapeau ?" },
  it: { descFlag: "Indovina il paese dalla bandiera", descCapital: "Scegli la capitale", descCapitalCountry: "A quale paese appartiene questa capitale?", descCountryFlag: "Trova la bandiera giusta", descDraw: "Disegna la bandiera e confrontala", descMap: "Trova il paese dalla capitale", modeCountryMap: "Paese sulla mappa", descCountryMap: "Trova il paese indicato sulla mappa", promptFlag: "A quale paese appartiene questa bandiera?", promptCapital: "Qual è la sua capitale?", promptCapitalCountry: "Di quale paese è la capitale?", promptCountryFlag: "Qual è la sua bandiera?" },
  es: { descFlag: "Adivina el país por su bandera", descCapital: "Elige la capital", descCapitalCountry: "¿A qué país pertenece esta capital?", descCountryFlag: "Encuentra la bandera correcta", descDraw: "Dibuja la bandera y compara", descMap: "Ubica el país por su capital", modeCountryMap: "País en el mapa", descCountryMap: "Encuentra el país indicado en el mapa", promptFlag: "¿A qué país pertenece esta bandera?", promptCapital: "¿Cuál es su capital?", promptCapitalCountry: "¿De qué país es capital esta ciudad?", promptCountryFlag: "¿Cuál es su bandera?" },
  hu: { descFlag: "Találd ki az országot a zászlója alapján", descCapital: "Válaszd ki a fővárost", descCapitalCountry: "Melyik országhoz tartozik ez a főváros?", descCountryFlag: "Keresd meg a megfelelő zászlót", descDraw: "Rajzold le, és nézd meg, mennyire hasonlít", descMap: "Keresd meg az országot a fővárosa alapján", modeCountryMap: "Ország a térképen", descCountryMap: "Keresd meg a megnevezett országot a térképen", promptFlag: "Melyik országhoz tartozik ez a zászló?", promptCapital: "Mi az ország fővárosa?", promptCapitalCountry: "Melyik országnak a fővárosa ez?", promptCountryFlag: "Melyik a zászlaja?" },
};

export function text(language: Language, key: string): string {
  return strings[language][key] ?? supplemental[language][key] ?? strings.en[key] ?? supplemental.en[key] ?? key;
}

export function localizedCountry(code: string, fallback: string, language: Language): string {
  try {
    return new Intl.DisplayNames([language], { type: "region" }).of(code.toUpperCase()) ?? fallback;
  } catch {
    return fallback;
  }
}

export function continentName(continent: Continent | "All", language: Language): string {
  if (continent === "All") return text(language, "all");
  const translated: Record<Language, Record<Continent, string>> = {
    en: { Europe: "Europe", Asia: "Asia", Africa: "Africa", "North America": "North America", "South America": "South America", Oceania: "Oceania" },
    de: { Europe: "Europa", Asia: "Asien", Africa: "Afrika", "North America": "Nordamerika", "South America": "Südamerika", Oceania: "Ozeanien" },
    fr: { Europe: "Europe", Asia: "Asie", Africa: "Afrique", "North America": "Amérique du Nord", "South America": "Amérique du Sud", Oceania: "Océanie" },
    it: { Europe: "Europa", Asia: "Asia", Africa: "Africa", "North America": "Nord America", "South America": "Sud America", Oceania: "Oceania" },
    es: { Europe: "Europa", Asia: "Asia", Africa: "África", "North America": "América del Norte", "South America": "América del Sur", Oceania: "Oceanía" },
    hu: { Europe: "Európa", Asia: "Ázsia", Africa: "Afrika", "North America": "Észak-Amerika", "South America": "Dél-Amerika", Oceania: "Óceánia" },
  };
  return translated[language][continent];
}
