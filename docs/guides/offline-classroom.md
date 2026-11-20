# Preparing a classroom without internet

[Leer en español](offline-classroom.es.md)

Verifying and uploading a program needs the tools of the board family (a
"core") and, for servo, LCD and NeoPixel blocks, a library. IdeBlock installs
them the first time they are used, which needs internet at that moment. In a
classroom without a connection, prepare them once and copy them to every
computer.

The simulator does not need any of this: it works without internet from the
start.

## 1. Prepare one computer

On a computer with internet and the same operating system as the classroom
computers (Windows with Windows, Linux with Linux):

1. Open **File → Boards and libraries**.
2. Install the boards the class will use. Install only those: the ESP32 tools
   alone take more than 1 GB.
3. Press **Install the libraries**.

## 2. Export the pack

Still in **File → Boards and libraries**, press **Export to a folder…** and
choose a USB stick or a shared folder. IdeBlock creates a folder named
`ideblock-pack-<system>-<processor>` with everything installed.

## 3. Import it on each computer

On each classroom computer, open **File → Boards and libraries**, press
**Import a pack…** and choose the pack folder, or the USB stick that contains
it. Nothing is downloaded.

If a program was verified before importing and failed for lack of internet, the
error message in the console has a button that opens the same dialog.

## An installer with the pack inside

For many computers, or computers students reinstall, the pack can travel inside
the installer: the installed app imports it the first time it starts. Build it
on the same operating system as the pack:

```bash
IDEBLOCK_OFFLINE_PACK=/path/to/ideblock-pack-linux-x64 npm run package:offline
```

The installer is as large as the pack. A newer pack (exported later) is
imported again by a newer installer; the same pack is imported only once.
