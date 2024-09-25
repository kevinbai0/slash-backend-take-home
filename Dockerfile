# This is a sample Dockerfile. Edit this however you'd like.
FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]
