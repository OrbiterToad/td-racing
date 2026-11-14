# Local career progression

Career progress is stored on this browser/device in `apex-career`, separately
from settings, personal-best times/sectors, ghosts and leaderboard data. The
version 1 document contains `unlocked.cars`, `unlocked.tracks`, best `medals`
by `track:car`, validated skill-trial aggregates (`attempts`, `completions`,
`best`), and completed club `events` by `track:car`. Events are completion
flags, not a race history. Medals only improve; repeated event completion is
idempotent. Invalid laps, practice with rewind, and incomplete club races do
not grant career awards.

All currently shipped cars and circuits were already available. Initial saves
and reset retain that entitlement; no new unlock requirements are introduced.
`unlockContent` accepts only catalog IDs and persists a new entitlement once.

At startup, a missing career document imports recognized entries from
`apex-medals-v1` and `apex-skill-trials-v1`. The legacy sources and existing
records are left intact. An explicit version 0 document uses the same fields
and migrates through validation to version 1. No other old/future versions are
assumed compatible. Recognized documents filter unknown IDs, invalid medals,
invalid counts/scores and malformed fields without awarding extra progress.
Malformed JSON or an unsupported document is preserved and blocks updates;
the Settings career section explains the reset recovery path. Legacy keys
are never reimported while a canonical save exists, including after reset.

Settings → Career → Reset progression requires a confirmation describing the affected
data. Cancel makes no change. Confirm writes an initial career document;
settings, leaderboard entries, personal bests and ghosts are retained.
Storage access/quota failures never crash the game; a failed reset reports
failure. Durable save/restore requires browser storage to be available.
