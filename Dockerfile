FROM node:20-slim

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY . .

RUN npm run build

# O Railway e outras PaaS precisam de uma porta aberta, mesmo que o bot use Polling.
# Isso evita que o serviço seja marcado como "failing" por não responder a pings de saúde.
EXPOSE 3000

CMD ["node", "dist/index.js"]
