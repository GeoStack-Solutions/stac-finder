# Logging
Details about the crawling process will be displayed in the terminal, when you open the logs as described in the [Crawler Documentation](./crawler-documentation.md).

## There are three diffrent types of informations:

### Informations
{timestamp} info: ...

Provides information about the crawling process, such as "Crawler started" or "Added {number} URL's to the database"

*Colours:*

Grey: 'normal' Informations such as "Crawling {url}"

Cyan: important information such as the crawling stage or the addition of data to one of the databases

### Warnings
{timestamp} warn: ...

Shows Problems during the crawling process. These Problems could be invalid STAC-Objects or failed attempts to crawl a URL for example. They typically do not significantly impact the crawling result.

*Colour:* Yellow

### Errors
{timestamp} error: ...

Shows serious Problems during the crawling process. Better stop the crawling process if the errors appear often, as these often lead to a data loss, so that the affected collections can no longer be found later via the STACFinder. Depending on the error message, restart the crawling process or contact us if you experience persistent errors.

*Colour*: red
