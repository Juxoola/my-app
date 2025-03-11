FROM node:23-alpine

WORKDIR /app

RUN apk add --no-cache python3 py3-pip python3-dev gdal-dev geos-dev proj-dev build-base

COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
