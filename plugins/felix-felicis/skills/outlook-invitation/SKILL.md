---
name: outlook-invitation
description: "Creates a German Outlook meeting invitation with context, goals, agenda, and emojis — ready to copy-paste or auto-fill into Outlook (macOS)."
allowed-tools: AskUserQuestion, Bash
---

# Skill: outlook-invitation

Erstellt eine vollständige, copy-paste-fertige Outlook-Einladung in deutscher Sprache.

## Schritte

### 1. Informationen sammeln

Wenn wichtige Angaben fehlen, bitte über `AskUserQuestion` nachfragen:
- Thema / Betreff
- Anlass / Kontext
- Ziel(e) der Einladung
- Agenda oder Tagesordnungspunkte
- Vorbereitung oder Materialhinweise (optional)
- Tonfall: neutral, locker, formell

### 2. Einladung erstellen

Generiere die Einladung in folgender Struktur:

- **Betreff**: klare, prägnante Einladung
- **Begrüßung**: optional, kurz gehalten
- **Kontext**: ein bis zwei Sätze, warum der Termin wichtig ist
- **Ziel**: stichpunktartig oder als kurze Liste
- **Agenda**: 3-6 Punkte als Bullet-Liste
- **Wichtige Hinweise**: Vorbereitung, Ort, Teilnahmehinweise
- **Call-to-Action**: z. B. „Bitte bestätigt kurz" oder „Bitte tragt euch ein"

### 3. Formatierung

- **Kein Markdown:** Die Ausgabe darf keine Markdown-Syntax enthalten (`**fett**`, `*kursiv*`, `###` Headlines) — diese rendert in Outlook nicht. Formatierung nur über Emojis, Zeilenumbrüche und Absätze.
- Nutze Emojis sparsam zur Hervorhebung von Abschnitten (z. B. 🚀, 💡, ⏱️, 📌).
- Halte den Stil deutsch, klar und einladend.
- Achte auf Outlook-geeignete Zeilenumbrüche und Absätze.
- Verwende klare Überschriften für Kontext, Ziel und Agenda.
- Weiche Formulierungen bevorzugen: „Gerne vorbereiten:" statt „Bitte vorbereiten:".

### 4. Ausgabe

Gib die Einladung in einem direkt kopierbaren Format aus:

```betreff
<Betreff hier>
```

```einladungstext
<Einladungstext hier>
```

Falls der Nutzer einen konkreten Termin genannt hat, ergänze einen kurzen ergänzenden Satz mit Datum/Uhrzeit.

### 5. Bestätigung

Frage via `AskUserQuestion`:
- "Passt alles so?" mit den Optionen:
  - "Ja, so kopieren" — Einladung ist fertig und kann direkt verwendet werden
  - "In Outlook öffnen" — Termin direkt als neuen Outlook-Termin öffnen (macOS, via AppleScript)
  - "Anpassungen nötig" — Nutzer kann Änderungen angeben

### 6. Direkt in Outlook öffnen (macOS)

Falls der Nutzer "In Outlook öffnen" gewählt hat, öffne das moderne Outlook-Terminfenster via AppleScript UI-Scripting und fülle Betreff und Body automatisch ein.

**Wichtig:** `make new calendar event` öffnet immer das alte Outlook-UI. Stattdessen Cmd+N via System Events auslösen — das öffnet das moderne Terminfenster mit Terminplanungs-Assistent.

**Voraussetzung:** Das Terminal muss Accessibility-Berechtigung haben (Systemeinstellungen → Datenschutz & Sicherheit → Bedienungshilfen).

**UI-Versions-Vorbehalt:** Tab-Reihenfolge und Fokusverhalten wurden gegen das "neue" Outlook für Mac verifiziert (Stand Juli 2026). Outlook-Updates können die Feldreihenfolge ändern — das Skript fügt dann ohne Fehlermeldung ins falsche Feld ein. Weise den Nutzer darauf hin, das Ergebnis zu prüfen; sieht es falsch aus, den Copy-Paste-Weg aus Schritt 4 nutzen.

**Tab-Navigation im modernen Outlook-Terminfenster:**
- Erst `Cmd+2` (Kalender-Ansicht), dann `Cmd+N` → Fokus startet direkt auf dem Betreff-Feld
- Betreff per Zwischenablage einfügen (`Cmd+V`) — `keystroke` ist layoutabhängig und verstümmelt Umlaute und Emojis
- 10× Tab vorwärts → Body-Feld (Recipients → Date → StartH → StartM → EndH → EndM → Ganztägig → TZ → Recurrence → Location → Teams)
- `key code 115 using command down` (Cmd+Home) → Cursor an den Anfang des Body (Signatur bleibt erhalten)

**Funktionierendes Muster:**

```bash
osascript - <<'APPLESCRIPT'
tell application "Microsoft Outlook"
  activate
end tell
delay 0.5
tell application "System Events"
  tell process "Microsoft Outlook"
    set frontmost to true
    keystroke "2" using command down
    delay 1
    keystroke "n" using command down
    delay 1.5

    -- Fokus startet direkt auf Betreff — per Zwischenablage einfügen
    -- (keystroke verstümmelt Umlaute/Emojis, da layoutabhängig)
    set the clipboard to "<Betreff hier>"
    keystroke "v" using command down
    delay 0.3

    -- 10x Tab → Body
    repeat 10 times
      key code 48
      delay 0.15
    end repeat
    delay 0.4

    -- Cursor an den Anfang (Signatur bleibt am Ende erhalten)
    key code 115 using command down
    delay 0.2

    set the clipboard to "<Einladungstext hier>

"
    keystroke "v" using command down
  end tell
end tell
APPLESCRIPT
```

**Hinweise:**
- Einladungstext als Plain Text mit Emojis übergeben — kein HTML nötig
- Eine Leerzeile nach dem Text einfügen, damit Signatur optisch abgetrennt bleibt
- Der Nutzer kann im geöffneten Termin Datum, Uhrzeit und Teilnehmer ergänzen

## Beispiele

### Beispiel 1: Team-Sync

```betreff
Team-Sync: Sprintziele & offene Fragen
```

```einladungstext
Kontext:
Wir nähern uns dem Ende des Sprints und wollen kurz gemeinsam auf den Stand schauen.

Ziel:
- Offene Punkte klären
- Sprintziele abgleichen
- Nächste Schritte festlegen

Agenda:
- Kurze Status-Runde
- Offene Blocker besprechen
- Nächste Schritte & Verantwortlichkeiten

Bitte bestätigt kurz eure Teilnahme.
```

### Beispiel 2: Projekt-Kickoff

```betreff
Kickoff: Projekt [Name] – Ziele & Vorgehen
```

```einladungstext
💡 Kontext

Wir starten mit [Projektname] und wollen gemeinsam Ziele, Vorgehen und Rollen klären.

🎯 Ziel dieser Abstimmung

- Projektziel und Scope gemeinsam verstehen
- Vorgehen und Meilensteine abstimmen
- Rollen und Verantwortlichkeiten verteilen

📋 Agenda

1. Projektziel & Hintergrund (10 min)
2. Scope und Abgrenzung (15 min)
3. Vorgehen & Meilensteine (15 min)
4. Rollen & nächste Schritte (10 min)

📌 Gerne vorbereiten:
- Kurzer Blick auf das Projektbriefing
- Erste Gedanken zum Vorgehen

Freue mich auf die Runde!
```
