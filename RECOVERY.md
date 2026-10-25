# Recovery notes

Source archive: `Alpha 0.1.zip`, game `UNB-NS (alpha-01)`, built 2016-05-26 in Unity 5.3.4f1. Original directory name identifies the project as Ultimate Ninja Battle — Nakama Style; the title scene reads “ultimate nakama ninja battle”.

The archive includes compiled C# and serialized Unity scenes, not the original Unity project. CIL disassembly and serialized fields were recovered using dnfile, dncil and UnityPy. UI Text fields supplied the original ability descriptions. All ten characters and 42 distinct attack objects were recovered, including Irmina's two alternate moves. Images were decoded from Texture2D resources; referenced portrait and ability sprites were mapped through their UI Image components. Both music tracks and the two interface sounds were extracted. Text and attack costs are retained verbatim in game-data.js.

## Turn model, updated by the owner on 2026-10-17

The original queued turn model has been replaced at the owner's request: choosing a highlighted target executes the ability immediately and irreversibly. Each living, unstunned character acts at most once on its own team's turn. Chakra is paid at execution. Ending a turn advances to the opponent, processes periodic effects and grants its resources.

Recovered typed/generic costs, damage/healing, cooldowns, initial cooldowns and half-turn effect durations remain authoritative in game-data.js. catalog.js converts them into the animated remake's engine. Periodic damage starts on execution and repeats every two half-turns; buffs expire on their recovered half-turn boundary. Some buff opportunities necessarily differ from queued execution because an earlier action's effect is now visible to later actions in the same turn.

Per the owner’s later balance update, Voluntad Ólmica has no initial cooldown; its original six-turn reuse cooldown remains. Locura retains its five-turn initial cooldown, shown in full on each team’s first turn. Subsequent cooldowns decrement on the character's own turns. Both teams may choose matching characters. Automatic passing is optional and off by default; sudden death is removed entirely.

## Intentional corrections and adaptations

- Felipe's Argumentemos has a serialized stun magnitude of 20, despite the original description specifying one turn. It uses one turn here.
- Original mutable attack magnitudes could compound unintentionally. Damage is calculated from immutable definitions and live modifiers.
- Healing remains healing even when attack bonuses are active. Damage reduction cannot accidentally become healing.
- Buffs from different sources aggregate rather than one expired effect incorrectly clearing another active effect.
- Both teams reliably reset available actions on their own turn.
- Furia de Álex's selector says single target, but its effect targets all enemies. The interface correctly shows it as an area attack.
- Neck breaking retains the recovered 50 base damage and doubled damage against Oksana's marked target, rather than unconditional execution claimed loosely in flavor text.
- Locura chooses randomly between Irmina and living enemies, avoiding wasted selection of already defeated targets.
- Victory/draw detection is explicit. Maria's armed Anticristo deals 40 direct damage to all living enemies exactly once on her death, as in its recovered script.
- Added a computer opponent, exact optional resource allocation, local save/resume, native dialogs and mouse/touch/keyboard targeting. Queued actions and undo have been removed at the owner’s request.
- The turn timer pauses during dialogs and when the page is hidden. No online multiplayer is implemented; two-player mode shares one device.

## Merge-specific rules

- Conspiracy Theories uses the recovered two hits of 20 damage; no new random knockout chance is added.
- Locura chooses uniformly among Irmina and all living enemies, preserving the recovered risk as enemies fall.
- Manopuntura protects immediately and applies its recovered delayed ten health loss.
- Permanent and periodic statuses survive JSON save/restore, including infinite duration.
- Double deaths are possible: an armed Maria may die to the last attacker and kill that attacker with Anticristo. The engine reports a draw after resolving the complete action and retaliation chain.
- Damage statistics count actual health removed, not overkill. Result MVP considers damage, healing and credited support.
- Version 2 saves record completed immediate actions and timer state. Legacy queued saves are left intact, not silently replayed or converted.

## Bug sweep — 2026-10-17

- Restored the preferred moonlit animated scene and kept the targeting tray in normal document flow, with its space reserved before selection.
- Fixed a class collision: the battle controls' `.mid` layout also applied to `.hp.mid`, expanding injured health bars to 110px on wide screens and obscuring End turn. Controls now use their own class and intrinsic height so wrapped buttons cannot spill into portraits.
- Zero-cooldown abilities remain at zero after use. The previous synthetic value of one let Krishna incorrectly delay them. Existing valid v2 saves repair those false cooldowns when resumed.
- Ability lookup, unlock checks and cooldown checks consistently use the canonical ability ID. Actions require a started turn; an unfinished handoff cannot advance twice.
- Locura's recovered initial cooldown of five is retained and explained in the UI. Tests follow its countdown through normal/drunk forms, save/resume and mirror characters. Borracha never resets or shares another ability's cooldown.
- Consumed stun flags clear when the skipped turn ends, preventing stale stun markers and misleading CPU threat estimates. Existing saves repair inactive-team flags.
- A new turn's timer is initialized before periodic-effect animations are saved. Refreshing during those animations no longer restores the previous turn's expired clock or repeats damage.
- Abandoned projectile callbacks and impact effects are cancelled on quit, surrender and new matches. Generation guards cover every asynchronous presentation boundary.
- Saves are validated fully before replacing a running battle; malformed skills, cooldowns, status sources, teams or history are rejected. Invalid saved settings use playable defaults.
- Local matches take their team labels from the active match, not a stale CPU selection screen. Keyboard use of a roster info button no longer also selects that character.

## Current verification

The 80-test regression suite covers all 42 abilities, original content/costs/cooldowns, immediate execution, precise payment, stun and immunity, transformations, buffs and durations, delayed and periodic damage, death retaliation and draws, mirror teams, absence of sudden death, every ability saved through its status lifetime, and 30 complete seeded CPU battles. DOM/event tests exercise single/double click and touch, keyboard and whole-card targeting, settings, handoff, save/resume, timer pausing, CPU visibility/dialog guards, stale-animation cancellation and surrender/rematch. Real stylesheet selectors are checked across six viewport sizes, three layout modes and five health levels.

Real browser QA was unavailable. The DOM harness does not validate CSS layout, mobile rendering or audible output.

## Stun and status visibility update — 2026-10-19

- A stunned caster’s outward recurring damage is suppressed at each scheduled tick. Its remaining ticks and duration still count down; missed ticks are lost. Amor resumes normally after stun. Target stun does not suppress incoming effects.
- The stun decision is captured at the half-turn boundary before periodic damage, preventing a simultaneous death from clearing stun early and making damage depend on roster order. Existing posthumous damage behavior remains intact.
- Shields, reduction, self effects, resource/status buffs and Manopuntura’s one-time delayed health cost keep their existing behavior.
- Character inspection now leads with high-contrast effect cards, numerical strengths, duration badges and original source artwork/character/team. Suppression is explained in words as well as styling. Original skills are expandable below the effects. Both languages and mirror teams are supported.
- Twelve new regressions cover all four recurring abilities, the requested three-tick/two-turn-stun example, immunity, self effects, protection, save/resume, simultaneous ticks, and effect-card DOM interactions. Browser layout and audio verification remain unavailable.
