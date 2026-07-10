FROM oven/bun:1.1-alpine AS base
WORKDIR /usr/src/app
COPY package.json  ./
RUN bun install

COPY . .

EXPOSE 9000

CMD ["bun", "--expose-gc", "src/index.ts"]
