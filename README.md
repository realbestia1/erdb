---
title: ERDB - Easy Ratings Database
emoji: 🎬
colorFrom: purple
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# ERDB - Easy Ratings Database (Stateless Edition)

Genera poster/backdrop/logo con ratings dinamici on-the-fly.

## API Usage

Endpoint: GET /{type}/{id}.jpg?ratings={providers}&lang={lang}&tmdbKey={key}&mdblistKey={key}

Esempio: /poster/tt0133093.jpg?ratings=imdb,tmdb&lang=it&tmdbKey=YOUR_KEY&mdblistKey=YOUR_KEY
