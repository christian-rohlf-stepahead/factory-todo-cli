FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY bin ./bin
RUN chown -R 1001:1001 /app
USER 1001
ENV PORT=3000
EXPOSE 3000
CMD ["node", "bin/web.js"]
