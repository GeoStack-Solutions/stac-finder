import { startCrawler } from "./crawlingEngine/crawler_engine.js";
import { saveInBackup } from "./queueManager/queue_manager.js";
import { logger } from "./logging/logger.js"
import chalk from "chalk"

//if someone stops the programm, save the data that is not yet uploaded lacally
process.on('SIGINT', () => {
  saveInBackup()
  process.exit(0)
})

process.on('SIGTERM', () => {
  saveInBackup()
  process.exit(0)
})

try {
  // start crawling process
  startCrawler()
} catch(err) {
  // if there is a error
  // save not uploaded data
  saveInBackup()

  // log the error
  logger.error(chalk.red(err))
}