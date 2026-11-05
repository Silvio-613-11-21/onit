FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

EXPOSE 8080

CMD [ "sh", "-c" , "npx drizzle-kit migrate && npm start" ]
