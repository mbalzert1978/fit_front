import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, OutlineButton, FormField } from '../src/components';
import { useTheme } from '../src/theme/ThemeProvider';
import { register, registrationRequest, minPasswordLength, maxDisplayNameLength, type RegistrationRequest } from '../src/api/session';
import { ApiError, OfflineError } from '../src/api/client';
import { problems } from '../src/api/problems';
import { newId } from '../src/api/ids';

/** Die Felder, die diese Maske zeigt. Wozu sie keines hat, kann sie nicht anstreichen. */
const sichtbareFelder = ['displayName', 'email', 'password'] as const;
type SichtbaresFeld = (typeof sichtbareFelder)[number];

/** Die Sätze aus `problem+json`, nach den Feldnamen des Anfrage-Rumpfes geordnet. */
type FieldHints = Partial<Record<SichtbaresFeld, string[]>>;

/**
 * Trennt, was an ein Feld gehört, von dem, was hier kein Feld hat.
 *
 * Der Server prüft mehr, als diese Maske abfragt — `locale` und `timeZoneId`
 * kommen aus dem Gerät und stehen in keiner Zeile. Käme dazu eine Begründung
 * und niemand finge sie auf, scheiterte die Registrierung **stumm**: kein roter
 * Rand, kein Satz, nur ein Knopf, der wieder angeht.
 */
function splitHints(errors: Record<string, string[]>) {
  const fields: FieldHints = {};
  const general: string[] = [];
  for (const [feld, saetze] of Object.entries(errors)) {
    if ((sichtbareFelder as readonly string[]).includes(feld)) fields[feld as SichtbaresFeld] = saetze;
    else general.push(...saetze);
  }
  return { fields, general };
}

/** Die feldweisen Begründungen, wenn welche kamen. */
function errorsOf(e: unknown): Record<string, string[]> {
  return e instanceof ApiError ? (e.errors ?? {}) : {};
}

/**
 * Die Zeile unter den Feldern. Der Server redet zuerst: `detail` ist sein Satz
 * zu genau diesem Vorfall, und er kommt in der Sprache, in der gefragt wurde —
 * die Maske reicht ihn unverändert durch und übersetzt nichts. Eigene Sätze hat
 * sie nur, wo keiner kommt: beim Netzfehler, und als letzter Rückfall.
 */
function generalHintFor(e: unknown, general: string[]): string | null {
  if (general.length > 0) return general.join(' ');
  if (e instanceof OfflineError) return 'Keine Verbindung';
  if (e instanceof ApiError) return e.detail ?? 'Registrierung derzeit nicht möglich';
  return 'Registrierung derzeit nicht möglich';
}

/**
 * Der Idempotency-Key eines Registrierungsversuchs.
 *
 * Er hängt an den **Daten**, nicht am Tastendruck: zweimal dasselbe getippt ist
 * derselbe Versuch, und der Server spielt die erste Antwort noch einmal ab,
 * statt eine zweite Registrierung zu prüfen. Genau dafür ist er da — die
 * Antwort geht auf dem Rückweg verloren, der Nutzer tippt erneut, und ohne
 * Schlüssel läse er, seine E-Mail sei bereits vergeben. Von ihm selbst.
 *
 * Ändert sich ein Feld, ist es ein anderer Versuch und braucht einen anderen
 * Schlüssel: derselbe an einem anderen Rumpf ist ein Fehler und keine
 * Wiederholung (`idempotency-key-reused`). Deshalb hängt er am **ganzen**
 * Rumpf, so wie er hinausgeht — samt Sprache und Zone, die kein Feld der Maske
 * sind und sich zwischen zwei Versuchen trotzdem ändern können.
 */
function useIdempotencyKey() {
  const versuch = useRef<{ daten: string; key: string } | null>(null);
  return (r: RegistrationRequest) => {
    const daten = JSON.stringify(r);
    if (versuch.current?.daten !== daten) versuch.current = { daten, key: newId() };
    return versuch.current.key;
  };
}

export default function RegisterScreen() {
  const t = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<FieldHints>({});
  // Die vergebene E-Mail steht in keinem `errors`-Eintrag: sie verstößt gegen
  // keine Feldregel. Rot wird das Feld trotzdem — gemeint ist genau dieses.
  const [conflict, setConflict] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const keyFor = useIdempotencyKey();

  /**
   * Ein Aufruf, ein Ausgang: die Registrierung legt das Konto an und liefert
   * dieselbe Sitzung wie die Anmeldung. Deshalb führt der Erfolg direkt ins
   * Tagebuch und nicht zurück auf die Anmeldemaske.
   */
  async function submit() {
    setBusy(true);
    setFields({});
    setConflict(false);
    setHint(null);
    try {
      const anfrage = registrationRequest({ email: email.trim(), password, displayName: name.trim() });
      await register(anfrage, keyFor(anfrage));
      router.replace('/(tabs)/diary');
    } catch (e) {
      const { fields: benannt, general } = splitHints(errorsOf(e));
      setFields(benannt);
      setConflict(e instanceof ApiError && e.type === problems.emailAlreadyRegistered);
      setHint(generalHintFor(e, general));
    } finally {
      setBusy(false);
    }
  }

  // Die eigene Regel steht vor dem Aufruf, nicht erst in seiner Antwort. Alles
  // Weitere prüft der Server; er kennt seine Regeln, die Maske nicht.
  const tooShort = password.length > 0 && password.length < minPasswordLength;
  const nameOk = name.trim().length > 0;

  return (
    <Screen>
      <Text style={[t.font.title, { color: t.color.text }]}>Konto anlegen</Text>
      <View style={{ gap: t.space[6], marginTop: t.space[8] }}>
        <FormField
          label="Name"
          hints={fields.displayName}
          value={name}
          onChangeText={setName}
          maxLength={maxDisplayNameLength}
          autoCapitalize="words"
          textContentType="name"
        />
        <FormField
          label="E-Mail"
          hints={fields.email}
          invalid={conflict}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="username"
        />
        <FormField
          label="Passwort"
          hints={fields.password}
          note={`Mindestens ${minPasswordLength} Zeichen`}
          noteInvalid={tooShort}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
        />
      </View>
      {hint ? <Text style={[t.font.micro, { color: t.color.accent, marginTop: t.space[4] }]}>{hint}</Text> : null}
      <View style={{ gap: t.space[4], marginTop: t.space[8] }}>
        <OutlineButton
          label={busy ? 'Konto wird angelegt …' : 'Konto anlegen'}
          onPress={submit}
          disabled={busy || !nameOk || !email || password.length < minPasswordLength}
        />
        {/* Zurück und nicht ersetzen: sonst stünde die Anmeldemaske zweimal im Stapel. */}
        <OutlineButton
          label="Ich habe schon ein Konto"
          variant="muted"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
        />
      </View>
    </Screen>
  );
}
