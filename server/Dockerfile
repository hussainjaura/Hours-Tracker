# stage 1:
# stage 1 is for building the build like the start command:
# aws official lambda image for node.js:
FROM public.ecr.aws/lambda/nodejs:22 AS build
WORKDIR /build

# we will install the packages first n then docker can reuse this only when the code
# changes:
COPY package.json package-lock.json ./
RUN npm ci

# generate the prisma client this run the linux:
COPY prisma ./prisma
COPY prisma.config.ts ./
# the URL is the place holder so the generate never conect to a database:
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate


# stage 2:
# stage 2 is for what lambda actually runs:
FROM public.ecr.aws/lambda/nodejs:22
WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=build /build/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# run the handler export from src/lambda.js:
CMD ["src/lambda.handler"]