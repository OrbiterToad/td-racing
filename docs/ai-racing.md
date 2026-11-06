# AI racing

Club races support every car and circuit. Select **Club race** in session setup,
then choose **AI difficulty** and **Opponent cars**. The default is **Normal**
and **Same as player**, preserving the original driver pace factors (Alex 0.98,
Blair 0.91, Casey 0.84). **Mixed grid** cycles through the supported car roster
starting with the player's car. Rivals use their own car artwork, dimensions,
steering, grip, power and brakes, including during vehicle contact.

| Difficulty | Target pace multiplier | Brake threshold above target | Maximum lane change per second |
| ---------- | ---------------------- | ---------------------------- | ------------------------------ |
| Easy       | 0.80                   | 2                            | 12                             |
| Normal     | 1.00                   | 5                            | 18                             |
| Hard       | 1.12                   | 8                            | 24                             |

Targets retain the original curvature and slippery-patch preview with backward
braking propagation. Lower-grip cars get lower targets; slow-yaw cars and the
city circuit receive extra conservative speed margins. These are controller
choices; all cars still use the shared vehicle physics and collision solver.

On gentle bends or straights, a faster approaching driver can choose a clear
passing lane. A driver approached from behind can choose a clear inside line
while the approaching car is still more than 65 track units away. Tight bends,
narrow roads, blocked lanes and cars already alongside cause a fallback to the
driver's default line. Changes are rate limited, leave room for vehicle widths,
and use local traffic information rather than random decisions or rubber banding.

Settings apply on starting a session and survive race restarts. No saved settings
migration is needed. Difficulty and grid choices are session settings.

`tests/ai-racecraft.test.mjs` covers deterministic decisions and safe fallbacks.
`tests/ai.test.mjs` enumerates the current car and track catalogs, so roster
additions automatically enter three-lap completion and route/progress coverage.
The collision regression suite continues to exercise the shared solver.
