## Описание проекта

**My App** — это веб-приложение для работы с интерактивными картами, имеющее интеграцию геоинформационным сервисом GeoServer. Приложение построено с использованием React для клиентской части и OpenLayers для работы с картографическими данными.

### Основной функционал

- **Интерактивная карта:**

  - Используется базовый слой OpenStreetMap.
  - Добавляются динамические WMS-слои с GeoServer, позволяющие отображать геоданные (например, "topp:states", "topp:tasmania_roads" и "topp:tasmania_water_bodies").

- **Переключение слоев:**

  - Пользователь может включать или отключать видимость отдельных WMS-слоев с помощью чекбоксов, что позволяет настраивать отображение карты по своему усмотрению.

- **Аутентификация:**
  - Форма авторизации реализована для управления доступом к расширенной карте. При вводе корректных учетных данных пользователь перенаправляется на страницу с дополнительными данными.

### Интеграция с GeoServer

Приложение обращается к GeoServer через WMS-запросы, что позволяет динамически загружать геопространственные данные. Для корректной работы убедитесь, что:

- **GeoServer запущен и доступен** по адресу `http://localhost:8080/geoserver`.
- На GeoServer настроены слои с именами:
  - `topp:states`
  - `topp:tasmania_roads`
  - `topp:tasmania_water_bodies`

## Запуск проекта

1. **Установка зависимостей:**

   ```bash
   npm install
   ```

2. **Запуск приложения:**

   ```bash
   npm start
   ```

   Приложение по умолчанию открывается на порту 3000.

3. **Запуск GeoServer:**
   Следуйте инструкции по установке GeoServer (Stand-alone, через Tomcat) и убедитесь, что сервер доступен по адресу `http://localhost:8080/geoserver`.

## Установка и запуск GeoServer

### Варианты установки GeoServer

#### Stand-alone версия

**На Windows:**

1. **Скачивание:**  
   Перейдите на [официальный сайт GeoServer](https://geoserver.org/download/) и скачайте установщик

2. **Распаковка и запуск:**
   - Запустите установщик и следуйте инструкциям.
   - Откройте браузер по адресу:
     ```
     http://localhost:8080/geoserver
     ```

**На Linux:**

1. **Скачивание:**  
   Скачайте ZIP-архив с [официального сайта GeoServer](https://geoserver.org/download/).

2. **Распаковка:**

   ```bash
   unzip geoserver-<version>-bin.zip -d /opt/geoserver
   ```

3. **Запуск:**
   ```bash
   cd /opt/geoserver/geoserver-<version>
   java -jar start.jar
   ```
   - GeoServer будет доступен по адресу:
     ```
     http://localhost:8080/geoserver
     ```

#### Установка через Apache Tomcat (развертывание WAR-файла)

1. **Убедитесь, что установлен Java и Apache Tomcat.**  
   _(На Ubuntu можно установить Tomcat9: `sudo apt install tomcat9`)_

2. **Скачивание WAR-файла:**  
   Получите `geoserver.war` с [официального сайта GeoServer](https://geoserver.org/download/).

3. **Размещение WAR-файла:**  
   Скопируйте файл в каталог `webapps` Tomcat:

   ```bash
   sudo cp geoserver.war /var/lib/tomcat9/webapps/
   ```

4. **Перезапуск Tomcat:**

   ```bash
   sudo systemctl restart tomcat9
   ```

5. **Доступ к GeoServer:**  
   Откройте браузер и перейдите по адресу:
   ```
   http://localhost:8080/geoserver
   ```

---

## Запуск проекта с помощью Docker

Перед запуском убедитесь, что на вашей машине установлены [Docker](https://www.docker.com/get-started) и [Docker Compose](https://docs.docker.com/compose/install/).

1. **Сборка и запуск контейнеров**

   Перейдите в корневую директорию проекта (там, где находится файл `docker-compose.yml`) и выполните команду:

   ```bash
   docker-compose up --build
   ```

   Эта команда:

   - Соберёт Docker-образ для приложения согласно файлу `Dockerfile`.
   - Запустит оба контейнера – для приложения (`nodeapp`) и GeoServer (`geoserver`).

2. **Доступ к приложениям**

   После успешного запуска:

   - Приложение будет доступно по адресу: [http://localhost:3000](http://localhost:3000)
   - GeoServer – по адресу: [http://localhost:8080/geoserver](http://localhost:8080/geoserver)

3. **Остановка контейнеров**

   Чтобы остановить и удалить запущенные контейнеры, выполните команду:

   ```bash
   docker-compose down
   ```

---
