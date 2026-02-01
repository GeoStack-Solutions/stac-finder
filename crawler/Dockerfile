FROM node:22

# Set the /app directory as working directory
WORKDIR /app

# Copy crawler package files
COPY crawler/package*.json ./crawler/

# Install dependencies
WORKDIR /app/crawler
RUN npm install

# Copy entire project
WORKDIR /app
COPY . .

# Start the crawler
WORKDIR /app/crawler
CMD ["node", "STACCrawler.config.cjs"]
