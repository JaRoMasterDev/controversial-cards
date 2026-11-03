# Controversial Cards

A multiplayer fill-in-the-blank party card game. One player judges each round, everyone else plays their funniest answer cards into the blanks of a question, and the judge picks a winner.

## Run it

```bash
git clone https://github.com/JaRoMasterDev/controversial-cards.git
cd controversial-cards
npm install
npm run dev     # http://localhost:3000
npm test        # engine unit tests
```

Create a room, share the 4-letter code (or the invite link), and start once at least 3 players are in.

## How a game works

1. The host picks the card sets (built-in and/or imported) and the points needed to win, then starts the game. Everyone is dealt 10 answer cards.
2. Each round a **judge** is chosen at random. The role changes every round, and everyone judges once before anyone judges again.
3. The judge's question is shown to all. Everyone else plays as many answer cards as the question has blanks, in the order they fill them. Questions with three blanks deal everyone two extra cards first.
4. When all players have played, the submissions are revealed anonymously and the judge picks the best one. Its author scores a point.
5. Who played what is revealed, hands are refilled to 10 and the next round starts. The first player to reach the target score wins.

Players who join mid-game are dealt in from the next round. If someone disconnects for more than 15 seconds they are marked away and skipped; if that was the judge, the round restarts with a new judge. A player who lost their tab can rejoin with the same name to get their seat, score and hand back.

## Built-in card sets

- **Classic** (English US, UK, Canada, Australia and International, plus German, Spanish, Portuguese, Catalan, Galician, Italian, Dutch, Greek, Hebrew, Romanian, Russian, Czech and Turkish) and **Family Edition** are adapted from the publisher's free print-and-play decks, which are released under Creative Commons BY-NC-SA ([2.0](https://creativecommons.org/licenses/by-nc-sa/2.0/) for the English editions, [4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) for the others). They live in [`lib/packs/classic/`](lib/packs/classic/) as JSON and stay under those licences: credit the original authors, no commercial use, share changes alike. See [`lib/packs/classic/LICENSE.md`](lib/packs/classic/LICENSE.md). The app shows the required attribution at `/credits`, linked from the home page and the lobby.
- **Core** and **Office Chaos** were written for this app. The lobby lists them last, in a Custom group together with any imported sets.

New rooms start with **Classic (US)** selected. The English editions share most of their cards, so pick the one that fits your group rather than all five.

Because of the NonCommercial term, don't sell this app or charge for access while it ships the Classic and Family sets.

## Importing your own cards

In the lobby, the host can import a card set made of two JSON arrays of strings:

- **Questions**: use `_` for each blank, for example `"My secret talent is _."` A question without a blank takes one answer. At most 3 blanks.
- **Answers**: for example `"A suspiciously damp sock."`

```json
["The worst thing to find in the back seat: _.", "_ and _: the musical."]
```

Templates: [`public/examples/questions.json`](public/examples/questions.json) and [`public/examples/answers.json`](public/examples/answers.json). Imported sets are kept in the room and saved in your browser so you can add them to later rooms.

## Architecture

There is no database. All rooms live in memory in the Next.js server process and disappear when it restarts. Idle rooms are deleted after an hour.

| Path | Purpose |
| --- | --- |
| `lib/game/engine.ts` | Pure game rules: dealing, judge rotation, submissions, scoring, departures |
| `lib/game/cards.ts` | Blank parsing, filling questions with answers, import validation |
| `lib/game/types.ts` | Shared types, including the per-player `RoomView` sent to clients |
| `lib/packs/` | Built-in card sets; `classic/` holds the adapted print-and-play sets and their licence |
| `lib/server/store.ts` | In-memory room registry, presence tracking and the next-round timer |
| `app/api/rooms/...` | `POST /api/rooms` (create), `POST /[code]/join`, `POST /[code]/action`, `GET /[code]/events` (Server-Sent Events) |
| `lib/client/` | Session storage, API calls and the `useRoom` hook |
| `components/`, `app/` | UI, including the `/credits` page |

Each player's view is computed on the server, so nobody receives another player's hand, and submissions stay anonymous until the judge has picked.

Because state is in memory, run it as a single long-lived Node process (`npm run build && npm start`). Serverless or multi-instance hosting would give each instance its own rooms.

## License

The source code and the original Core and Office Chaos card sets are released under the [MIT License](LICENSE).

The adapted Classic and Family Edition card sets in [`lib/packs/classic/`](lib/packs/classic/) are not covered by the MIT License. They keep the Creative Commons BY-NC-SA licence of the print-and-play decks they come from, so they may not be used commercially. See [`lib/packs/classic/LICENSE.md`](lib/packs/classic/LICENSE.md). If you want to use this project commercially, remove those sets first.

This is a fan-made project and is not affiliated with or endorsed by the publisher of the original card game.

Issues and pull requests are welcome.
