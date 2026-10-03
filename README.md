# Cache Goblin: The Crypt

A self-contained retro crypt brawler. Double-click **Play.cmd** on Windows or open **index.html** in a modern browser. No installation, server, or internet connection required.

## Play on a phone or tablet

Double-click **Play-Mobile.cmd** on your computer (requires Node.js). Keep its window open, connect your phone to the same Wi-Fi, and open the displayed address in Safari or Chrome. If Windows asks, allow Node.js on your private home network. The helper serves only the five game assets; it does not publish the game online. Press Ctrl+C to stop it. Desktop **Play.cmd** still works without a server.

Controls are detected automatically from the device’s touch and pointer capabilities. Touch devices get the thumbstick and on-screen buttons; computers get keyboard instructions. Narrowing a computer window does not turn on touch controls. On hybrid laptops, touching the screen switches to touch mode, while using a gameplay key or clicking with the mouse switches back. Held inputs are released when switching modes.

Use the thumbstick to move, hold **ATTACK**, and tap **DASH**. Separate fingers can move, attack, and dash together. Touch buttons also pause/resume and toggle sound. Both portrait and landscape layouts are supported; landscape places the controls beside the arena. Rotating the device or leaving the page releases held controls. Browser audio starts after pressing Play. Scores remain local to each browser and address, so desktop and phone scores are separate.

## Controls

- **WASD / arrows:** move
- **Space:** attack; hold for repeated attacks
- **Shift:** dash through danger; 1.15-second recharge
- **P / Escape:** pause
- **Enter:** start, resume, or continue after victory
- **Exit Crypt & Save Score:** bank a completed run locally

## The crypt

The playable hero has white hair, cyan goggles, gold armor, and a blue scarf inspired by the supplied character reference. His hands have no visible weapon; equipped weapons modify his circular energy attacks.

Goblins spawn continuously, without waves or breaks to clear the arena. Level 1 starts with four goblins. Spawn frequency and the maximum active population increase with your level and weapon threat, and coin progress raises the pressure further. The active population is capped at 24. New enemies appear at the perimeter, away from the player, with a short arrival grace period.

Each goblin has a **45% chance to drop one coin**, instead of a guaranteed drop. After three consecutive misses, the next kill guarantees a coin. You must actually collect **50 coins** to summon Gribble. At that moment, goblin spawning stops and remaining goblins leave the arena for the boss fight. Only 50 coins can be issued per level, so none are wasted. There is no mid-level healing; continuing after Gribble restores health.

Exactly **two random weapon drops per run** appear, at the start and at 25 collected coins of the first level. Walk over them to equip. They do not expire; uncollected drops remain available even in continued loops. Later loops do not replenish the two-drop allowance. The first drop is a dagger or axe, and the second advances beyond the first drop's tier. Restarting begins a fresh allowance.

| Tier | Weapon | Damage | Attack interval | Reach |
| --- | --- | --- | --- | --- |
| 0 | Rusty Sword | 1 | 0.31 seconds | 64 |
| 1 | Quick Dagger | 1 | 0.17 seconds | 68 |
| 2 | War Axe | 3 | 0.39 seconds | 78 |
| 3 | Rune Spear | 3 | 0.28 seconds | 110 |
| 4 | Crown Breaker | 4 | 0.48 seconds | 88 |

The hammer has reduced damage, reach, attack speed, and knockback. Weapons damage Gribble for twice their normal damage. All attacks destroy nearby projectiles.

Equipping stronger gear raises threat, increasing enemy health and speed. Existing enemies retain their remaining health percentage when scaling. Continued loops add 30% of base health per loop and increase goblin speed and boss attack frequency. The HUD shows loop, threat, weapon, coins, health, and score.

## No-hit scoring

Each goblin kill earns 100 base points, plus a clean-streak bonus: +10 for the first kill, +20 for the next, increasing to a cap of +100 extra per kill. Taking actual damage resets the streak. Dodged attacks and hits blocked by temporary invulnerability do not reset it. The HUD displays the streak and the next kill bonus. Waiting or pausing never awards points.

Defeating Gribble without taking damage during the boss fight earns **1,000 × level** extra points. Finishing the entire level without damage earns another **1,000 × level**. These stack with the usual victory and remaining-health rewards. Damage is tracked separately from current health, so restoring health cannot fake a flawless clear. The victory screen displays your accumulated no-hit bonuses, which are included in the saved score.

## Gribble

Gribble starts with 64 health before threat and loop scaling. He randomly selects melee cleaves, jumping slams, or coin volleys, with a greater chance of melee at close range. Attacks can repeat. Sometimes he chains two or three attacks with very short gaps, followed by a longer randomized recovery. Below half health, quick chains become more likely.

There are **no warning labels, target circles, advance attack zones, or recovery prompts**. Cleave and slam effects only appear when the hit occurs. Jump destinations lock when the jump starts, and Gribble cannot be hit in the air. Keep moving and use dash immunity.

## Continue or escape

After defeating Gribble, choose **Continue** to retain your gear and accumulated score in a harder loop, restore your health, and collect another 50 coins. Or choose **Exit Crypt & Save Score** to finish the run and save its score on this device. Defeats also save the final score.

The latest saved run and best score are shown in game. The last ten runs are retained in browser local storage and survive a refresh when storage is available. Scores are specific to the browser and local-file origin; moving the folder or clearing browser data may make them unavailable. The game explicitly reports storage failures. The home screen's **Leaderboard — Coming Soon** is a placeholder, not an online leaderboard.

## Development

- `index.html`, `style.css`: arcade presentation and menu
- `game.js`: game logic, procedural pixel sprites, audio, and local score storage
- `assets/goblin.png`: original user-supplied antagonist artwork, unchanged
- `Play.cmd`: Windows launcher
- `Play-Mobile.cmd`, `serve.cjs`: optional Wi-Fi launcher and restricted static server
- `test.cjs`: dependency-free gameplay simulation checks (`node test.cjs`)

Tests cover combat, progression, the 50-coin gate, limited drops across loops, random attacks and combos, continuation, exit/save, persistence, legacy score migration, multi-touch controls, reset, and storage failure. Canvas calls are smoke-tested with a mock context; these checks do not verify browser layout or audio playback.

This is a local Git repository with no remote configured. User-supplied artwork remains subject to its owner's rights; no artwork license is implied.

The original project folder name and legacy save-key strings are retained for compatibility. Existing scores migrate to the new Cache Goblin keys automatically.
