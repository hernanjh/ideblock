# ESP32 simulation with QEMU: research notes

[Español](README.es.md)

Kept for Phase 4, when ESP32 simulation is planned. The findings and the decision are
summarised under "Risks" in [docs/ideas.md](../../ideas.md).

## Patch

`lcgamboa-picsimlab-esp32.patch` applies to
[lcgamboa/qemu](https://github.com/lcgamboa/qemu), branch `picsimlab-esp32`, commit
`885a6e7`. It is QEMU code and follows QEMU's license (GPL-2.0). It:

- backports SPI dummy-cycle handling and GigaDevice quad-enable support from
  Espressif's `m25p80.c`, which arduino-esp32 3.3 images need to boot;
- makes LEDC `DUTY` and `DUTY_R` readable, so PWM duty can be polled;
- exposes the ADC values as a qdev input line (`esp32_adc_in`);
- polls the qtest chardev from the fork's private GLib main context.

## Running a sketch

```
qemu-system-xtensa -M esp32-picsimlab -accel tcg -display none -monitor none \
  -drive file=Sketch.ino.merged.bin,if=mtd,format=raw \
  -global driver=timer.esp32.timg,property=wdt_disable,value=true \
  -serial tcp:127.0.0.1:5555,server,nowait -qtest tcp:127.0.0.1:5556
```

arduino-esp32 writes `<sketch>.ino.merged.bin` (4 MB) to the build output folder.

Useful qtest commands:

| Command                                            | Effect                                  |
| -------------------------------------------------- | --------------------------------------- |
| `irq_intercept_out /machine/soc/gpio esp32_gpios`  | Streams `IRQ raise/lower <pin>` events  |
| `set_irq_in /machine/soc/gpio esp32_gpios_in 4 1`  | Drives GPIO4 high                       |
| `set_irq_in /machine/soc/sens esp32_adc_in 6 2048` | `analogRead(34)` returns 2048           |
| `readl 0x3ff44544`                                 | `FUNC5_OUT_SEL`: signal routed to GPIO5 |
| `readl 0x3ff59010`                                 | LEDC high-speed channel 0 duty          |
