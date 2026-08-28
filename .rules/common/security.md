# Sicherheit

## Pflichtprüfungen

Vor JEDEM Commit:

- [ ] Keine fest verdrahteten Geheimnisse (API-Schlüssel, Passwörter, Token). Zusätzlich hier: eine
      `EXPO_PUBLIC_*`-Variable wird in das Bundle gebacken und ist damit öffentlich — dort gehört
      nur hinein, was jeder lesen darf ([`.env.example`](../../.env.example))
- [ ] Alle Nutzereingaben geprüft
- [ ] Fremde Werte kodiert in den Pfad (`pathSegment`) — das Gegenstück zur SQL-Injection der
      Vorlage: die Einschleusung passiert nicht in eine Abfrage, sondern in eine URL
      ([`app/http-schicht.md`](../app/http-schicht.md))
- [ ] Keine Fremdzeichenkette in eine Auszeichnung gerendert (kein `dangerouslySetInnerHTML`, kein
      zusammengebautes `WebView`-HTML) — das Gegenstück zu XSS
- [ ] Die Basis-URL ist `https` ([`app/http-schicht.md`](../app/http-schicht.md))
- [ ] Die Sitzung liegt geräteintern unter **einem** Schlüssel und wird nicht in ein Backup gereicht
      ([`app/http-schicht.md`](../app/http-schicht.md))
- [ ] `Cache-Control: no-store` an jeder Antwort mit personenbezogenen Daten — zugesichert im
      Vertrag, nicht gehofft ([`app/vertraege.md`](../app/vertraege.md), Regeln 2 und 9)
- [ ] Fehlermeldungen geben nichts Sensibles preis

Authentifizierung, Autorisierung, CSRF-Schutz und Rate Limiting setzt der Provider durch; dieses
Repo prüft sie nicht, sondern **sichert sie zu**: `Authorization` an jeder geschützten Anfrage,
`401` und `403` als eigene Vertragsfälle ([`app/vertraege.md`](../app/vertraege.md), Regeln 4 und 9).
Eine Zusage, die im Vertrag fehlt, darf die Gegenseite brechen, ohne dass es jemand merkt — das ist
hier die Sicherheitslücke.

## Umgang mit Geheimnissen

- Geheimnisse NIE in den Quellcode schreiben
- IMMER Umgebungsvariablen oder den sicheren Gerätespeicher verwenden — Token gehören in
  `expo-secure-store`, nie in `AsyncStorage` und nie in eine Datei
- Beim Start prüfen, dass die benötigten Werte vorhanden und plausibel sind; `client.ts` lässt die
  App bei falscher Basis-URL scheitern statt Klartext zu senden
- Jedes möglicherweise offengelegte Geheimnis austauschen

## Vorgehen bei einem Fund

1. SOFORT anhalten
2. Kritische Punkte beheben, bevor es weitergeht
3. Offengelegte Geheimnisse austauschen
4. Die Codebasis auf gleichartige Stellen durchsehen
