# Use Node 18 as a base
FROM node:18

# Create the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first for caching dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build SvelteKit production assets (uncomment if needed)
RUN npm run build

# Expose the port your production server listens on (e.g., 8080)
EXPOSE 8080

# Start the production server
CMD ["node", "server-prod.js"]
