### Crawler

## Ordnerstruktur

crawler/
│
├─ crawling/
│  ├─ crawler_engine        # crawlt die URLs / gibt JSONs an den parser weiter
│  ├─ crawler_functions     
│  └─ source_manager        # Verwaltung der URLs/Queue
│
├─ data_management/
│  ├─ api_client            # Holt JSON über API
│  └─ db_writer             # Schreiben in SQL-Datenbank
│
├─ parsing/
│  ├─ parser                #parst JSONs, übergibt daten an db_writer und links an den crawler
│  └─ parser_functions       
│
├─ scheduler                # Startet parsen der STAC-Index-JSON
│
├─ tests/
│
├─ .gitignore
│
└─ README.md