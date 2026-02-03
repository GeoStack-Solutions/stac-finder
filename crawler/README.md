### Crawler - Folders:

    crawler/  
    │  
    ├─ crawlingEnging/              main functions to controll the crawling process
    │  ├─ crawler_engine.js         main function that controlls the crawling 
    │  ├─ crawler_functions.js      general functions used in the crawling_enging
    │  ├─ migrator.js               function to migrate STAC Objects to one normalized version
    │
    ├─ data_management/
    │  ├─ db_client                 function to create a PostgreSQL connection pool
    │  ├─ db_writer.js              functions to interact with the database   
    │  └─ stac_index_client.js      function to interact with the STAC Index Database
    │
    ├─ handleCollections/
    │  └─ CollectionParser          function to get collection data
    │
    ├─ logging/
    │  └─ logger.js                 definition of the logging structure
    │
    ├─ queueManager/
    │  └─ queue_manager.js          functions to interact with the queue and with child data of
    │                               stacObjects
    │
    ├─ sourceManager/
    │  └─ source_manager.js         functions to interact with the sources database
    │
    ├─ tests/                       tests for development purposes
    │
    ├─ validation/
    │  ├─ json_validator.js         functions to validate STAC Objects
    │  ├─ queue_validator.js        function to validate new queue entries 
    │  └─ source_validator.js       function to validate new source entries
    │
    ├─ .gitignore
    │
    ├─ Dockerfile
    │
    ├─ package-lock.json
    │
    ├─ package.json
    │
    ├─ README.md
    │
    ├─ STACCrawler.config.cjs       function to controll the start of the Crawler when it runs
    │                               on the STAC Server with pm2
    │
    └─ STACFinderCrawler.js         function to start the crawler and to controll what happens 
                                    when it stops