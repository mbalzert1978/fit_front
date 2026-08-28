# Gemeinsame Muster

## Vorhandenes vor Neuem

Vor einer neuen Implementierung:

1. Nach erprobten Grundgerüsten und Referenzimplementierungen suchen — in diesem Repo zuerst im
   Baukasten [`src/components/index.ts`](../../src/components/index.ts), in
   [`src/api/hooks.ts`](../../src/api/hooks.ts) und in [`pact/setup.ts`](../../pact/setup.ts)
2. Die Kandidaten bewerten — Sicherheit, Erweiterbarkeit, Passung zum Problem
3. Den besten Treffer als Fundament übernehmen
4. Innerhalb der erprobten Struktur weiterarbeiten

Ein zweiter Weg für dasselbe Element ist der Befund, nicht die Lösung: kein zweiter `fetch` neben
[`src/api/client.ts`](../../src/api/client.ts), keine zweite Komponente für einen Knopf, den es
gibt ([`CLAUDE.md`](../../CLAUDE.md)).

## Entwurfsmuster

### Repository

Datenzugriff hinter einer einheitlichen Schnittstelle kapseln:

- Standardoperationen festlegen: alle finden, nach Id finden, anlegen, ändern, löschen
- Die konkrete Implementierung kennt die Speicherdetails (Datenbank, API, Datei)
- Die Fachlogik hängt an der Abstraktion, nicht am Speichermechanismus
- Das macht den Austausch der Datenquelle einfach und den Test ohne echte Quelle möglich

> **Überschrieben** von [`../typescript/typescript-data-access.md`](../typescript/typescript-data-access.md):
> ein **generisches** Repository ist hier falsch. Die Abstraktion gibt es, sie heißt aber je
> Operation anders und liegt in `src/api/hooks.ts`. Das Speziellere schlägt das Allgemeinere
> ([`../README.md`](../README.md), „Vorrang").

### Format der API-Antwort

Für alle API-Antworten dieselbe Hülle verwenden:

- ein Feld für die Nutzlast und eins für Metadaten — hier `data` und `meta`
- eine einheitliche Fehlerform mit Status und Kennung — hier RFC 9457 mit `type`, `title`,
  `status`, `detail`, `instance` und `errors`
- Metadaten bei seitenweisen Antworten (Gesamtzahl, Seite, Seitengröße)

Diese Hülle ist in diesem Repo nicht Geschmack, sondern Vertragsvorgabe: sie steht vollständig in
[`app/vertraege.md`](../app/vertraege.md) (Regeln 2, 4, 9) und wird von jedem Pact zugesichert. Ein
Vertrag ohne `data`/`meta` ist ein Fehler, kein Sonderfall.

### Anti-Corruption Layer (Adapter an der Grenze)

Ein Adapter, der einen internen Typ über eine Modulgrenze hinweg auf einen externen abbildet, ist
**keine** überflüssige Durchreiche — auch dann nicht, wenn die Signaturen gleich aussehen. Er
entkoppelt das interne Modell vom externen und ist genau das, was die Naht prüfbar hält.

- Eine Brücke, die einen internen Begriff in einen externen übersetzt, ist eine bewusste Grenze,
  keine Identitätshülle. Getrennte interne und externe Typen sind der Zweck: der übrige Code hängt
  nur am internen, deshalb kann ein Test an dieser Naht ein Double einsetzen, ohne die externe
  Seite anzufassen. Im Repo gebaut zu sehen an [`src/time.ts`](../../src/time.ts) und
  [`src/language.ts`](../../src/language.ts) — beide sind eine Naht mit einem austauschbaren
  Provider dahinter, obwohl sie „nur" `new Date()` bzw. `getLocales()` kapseln.
- Eine Schicht bleibt bestehen, auch wenn sie noch kein Verhalten trägt — dokumentierte künftige
  Anwendungsfälle landen dort von selbst. Der Umweg extern → intern → extern ist der bewusste Preis
  der Trennung.

Solche Schichten im Review **nicht** als „dünne Hülle", „Identitäts-Wrapper", „wertlose
Indirektion" oder „Durchreiche" anmerken und ihre Löschung vorschlagen — das koppelt Intern direkt
an Extern und nimmt die Test-Naht weg. Das ist ein wiederkehrendes Fehlurteil in Reviews.
