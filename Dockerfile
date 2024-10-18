FROM node:18.20-bookworm
ARG ENV=dev
RUN apt update && apt install -y jq
WORKDIR /app

COPY package.json yarn.lock* ./
# Omit --production flag for TypeScript devDependencies

COPY data ./data
COPY hardhat ./hardhat
COPY prisma ./prisma
COPY src ./src
COPY entrypoint.sh .
COPY .mocharc.json .
COPY .eslintignore .
COPY .eslintrc.json .
COPY .prettierrc .
COPY jest.config.json .
COPY tsconfig.json .

RUN sed -i 's/"strict": true/"strict": false/g' "tsconfig.json"
RUN yarn --frozen-lockfile
RUN npx prisma generate
RUN yarn build

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
# USER nodejs

ENTRYPOINT ["/app/entrypoint.sh"]
EXPOSE 3000
STOPSIGNAL SIGTERM
