# Simulación de ESP32 con QEMU: notas de investigación

[English](README.md)

Se guardan para la Fase 4, donde está prevista la simulación de ESP32. Los hallazgos y la
decisión están resumidos en "Riesgos" de [docs/ideas.es.md](../../ideas.es.md).

## Parche

`lcgamboa-picsimlab-esp32.patch` se aplica sobre
[lcgamboa/qemu](https://github.com/lcgamboa/qemu), rama `picsimlab-esp32`, commit
`885a6e7`. Es código de QEMU y sigue su licencia (GPL-2.0). El parche:

- trae de `m25p80.c` de Espressif el manejo de ciclos dummy de SPI y el modo quad de
  GigaDevice, que las imágenes de arduino-esp32 3.3 necesitan para arrancar;
- hace legibles `DUTY` y `DUTY_R` de LEDC, para poder consultar el PWM;
- expone los valores del ADC como una línea de entrada qdev (`esp32_adc_in`);
- atiende el chardev de qtest desde el contexto GLib propio del fork.

## Correr un sketch

```
qemu-system-xtensa -M esp32-picsimlab -accel tcg -display none -monitor none \
  -drive file=Sketch.ino.merged.bin,if=mtd,format=raw \
  -global driver=timer.esp32.timg,property=wdt_disable,value=true \
  -serial tcp:127.0.0.1:5555,server,nowait -qtest tcp:127.0.0.1:5556
```

arduino-esp32 escribe `<sketch>.ino.merged.bin` (4 MB) en la carpeta de salida del build.

Comandos de qtest útiles:

| Comando                                            | Efecto                                     |
| -------------------------------------------------- | ------------------------------------------ |
| `irq_intercept_out /machine/soc/gpio esp32_gpios`  | Emite eventos `IRQ raise/lower <pin>`      |
| `set_irq_in /machine/soc/gpio esp32_gpios_in 4 1`  | Pone GPIO4 en alto                         |
| `set_irq_in /machine/soc/sens esp32_adc_in 6 2048` | `analogRead(34)` devuelve 2048             |
| `readl 0x3ff44544`                                 | `FUNC5_OUT_SEL`: señal ruteada a GPIO5     |
| `readl 0x3ff59010`                                 | Duty del canal 0 de alta velocidad de LEDC |
