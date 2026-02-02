FROM node:22

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Expose app on given port
EXPOSE 4000

# Start app
CMD ["npm", "start"]
