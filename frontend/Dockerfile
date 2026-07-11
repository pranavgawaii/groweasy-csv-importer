FROM node:20-alpine

WORKDIR /app

# Install dependencies first for caching
COPY package*.json ./
RUN npm ci

# Copy rest of the application
COPY . .

# Build Next.js application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
