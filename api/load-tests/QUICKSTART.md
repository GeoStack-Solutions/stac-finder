# Load Testing - Quick Start Guide

## 1. Setup

```bash
# Stelle sicher, dass die API läuft
cd /Users/luis/repository/stac-finder
docker-compose up api

# In einem neuen Terminal
cd api
npm install  # Falls noch nicht gemacht
```

## 2. Load Test ausführen

```bash
npm run load-test
```

Das dauert ca. **5-6 Minuten** (9 Szenarien × 30 Sekunden + 5 Sekunden Pause zwischen Tests).

## 3. Was wird getestet?

1. **Baseline** - Einfache Collection-Abfrage
2. **Pagination** - Große Seitengröße (50 Items)
3. **Free Text Search** - Suche nach "sentinel"
4. **BBox Filter** - Räumliche Filterung
5. **Datetime Filter** - Zeitliche Filterung
6. **Combined Filters** - Mehrere Filter kombiniert
7. **CQL2 Filter** - Komplexe JSON-Filter
8. **Sorting** - Sortierung nach Titel
9. **Combined Query** - Alle Parameter zusammen

## 4. Ergebnisse verstehen

### Während des Tests

Du siehst eine Fortschrittsanzeige:
```
Running 30s test @ http://localhost:4000/collections
10 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 45ms │ 82ms │ 156ms │ 180ms│ 85.23ms │ 32.41ms │ 250ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
```

### Nach dem Test

Eine Zusammenfassung aller Szenarien:
```
┌─────────────────────────────────────────────┬──────────┬───────────┬──────────┬─────────┐
│ Scenario                                    │ Req/sec  │ Latency   │ Errors   │ p99     │
├─────────────────────────────────────────────┼──────────┼───────────┼──────────┼─────────┤
│ Baseline - GET /collections                 │    120.5 │     82.45 │        0 │  156.32 │
│ Free Text Search                            │     45.2 │    221.35 │        0 │  432.18 │
└─────────────────────────────────────────────┴──────────┴───────────┴──────────┴─────────┘
```

## 5. Bewertung

### Gut ✅
- Latency < 300ms
- p99 < 1000ms
- Keine Errors
- Requests/sec > 50

### Verbesserungsbedarf ⚠️
- Latency > 500ms → Datenbank-Optimierung nötig
- Errors > 0 → API oder DB Probleme
- p99 > 2000ms → Einzelne Queries zu langsam

## 6. Ergebnisse speichern

Die Ergebnisse werden automatisch gespeichert in:
```
api/load-tests/results/load-test-2026-02-03T12-30-45.json
```

## 7. Für Dokumentation

Kopiere die wichtigsten Ergebnisse in `docs/api/performance.md`:
- Throughput (Requests/sec)
- Latency (Durchschnitt und p99)
- Identifizierte Engpässe
- Empfehlungen

## Häufige Probleme

### API nicht erreichbar
```
❌ Cannot reach API at http://localhost:4000
```
**Lösung**: `docker-compose up api` oder `npm start`

### Zu viele Fehler
```
⚠️  Most Errors: Combined Query
Total Errors: 150
```
**Lösung**: 
- DB Connection Pool überprüfen
- Logs checken: `docker-compose logs api`
- Evtl. weniger Connections (CONNECTIONS=5 in run-load-tests.js)

### Sehr langsam
```
Average Latency: 1250.45ms
```
**Lösung**:
- Datenbank-Indizes prüfen
- Queries optimieren
- Caching implementieren

## Nächste Schritte

1. **Baseline festlegen** - Erster Test = Ausgangswert
2. **Engpässe identifizieren** - Welche Endpoints sind langsam?
3. **Optimieren** - Indizes, Caching, Query-Optimierung
4. **Re-testen** - Verbesserung messen
5. **Dokumentieren** - Ergebnisse in performance.md
