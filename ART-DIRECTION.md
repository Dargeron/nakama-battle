# Current visual direction — 2026-10-17

The owner preferred the earlier moonlit scenery, so both battle and menu use the supplied alternate remake's animated mountains, clouds, moon, petals and embers again. The experimental stadium has been removed from the active build; its source remains in Git history.

The gold/lacquer interface, paper scroll dialogs and combat effects remain. Enemies are always above, allies below. Wide screens can spread allies into three columns while retaining that arrangement; compact mode keeps the stacked ally rows. A permanently reserved, clipped tray below the allies contains targeting prompts and chakra controls, so neither can cover ability buttons or shift them between clicks. The central controls grow to their actual content height, and their layout styles no longer match half-health bars. Original portrait and ability images replace the alternate generic ability glyphs. Original ability descriptions are displayed verbatim, with separate notes explaining opening cooldowns.

Original menu and battle music are the default. The alternate synthesized sound effects and optional procedural soundtrack remain available. The chakra palette is blue/green/red/white, with black flexible costs and pulsing yellow target cards. Fonts are bundled locally, subset to the interface character range.

The earlier illustrated village and dojo remain archived assets but are not displayed in the selected animated design. The following notes document that earlier iteration.

---

# Ninja visual redesign

The combat engine, original portraits, ability artwork, descriptions, and music are retained. The redesign uses moonlit indigo scenery, vermilion actions, gold accents, and distinct blue/red team treatments.

## Interface

- Portraits toggle team selection; rebuilding a solo team also rebuilds its CPU opponent.
- Abilities show names and exact resource counts. Narrow screens use two-column ability rows for readable labels.
- Resources stay at the top while scrolling, and the end-turn bar remains at the bottom.
- The battle log opens on demand. Existing local saves remain compatible.
- A single ability click highlights valid characters with a pulsing yellow tint. Clicking their portrait or card prepares the action; double click/tap opens read-only details.
- Red, blue, green and yellow distinguish the four chakras. The yellow chakra is a code-native SVG UI symbol.
- Free-choice chakra costs default to automatic payment and remain adjustable from the targeting prompt.
- Original resource and attack details remain available in the ability dialog.

## Background artwork

Generated with OpenAI image generation on 2026-10-16; opaque 1672 × 941 images, converted to WebP at quality 86. The full original outputs are retained by the image tool.

### village

File: `dist/assets/village-v2.webp`

Prompt:

Use case: stylized-concept. Asset type: full-bleed landscape background for a polished browser ninja team battle game called Ultimate Nakama Ninja Battle. Create one beautiful high-resolution widescreen 16:9 background illustration, no text or UI. A cinematic shonen-anime ninja village tucked in steep misty Japanese mountains at blue hour, layered tiled roofs, a striking vermilion torii gate and orange lanterns on the right, ancient cedar and drifting maple leaves framing top corners, distant giant warm amber moon behind clouds. Painted animation background with confident ink outlines, elegant flat shape masses and luminous painterly atmosphere, rich midnight indigo / muted turquoise / vermilion / warm ochre palette. Composition designed for game menu overlay: central and left lower two thirds relatively quiet dark mountain mist with understated detail, strongest architectural focal detail in upper-right third. Edge-to-edge coherent scene, outstanding art direction, crisp foreground brushwork, atmospheric depth. Feels adventurous, playful and handmade, not photorealistic, not 3D, not generic fantasy castle. No humans, no warriors, no characters, no logos, no writing, no lettering, no borders, no interface. Landscape 16:9, 2048x1152 if possible.

### arena

File: `dist/assets/arena-v2.webp`

Prompt:

Use case: stylized-concept. Asset type: full-bleed landscape battle arena background for a polished anime ninja team tactics game. One gorgeous wide 16:9 hand-painted anime background, no text or UI. A grand circular shinobi training courtyard seen straight ahead at slightly elevated eye level, sand and worn stone concentric floor markings, enclosing Japanese timber-and-stone dojo buildings, red and indigo cloth pennants, warm paper lanterns, dark cedar forest and jagged misty mountains beyond, an enormous amber moon setting in midnight-blue twilight. Mature sophisticated shonen background art: crisp brush and ink outlines, broad cinematic shapes, blue teal shadows and controlled glowing vermilion gold highlights. Compose to frame UI: strong scene interest at upper center and far perimeter; left and right lower thirds dark and quiet to support card overlays; luminous empty arena center visible between the teams. A little windblown red maple foliage; convincing inviting tournament atmosphere. Deep layered perspective, visually stunning environmental concept art, polished animation background. No human figures, no characters, no readable symbols, no text, no logo, no UI, no border, no collage. Landscape 16:9, 2048x1152 if possible.

## Typography

Bangers Regular is bundled locally from the Google Fonts repository. Its SIL Open Font License is included in `dist/assets/Bangers-OFL.txt`. Body copy uses the system sans-serif stack; the game makes no external font requests.

## Verification

All 32 automated tests pass, including original combat behavior, AI matches, saved games, resource payment, undo, team selection, and asset references. Browser-control tooling was unavailable, so actual browser rendering was not visually inspected in this environment.

