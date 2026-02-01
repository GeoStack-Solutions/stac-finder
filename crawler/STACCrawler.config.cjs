//starts the crawling process in a pm2 environment

module.exports = {
  apps: [{
    name: 'STACFinderCrawler',
    script: './STACFinderCrawler.js',
    instances: 1,
    autorestart: false,
    watch: false,
    env: {
      FORCE_COLOR: 1,
      NODE_ENV: 'production'
    }
  }]
};