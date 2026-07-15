# Monster Under The Bed 🎮

A full-stack horror survival game built with Node.js + Express.

## Quick Start

```bash
npm install
npm start
```

Then open http://localhost:3000

## Features
- Main menu with login/register (JWT auth)
- Loading screen with chapter reveal
- Chapter 1: full side-scrolling gameplay
  - Arrow keys / A,D to move
  - F to toggle flashlight or hide in closet
  - Space/↑ to interact (pick up diary pages)
  - P / Escape to pause
- Health & battery systems
- Monster AI: Patrol → Alert → Hunt → Stunned
- Flashlight repels the monster
- Closet hides the player from the monster
- 8 diary pages across the game (3 in Chapter 1)
- Caught screen / Escape screen with stats
- 3 endings based on pages collected
- Auto-save every 30 seconds (logged-in users)
- Backend: REST API with JWT auth (in-memory, swap `users` Map for PostgreSQL)

## Pages
| Route | Description |
|---|---|
| / | Main menu (with auth modal) |
| /loading.html | Loading screen |
| /chapter1.html | Chapter 1 gameplay |
| /caught.html | Game over screen |
| /survive.html | Victory / escape screen |

## API Endpoints
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | /api/game/register | — | Create account |
| POST | /api/game/login | — | Login |
| POST | /api/game/save | ✓ | Save game state |
| GET | /api/game/load | ✓ | Load game state |
| DELETE | /api/game/delete | ✓ | Delete save |
| POST | /api/game/caught | ✓ | Record caught event |
| POST | /api/game/restart | ✓ | Reset to chapter 1 |
| GET | /api/game/settings | ✓ | Get settings |
| PUT | /api/game/settings | ✓ | Update settings |

## PostgreSQL (Production)
Replace the in-memory Maps in server.js with the backend/ PostgreSQL implementation.
Run `node backend/setup-db.js` after setting your .env credentials.

## Author
By Prajin Pokhrel
