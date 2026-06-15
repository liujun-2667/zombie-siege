FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY .npmrc ./
RUN npm install --omit=dev

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]