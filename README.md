# Ultimate Nakama Ninja Battle — Browser Edition

A browser reconstruction of Albert's May 2016 Unity game, combining the supplied animated HTML remake with the recovered original characters, ability artwork, descriptions, music and combat data.

## Play

Live game: https://ultimate-nakama-battle.bauldejuegos.workers.dev

Click an ability once, then a character highlighted in yellow to execute immediately. Double-click or double-tap opens the original description without spending chakra. Self and area abilities use the same targeting flow. There is no action queue or undo. Flexible chakra spending defaults to automatic but can be adjusted in the targeting prompt.

The targeting prompt has a permanently reserved tray below the lower team. Selecting an ability or expanding the chakra controls cannot cover or move the attack buttons. Payment controls scroll inside the tray when needed.

Chakras follow the supplied alternate version: green Fuerza, blue Racionalidad, red Pasión, white Espiritualidad. Black means any chakra. Both teams can choose the same character, but a team cannot contain duplicate characters.

The game includes online room matches, CPU and local multiplayer, animated backgrounds and combat effects, status durations, a character encyclopedia, turn handoff, results and battle history. Original music is the default; synthesized ambient music remains optional alongside synthesized action sounds. Settings include Spanish/English interface, independent music/effects, shake, 30/60/90-second or unlimited turns, and adaptive/compact/widescreen layouts. Automatic passing when nobody can act starts disabled. There is no sudden death.

The owner preferred the earlier moonlit animated scenery, which has been restored for battles and menus. Mountains, drifting clouds, petals, embers and team-color lighting retain the supplied remake's visual style.

Stun suppresses a caster’s outward periodic damage on each affected turn. Skipped ticks are consumed, so finite abilities expire on schedule and indefinite Amor resumes without catching up. Existing protection, buffs, self effects and delayed self costs stay active. This applies to the caster, not a stunned target.

Click a character’s face to inspect prominent status cards with strength, remaining duration, original source artwork, source character/team and stun-suppression explanations. Statuses appear first; original ability descriptions remain available in an expandable section and through double-click inspection.

Voluntad Ólmica has no opening cooldown, as requested by the owner; its six-turn reuse cooldown, health sacrifice, damage boost and protection are preserved. Locura still starts with the original five-turn cooldown, explained separately from its original description. Locura counts down on Irmina's team's turns, including while her normal abilities are equipped; Borracha never resets or copies cooldowns.

Continue is offered only for unfinished local/CPU matches. Victory, defeat, draws and surrender remove their resumable save; completed saves left by previous versions are cleared when the menu opens.

New matches save locally, including the remaining timer, executed actions and permanent effects. Timers and CPU wait during dialogs and hidden tabs. Old queued v1 saves are retained in storage but are not automatically converted into irreversible v2 matches.

Serve `dist/` from any static HTTP(S) host. The title-screen Download button offers `dist/nakama-offline.html`, a standalone HTML with music, images, fonts and code embedded. The larger download reflects the original soundtrack. The hosted game loads music on interaction and has no external runtime dependencies.

## Online with friends

Open **Play online** on both devices and enter the same 4–24 letter/number room code (spaces, hyphens and case are ignored). Each friend chooses three characters and presses Ready. The first visitor's turn-time setting controls the shared clock; select unlimited time in Settings before joining if preferred. The shared clock continues during menus, background tabs and disconnections. Automatic passing remains optional and off by default.

Your team stays below the enemy on both devices. Actions execute immediately after server confirmation; the server owns all random rolls, damage, payments, cooldowns and turn changes. One code admits exactly two players. A Copy invite link control opens the room dialog for your friend. Reopening the room from the same browser automatically reuses your seat and current match. Browser storage retains a per-room random session credential; clearing it loses that seat. Rooms are removed after 24 hours without player activity, including abandoned lobbies. Leaving the room disconnects without surrendering; use Surrender to concede. Both players confirm again for a rematch.

Online runs on the existing Cloudflare Worker, with a SQLite Durable Object per room and hibernating WebSockets. It does not require a player account, external service or a separate subscription. Offline HTML retains CPU/local play; use the hosted game for online matches.

## Development and checks

`npm ci` installs the development-only DOM test dependency. `npm start` serves a static preview on http://localhost:8000; `npx wrangler@4 dev` runs the online Worker locally. No dependency is required to serve the game.

- `npm test`: 110 combat, online-protocol, save, DOM/event and CSS-selector regression tests, including all 42 ability execution paths, all 42 abilities saved through their status lifetimes, 30 complete seeded AI battles, and 30 complete simulated online protocol battles.
- `node scripts/build-offline.mjs`: regenerates the standalone HTML after any source or asset change.

The UI harness parses HTML and exercises real DOM events with clock, audio and canvas shims. CSS rules are matched against actual elements across six viewport sizes, three layouts and five health levels, catching the health-bar/control-class collision. A production two-client WebSocket check verified joining, mirror teams, third-player rejection, three synchronized attacks, out-of-turn/duplicate rejection, exact reconnect, surrender and rematch. All hosted client files and the offline download match the tested build byte-for-byte. Run `python3 scripts/check-online-live.py` to repeat the isolated room check (requires Python websockets).

Browser-control tooling was unavailable; actual CSS layout, physical-device fit, animation smoothness and audible output were not visually/audibly verified.

## Source

- `dist/game-data.js`: immutable recovered source data and original descriptions/art references.
- `dist/catalog.js`: maps those recovered definitions into the immediate combat engine.
- `dist/visual-data.js`: animation/icon metadata from the supplied alternate remake.
- `dist/engine.js`: immediate combat, legal targets, payments, status timing, AI and save format.
- `server/worker.js`: existing Cloudflare Worker routing, persistent room storage, hibernating sockets and expiry alarms.
- `server/room-core.js`: authoritative two-seat lobby, combat protocol, revisions, deadlines and reconnect snapshots using the same combat engine.
- `dist/online.js`: authenticated room connection, heartbeat and automatic reconnect; never retries unacknowledged moves.
- `dist/controls.js`: click/tap gestures and flexible chakra allocation.
- `dist/app.js`: menus, animated scene/effects, sound, target selection, lifecycle and persistence.
- `dist/style.css` and `dist/fonts.css`: responsive presentation and bundled typography.
- `dist/assets/`: original assets and bundled font subsets with license notices.

Original content was recovered from the user-supplied `Alpha 0.1.zip`. The alternate presentation was adapted from the user-supplied `Ultimate Nakama Ninja Battle.html`. See `RECOVERY.md` for balance and timing decisions.

## Deployment

The complete source tree is hosted in the public GitHub repository [Dargeron/nakama-battle](https://github.com/Dargeron/nakama-battle). Hosting remains in the owner's Cloudflare account, Worker `ultimate-nakama-battle`. See [deployment and local development](docs/DEPLOYMENT.md); [AGENTS.md](AGENTS.md) gives coding agents the tested commands and gameplay constraints. The GitHub migration does not itself redeploy production.

`scripts/deploy-cloudflare.py` uploads `dist/` via the Workers static-assets API plus the tested server/engine modules. The first online deployment creates the SQLite `NakamaRoom` namespace; subsequent deploys retain it. `--check` verifies access without making changes. It accepts credentials through hidden stdin only and records nonsecret deployment metadata in `cloudflare-deployment.json`.
