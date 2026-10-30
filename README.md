# APEX / The Circuit Collection

Click the track name in the header to open the circuit picker. Preview
cards show the route, biome, challenge, hazards, and best time for your car.
Changing circuits resets the run, tire marks, and vehicle position.

## Circuits

### Juniper Raceway

The original technical esses and infield hairpin, with
three oil slicks just before demanding corners. Oil leaves the tires
slippery for about 1.15 seconds; grip recovers progressively after leaving.

### Desert Canyon

A distinct, tighter route with two narrow rock-wall passes,
dusty asphalt, heavy sand runoff, and four visible sand drifts on the road.
The drifts slow the car and leave space for an avoidance line.

### Alpine Pass

Three reversing mountain switchbacks linked by deep winding
traverses and an outside descent. Exactly three visible ice patches cover
a small portion of the road and reduce both steering and braking traction.
Snowy pine crowns and mountain contours are seen directly from above.

### Ridgeway Rallycross

Ridgeway Rallycross mixes asphalt and two flowing dirt sections. Dirt
reduces traction and adds rolling resistance; Offroad handles it better.

### Amazonas

Tight, linked jungle bends with no long straights. A diagonal
river crosses the road twice through shallow fords, with no bridges. Water
adds drag and reduces grip; slow down and splash through. Ripples and
floating leaves flow southeast, and the current gently nudges the car. Dense palms line
the banks. A trackside monkey throws coconuts at passing cars;
dodge the toss or briefly lose grip. Look for the COCONUTS warning board.

### Costa Azul

Short coastal bends, a fishing-village hairpin, beachside
esses and two avoidable sand drifts. A lighthouse overlooks the northern
headland; turquoise surf, fishing boats, terracotta roofs and palms frame
the circuit. The marina pit lane connects before and after the finish.

### City Streets

Six tight right-angle downtown corners lead into a broad,
winding suburb section. Office rooftops, crosswalks and traffic signals
give way to gardens, houses and Central Park. A service pit lane connects
before and after the start. This is an existing street network, with
sidewalk curbs, crosswalks and light two-way traffic. At most two other
cars are active; they cruise in their lanes and brake after a collision.

## Scenery

A shared pack of 48 original top-down SVG assets adds varied tree crowns,
palms, snowy pines, houses, cabins, offices, and warehouses. Paddocks have
five themed service bays, a control room, team canopies, tyre racks, fuel
stores, tool trolleys, water tanks, and supply crates, all inside the reserved
paddock footprint. New homes, greenhouses, cafés, garden beds, transporters,
grandstands, mossy rocks, and willows add variety outside the driving corridors.

Scenery shares one placement plan: buildings reserve their full plots first,
then small props and trees fill the remaining space without overlapping.
Ground details render below props, rooftops, and tree canopies. City park
paths and the fountain stay clear, as does the monkey’s perch in Amazonas.

The pack loads once into a reusable raster cache. Static scenery remains
baked into the world canvas, so the new detail does not add per-frame SVG
rendering. Regenerate the assets with `python3 tools/build-scenery-assets.py`.

![Themed paddocks across all seven circuits, with numbered garages, control rooms, and team canopies](preview-paddocks.png)

Explore the full [scenery asset pack](preview-scenery-assets.png) and
[scenery placement across all maps](preview-scenery-placement.png).

Every landscape has denser scenery outside the barriers: woodland logs
and ferns, desert rock and cactus clusters, mountain pines and snowdrifts,
jungle flowers and fallen timber, rally team canopies and service vehicles,
and coastal villas, parasols and rock gardens.

Four sector times and comparisons against your best lap appear in the HUD.
Oil, sand, and ice have irregular outlines matching their physics areas.
The camera follows smoothly with no screen shake. Tire marks are batched
and track lookups use a spatial grid to keep sliding on gravel responsive.

## Pit lanes

Every circuit has an alternate paved route through its paddock. Follow PIT
ENTRY before the finish, drive past the garages, and rejoin at PIT EXIT.
Both openings are drivable; the pit lane has its own finish timing line.

## Lap ghost

Your first clean lap records a ghost for that map and car, even if an older
personal best has no recorded path. Faster recorded laps replace the ghost;
your historic personal best stays separate. The cyan outline and GHOST label
remain visible when the cars overlap. A cyan minimap dot tracks the ghost
when it is outside the camera view. Its status and target time appear in
the timing panel. On a fresh run, the ghost and its live delta stay hidden
until you cross the start line. Ghosts save locally and replay on subsequent laps,
including through the pit lane. LIVE TO GHOST shows time gained (green) or
lost (red) at your current position along the recorded route.

## Garage

- **Clubsport R:** balanced rear-wheel drive, approximately 158 km/h.
- **Sprint GT:** more power, approximately 177 km/h, demands earlier braking.
- **Offroad:** all-wheel-drive trail car, more grip and less off-road drag,
approximately 150 km/h.
- **Drift Spec:** rear-wheel-drive coupe with an angle kit, power oversteer and
a rear wing, approximately 188 km/h. Lift and countersteer to catch a slide.
- **Formula X:** original open-wheel car with very high asphalt grip, speed-built
downforce, strong brakes and an eight-speed display, approximately 337 km/h.
- **Iron V8:** heavy rear-wheel-drive muscle coupe, strong torque, slower steering
and broad power slides, approximately 217 km/h.

All six cars have dedicated local artwork in every paint and separate lap ghosts
and personal-best records.
Paint: Ember, Ocean, Forest, Sunburst, or Graphite.
Changing car starts a fresh run and loads that car's record. Changing only
paint preserves the lap. Canceling either picker preserves your run.

The selected track, car, paint, and each track/car best time are saved
locally. Revised routes and hazards have separate records; earlier
versions' records remain under their old browser storage keys.

## Run locally

Open this folder in a terminal and run:

```sh
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Driving and controls

Before driving, click a grid box to choose your starting position. Grid
boxes follow the local curve and face the direction of travel.

A 3–2–1–GO countdown holds the car before each fresh run. Choosing another
grid box restarts the countdown. Click Restart or press N to begin a fresh
run from your chosen grid spot while preserving saved times and ghosts.

- **W / Up:** accelerate
- **S / Down:** brake; hold at rest to reverse
- **A / D or Left / Right:** steer
- **Space:** handbrake (hold while steering to initiate a slide)
- **N:** quick restart with countdown
- **R:** recover to the nearest track point (invalidates the current lap)
- **Escape / P:** pause

Cross all three sector gates in order, then cross the start/finish line
in the forward direction to record a lap. Timing lines span the full width
between the barriers, including curbs and runoff.
The personal best is stored in this browser. Recovering invalidates the
current lap; crossing the finish line begins a fresh valid lap.
The game pauses when the window loses focus or is hidden.

## Technical details

Physics runs at 120 Hz. Canvas rendering uses p5.js. All game code is in
`main.js` and all page layout/style is in `index.html`. No build step is needed.
p5.js and sprites are bundled locally. Google Fonts uses the internet;
the game remains playable when the fonts are unavailable.

See [ASSETS.txt](ASSETS.txt) for asset sources and licenses.

## Performance check

Open [the performance tool](http://localhost:8000/tools/performance.html) while the local server is
running to compare map generation, road lookups, minimap updates, physics
with 4,200 tire marks, and rendering at a fixed 1280 × 900 viewport.
Results are milliseconds per operation, not an FPS estimate.

## Automated checks and deployment

Use Node.js 24 or later. Install the development tools and Chromium once:

```sh
npm ci
npx playwright install chromium
```

On Linux, use `npx playwright install --with-deps chromium` if browser system
libraries are missing.

Run the same checks as CI:

```sh
npm run lint
npm test
npm run build
npm run test:browser
```

ESLint checks project JavaScript and excludes bundled assets. `npm test` runs
the simulation assertions in `verify.cjs`. The browser test serves the packaged
site at `/td-racing/`, checks every circuit, changes cars, checks saved selections
and pause controls, and reports missing local assets or JavaScript errors.
External requests are blocked to verify the game works with bundled p5.js.
Browser failure reports are saved in `playwright-report/` and `test-results/`.

The [GitHub Actions workflow](.github/workflows/ci.yml) runs these checks on pull
requests and pushes to `master`. After successful checks on `master`, it deploys
the tested `dist/` folder to GitHub Pages. Pull requests never deploy. The folder
contains the game, runtime assets, and asset credits; it is generated locally
and is not committed.

To enable hosting, open the repository's **Settings → Pages** and select
**GitHub Actions** as the source. Then push to `master` or run **CI and deploy**
manually from the Actions tab. The site will be available at
[orbitertoad.github.io/td-racing](https://orbitertoad.github.io/td-racing/).
Deployment uses GitHub's built-in token; no hosting credentials are required.
See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Optionally, add a branch rule for `master` requiring **Lint and test** before
merging pull requests.
