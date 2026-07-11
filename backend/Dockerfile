FROM node:20-alpine

WORKDIR /app

# Install dependencies first for caching
COPY package*.json ./
RUN npm ci

# Copy rest of the application
COPY . .

# Generate Prisma Client and Build
RUN npx prisma generate
RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
