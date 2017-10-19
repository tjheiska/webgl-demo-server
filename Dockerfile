FROM node

RUN mkdir -p /usr/src/app 
WORKDIR /usr/src/app

RUN npm install -g typescript

COPY package.json /usr/src/app
RUN npm install

COPY tsconfig.json /usr/src/app
COPY webgl-config.json /usr/src/app
COPY src /usr/src/app/src
RUN npm run build
COPY assets /usr/src/app/dist/assets

EXPOSE 8080
CMD ["npm", "start"]
