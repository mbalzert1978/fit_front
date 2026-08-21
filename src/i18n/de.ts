import { de as deLocale } from 'date-fns/locale';

/**
 * Die deutsche Fassung — und zugleich die Liste, die es gibt.
 *
 * Was hier steht, ist vollständig: jede andere Sprache ist ein `Partial` davon
 * (`en.ts`), und was dort fehlt, erscheint auf Deutsch. Ein Schlüssel steht
 * damit nie auf dem Schirm — er hat immer einen Satz hinter sich.
 *
 * Werte sind Zeichenketten oder Funktionen. Eine Funktion steht überall dort,
 * wo eine Zahl oder ein Name mitten im Satz sitzt: die Wortstellung gehört zur
 * Übersetzung und nicht in den Screen.
 *
 * Zwei Werte sind keine Sätze: `dateLocale` und die Datumsmuster. Sie stehen
 * hier, weil ein deutsches Datum in einer englischen Oberfläche derselbe Fehler
 * wäre wie ein deutscher Knopf.
 */
export const de = {
  dateLocale: deLocale,
  /** Wochentag, Tag und Monat — die Kopfzeile des Tagebuchs. */
  dayFormat: 'EEEE, d. MMMM',
  /** Tag und Monat ohne Wochentag. */
  dayMonthFormat: 'd. MMMM',
  weekdayFormat: 'EEEE',

  tabDiary: 'Tagebuch',
  tabScan: 'Scan',
  tabRecipes: 'Rezepte',
  tabMore: 'Mehr',

  macroCarbs: 'Kohlenhydrate',
  macroProtein: 'Eiweiß',
  macroFat: 'Fett',
  energy: 'Energie',
  amount: 'Menge',
  sourceProduct: 'Produkt',
  sourceRecipe: 'Rezept',
  noConnection: 'Keine Verbindung',
  cameraPermission: 'Kamera freigeben',
  macroOfTarget: (target: number, unit: string) => `von ${target} ${unit}`,
  addNamed: (name: string) => `${name} hinzufügen`,
  removeNamed: (name: string) => `${name} entfernen`,

  diaryTodayPrefix: 'HEUTE · ',
  diaryRemaining: 'Noch',
  diaryAddToSlot: (slot: string) => `Zu ${slot} hinzufügen`,
  diaryActivity: 'Aktivität',
  diaryPlannedDay: 'Geplanter Tag',
  diaryEntrySaved: 'Eintrag gespeichert',

  dayToday: 'Heute',
  dayTomorrow: 'Morgen',
  dayYesterday: 'Gestern',

  confidenceSure: 'SICHER',
  confidenceCheck: 'PRÜFEN',
  confidenceUnsure: 'UNSICHER',
  confidenceMissing: 'WERT FEHLT',

  loginTitle: 'Anmelden',
  loginBusy: 'Anmelden …',
  loginEmail: 'E-Mail',
  loginPassword: 'Passwort',
  loginFailed: 'Anmeldung derzeit nicht möglich',
  loginToRegister: 'Konto anlegen',

  registerTitle: 'Konto anlegen',
  registerBusy: 'Konto wird angelegt …',
  registerName: 'Name',
  registerPasswordNote: (min: number) => `Mindestens ${min} Zeichen`,
  registerFailed: 'Registrierung derzeit nicht möglich',
  registerToLogin: 'Ich habe schon ein Konto',

  scanHintBarcode: 'BARCODE IN DEN RAHMEN HALTEN',
  scanHintIngredient: 'ZUTAT SCANNEN — BARCODE IN DEN RAHMEN HALTEN',
  scanSearch: 'Suche',
  scanSearchPlaceholder: 'Produkt, Marke oder Rezept',
  scanRecent: 'Letzte Einträge',
  scanRecentLine: (kind: string, grams: number, kcal: number) => `${kind} · ${grams} g · ${kcal} kcal`,

  notFoundTitle: 'Produkt nicht gefunden',
  notFoundExplain:
    'Dieser Barcode ist noch in keinem Katalog. Fotografiere die Nährwerttabelle — die Werte landen danach in deinem Katalog.',
  notFoundPhoto: 'Nährwerttabelle fotografieren',
  notFoundManual: 'Werte manuell eingeben',
  notFoundRescan: 'Erneut scannen',

  photoTitle: 'Nährwerttabelle',
  photoHint1: 'Ganze Tabelle inklusive Kopfzeile erfassen',
  photoHint2: 'Gerade halten, Reflexionen vermeiden',
  photoHint3: 'Angaben pro 100 g bevorzugen',
  photoUploadFailed: 'Hochladen fehlgeschlagen — bitte erneut versuchen',
  photoBusy: 'Wird gesendet …',
  photoShoot: 'Foto aufnehmen',

  processingTitle: 'Nährwerte werden extrahiert',
  processingStep1: 'Bild hochgeladen',
  processingStep2: 'Tabelle erkannt',
  processingStep3: 'Werte zuordnen',
  processingUnreadable: 'Tabelle nicht lesbar — bitte erneut fotografieren',

  confirmName: 'Produktname',
  confirmNoBarcode: 'ohne Barcode',
  confirmPer100g: 'Angaben pro 100 g',
  confirmSubmit: 'Übernehmen',
  nutrientSaturatedFat: 'davon gesättigte Fettsäuren',
  nutrientSugar: 'davon Zucker',
  nutrientSalt: 'Salz',

  entryForThisAmount: 'Für diese Menge',
  entrySave: 'Änderung speichern',
  entryDelete: 'Eintrag löschen',

  productSourceCurated: 'Quelle: Katalog',
  productSourceOcr: 'Quelle: OCR, von dir bestätigt',
  productSourceManual: 'Quelle: von dir eingegeben',
  productNutrients: 'Nährwerte für diese Menge',
  productAdd: 'Hinzufügen',

  recipesEmpty: 'Zutaten einzeln erfassen — die App summiert die Mengen und rechnet Gramm und Nährwerte pro Portion aus.',
  recipesLine: (portions: number, grams: number, kcal: number) => `${portions} Portionen · ${grams} g · ${kcal} kcal je Portion`,
  recipesNew: 'Neues Rezept anlegen',

  recipeName: 'Name',
  recipeIngredients: 'Zutaten',
  recipeScanIngredient: 'Zutat scannen',
  recipeIngredientsOnlyScanned: 'Zutaten kommen ausschließlich per Barcode oder OCR in die App.',
  recipePortioning: 'Portionierung',
  recipePerPortionHint: (grams: number) => `ergibt ${grams} g pro Portion`,
  recipeComputed: 'Berechnet',
  recipeTotalGrams: 'Gesamtmenge',
  recipeTotalKcal: 'Gesamt',
  recipePerPortion: 'Pro Portion',
  recipeCarbsPerPortion: 'Kohlenhydrate je Portion',
  recipeProteinPerPortion: 'Eiweiß je Portion',
  recipeFatPerPortion: 'Fett je Portion',
  recipeSave: 'Rezept speichern',
  recipeSaveFailed: 'Speichern nicht möglich',
  recipeConflict: 'Zwischenzeitlich anderswo geändert — Stand wird neu geladen',
  recipeNoEtag: 'Stand nicht überprüfbar — Rezept neu laden',
  recipeToDiary: 'Zum Tagebuch hinzufügen',
  recipePortions: 'Portionen',
  recipeGrams: 'Gramm',

  settingsAccount: 'Konto',
  settingsSlots: 'Mahlzeiten-Slots',
  settingsSlotNotEmpty: 'Dieser Slot enthält noch Einträge',
  settingsAddSlot: 'Slot hinzufügen',
  settingsNewSlotName: 'Neue Mahlzeit',
  settingsDailyGoal: 'Tagesziel',
  settingsApplyDailyGoal: 'Tagesziel übernehmen',
  settingsDistribution: (percent: number) => `Verteilung ergibt ${percent} % — Tagesziel aktualisiert sich bei 100 %.`,
  settingsMacroCalc: 'Makro-Berechnung',
  settingsPhysiological: 'Physiologisch',
  settingsPhysiologicalHint: '4,1 / 4,1 / 9,3 kcal je g · Atwater',
  settingsDeclaration: 'Deklaration',
  settingsDeclarationHint: '4 / 4 / 9 kcal je g · EU 1169/2011',
  settingsRoundUp: 'Aufrunden',
  settingsRoundUpHint: 'nie zu wenig gezählt',
  settingsRoundDown: 'Abrunden',
  settingsRoundDownHint: 'nie zu viel gezählt',
  settingsHealth: 'Apple Health',
  settingsConnected: 'Verbunden',
  settingsNotConnected: 'Nicht verbunden',
  settingsDisconnect: 'Trennen',
  settingsConnect: 'Verbinden',
  settingsImportActivity: 'Aktivität & Verbrauch importieren',
  settingsExportNutrition: 'Ernährung exportieren',
  settingsActivityInGoal: 'Aktivkalorien aufs Ziel addieren',
  settingsHealthConnectNote: 'Android nutzt Health Connect mit denselben Datentypen.',
  settingsAppearance: 'Darstellung',
  settingsDark: 'Dunkel',
  settingsLight: 'Hell',
  settingsLanguage: 'Sprache',
  /** Sprachnamen stehen in ihrer eigenen Sprache und werden nicht übersetzt. */
  languageDe: 'Deutsch',
  languageEn: 'English',
};

export type Texts = typeof de;
