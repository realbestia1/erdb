---
title: ERDB - Easy Ratings Database
emoji: 🎬
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# ERDB - Easy Ratings Database

Generates poster/backdrop/logo with dynamic ratings on-the-fly.

## Usage

`GET /{type}/{id}.jpg?ratings={providers}&lang={lang}&tmdbKey={key}&mdblistKey={key}`

Example: `/poster/tt0133093.jpg?ratings=imdb,tmdb&lang=it&tmdbKey=YOUR_KEY&mdblistKey=YOUR_KEY`
