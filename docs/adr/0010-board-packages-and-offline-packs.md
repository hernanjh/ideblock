# 0010. Board packages and offline packs

- Status: Accepted
- Date: 2026-11-20

## Context

Compiling for a board needs its board package ("core") and, for some blocks,
a library. Since Phase 1 they install themselves the first time they are
needed, which requires internet at that moment. Many classrooms have poor or
no connectivity, and a class cannot wait for 1 GB of ESP32 tools to download
on 25 computers. The roadmap asked for an on-demand board manager and an
offline school installer.

Options considered for the offline part:

- **An installer with every core inside.** Simple for schools, but several
  gigabytes, rebuilt for each release and each platform, and mostly cores a
  school does not use.
- **arduino-cli's download cache** (`staging`): copying the archives lets
  `core install` work offline, but it still needs the package indexes and runs
  every install step again on each computer.
- **A folder with the installed data**: the cores, tools and package indexes
  from arduino-cli's data folder plus the installed libraries, copied as they
  are. Installing is a copy, with no network and no extra tools.

## Decision

- **File → Boards and libraries** lists the board packages the app supports,
  with the boards each one brings, the installed version and the newest one,
  and installs, updates or removes them. Another button installs every library
  the blocks may use. The list works offline from the indexes on disk.
- An **offline pack** is a folder named `ideblock-pack-<platform>-<arch>`
  holding `data/` (cores, tools, indexes), `user/libraries/` and
  `ideblock-pack.json`, which lists the platform, the processor, the cores and
  the libraries. The manifest is written last, so an interrupted copy is not
  taken for a pack.
- `inventory.yaml`, which holds an installation id, and `tmp/` are never copied.
- Importing checks that the pack was made on the same operating system and
  processor, since the tools inside are native programs, then copies it into
  the app's arduino-cli folder. Choosing the folder that contains the pack also
  works.
- Every operation runs in the same queue as compiling and uploading, because
  arduino-cli locks its data folder, and clears the build cache afterwards.
- When a build fails because a core or library could not be installed, the
  message offers to open the dialog.

## Consequences

- A teacher prepares one computer with internet, exports the pack to a USB
  stick and imports it on the others; nothing else is needed in the classroom.
- A pack only works on the same operating system and processor; a school with
  Windows and Linux computers makes two.
- The pack is as large as what is installed (the ESP32 core alone is over
  1 GB), so teachers should install only the boards they use.
- A school installer carries a pack in its resources (`npm run
package:offline`); the installed app imports it the first time it starts and
  remembers which pack it imported, so the same pack is not copied twice.
