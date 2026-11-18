# 0003. Project file format

- Status: Accepted
- Date: 2026-11-18

## Context

Projects must store blocks, code, the selected board and the circuit. The format
must be readable, friendly to version control, and compatible with arduino-cli and
the Arduino IDE. User code must never be lost when switching between blocks and
code.

## Decision

A project is a folder:

```
Traffic/
├─ Traffic.ino         Standard sketch; arduino-cli requires it to match the folder name
├─ ideblock.json       Metadata: formatVersion, name, board (FQBN), mode ("blocks" | "code")
├─ blocks.json         Blockly workspace serialization
└─ circuit.json        Components, positions and connections
```

The `mode` field defines the source of truth:

- In `blocks` mode, `blocks.json` is authoritative and the `.ino` file is
  regenerated from it.
- In `code` mode, the `.ino` file is authoritative and the blocks are kept only as
  history.

Editing generated code in `blocks` mode prompts the user to switch the project to
`code` mode or discard the edit; nothing is discarded silently. Until code to blocks
conversion exists (Phase 3), switching from `code` back to `blocks` is only offered
while the code still matches what the blocks generate, so no edit can be lost.

`formatVersion` enables forward migrations. A single-file `.ideblock` archive (a zip
of the folder) may be added later for sharing and homework submission.

## Consequences

- Any project opens directly in the Arduino IDE or arduino-cli.
- JSON files diff cleanly in version control.
- Migrations are required whenever the schema changes.
