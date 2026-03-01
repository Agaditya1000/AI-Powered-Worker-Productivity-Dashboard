FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache python3 make g++ && npm install
COPY . .
# Using tsx to run directly
RUN npm install -g tsx
EXPOSE 3001
CMD ["tsx", "index.ts"]
