FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Replace default nginx config to handle React router if needed (not strict for this simple app)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
