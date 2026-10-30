APEX / The Circuit Collection

Click the track name in the header to open the circuit picker. Preview
cards show the route, biome, challenge, hazards, and best time for your car.
Changing circuits resets the run, tire marks, and vehicle position.

Juniper Raceway: the original technical esses and infield hairpin, with
three oil slicks just before demanding corners. Oil leaves the tires
slippery for about 1.15 seconds; grip recovers progressively after leaving.

Desert Canyon: a distinct, tighter route with two narrow rock-wall passes,
dusty asphalt, heavy sand runoff, and four visible sand drifts on the road.
The drifts slow the car and leave space for an avoidance line.

Alpine Pass: three reversing mountain switchbacks linked by deep winding
traverses and an outside descent. Exactly three visible ice patches cover
a small portion of the road and reduce both steering and braking traction.
Snowy pine crowns and mountain contours are seen directly from above.

Ridgeway Rallycross mixes asphalt and two flowing dirt sections. Dirt
reduces traction and adds rolling resistance; Offroad handles it better.

Amazonas: tight, linked jungle bends with no long straights. A diagonal
river crosses the road twice through shallow fords, with no bridges. Water
adds drag and reduces grip; slow down and splash through. Ripples and
floating leaves flow southeast, and the current gently nudges the car. Dense palms line
the banks. A trackside monkey throws coconuts at passing cars;
dodge the toss or briefly lose grip. Look for the COCONUTS warning board.

Four sector times and comparisons against your best lap appear in the HUD.
Oil, sand, and ice have irregular outlines matching their physics areas.
The camera follows smoothly with no screen shake. Tire marks are batched
and track lookups use a spatial grid to keep sliding on gravel responsive.

PIT LANES
Every circuit has an alternate paved route through its paddock. Follow PIT
ENTRY before the finish, drive past the garages, and rejoin at PIT EXIT.
Both openings are drivable; the pit lane has its own finish timing line.

LAP GHOST
Your first clean lap records a ghost for that map and car, even if an older
personal best has no recorded path. Faster recorded laps replace the ghost;
your historic personal best stays separate. The cyan outline and GHOST label
remain visible when the cars overlap. A cyan minimap dot tracks the ghost
when it is outside the camera view. Its status and target time appear in
the timing panel. On a fresh run, the ghost and its live delta stay hidden
until you cross the start line. Ghosts save locally and replay on subsequent laps,
including through the pit lane. LIVE TO GHOST shows time gained (green) or
lost (red) at your current position along the recorded route.

GARAGE
Clubsport R: balanced rear-wheel drive, approximately 158 km/h.
Sprint GT: more power, approximately 177 km/h, demands earlier braking.
Offroad: Kenney car 4, all-wheel drive, more grip and less off-road drag,
approximately 150 km/h.
Paint: Ember, Ocean, Forest, Sunburst, or Graphite.
Changing car starts a fresh run and loads that car's record. Changing only
paint preserves the lap. Canceling either picker preserves your run.

The selected track, car, paint, and each track/car best time are saved
locally. Revised routes and hazards have separate records; earlier
versions' records remain under their old browser storage keys.

Open this folder in a terminal and run:
  python -m http.server 8000
Then open http://localhost:8000

Before driving, click a grid box to choose your starting position. Grid
boxes follow the local curve and face the direction of travel.

A 3–2–1–GO countdown holds the car before each fresh run. Choosing another
grid box restarts the countdown. Click Restart or press N to begin a fresh
run from your chosen grid spot while preserving saved times and ghosts.

W / Up: accelerate
S / Down: brake; hold at rest to reverse
A / D or Left / Right: steer
Space: handbrake (hold while steering to initiate a slide)
N: quick restart with countdown
R: recover to the nearest track point (invalidates the current lap)
Escape / P: pause

Cross all three sector gates in order, then cross the start/finish line
in the forward direction to record a lap. Timing lines span the full width
between the barriers, including curbs and runoff.
The personal best is stored in this browser. Recovering invalidates the
current lap; crossing the finish line begins a fresh valid lap.
The game pauses when the window loses focus or is hidden.

Physics runs at 120 Hz. Canvas rendering uses p5.js. All game code is in
main.js and all page layout/style is in index.html. No build step is needed.
Internet is used for the p5.js CDN and fonts; the downloaded p5.js fallback
and local sprites allow play if those remote resources are unavailable.

See ASSETS.txt for asset sources and licenses.
