# GRAVITAS — Scale → MIDI/OSC Controller

Turn physical weight from a USB scale into MIDI control
messages sent to Ableton Live via OSC.

Supported scales:
- **DYMO S100** USB Postal Scale — connects via WebHID
- **U.S. Solid Precision Balance** Digital Lab Scale — connects via Web Serial (virtual COM port)
- **Generic USB HID scales** — any scale using the standard USB HID scale protocol
- **Generic Serial scales** — any scale that outputs ASCII weight readings over a serial port

## Signal Chain

```
USB Scale (HID or Serial) → Chrome/Edge (WebHID / Web Serial API)
    → Weight value → MIDI map (0–127 / float 0–1)
        → Web MIDI API → IAC Driver / loopMIDI → Ableton Live / DAW
```

---

## Requirements

- **OS**: macOS / Windows / Linux
- **Browser**: Chrome or Edge (WebHID required — Firefox not supported)
- **Node.js**: v18+
- **Ableton Live**: Any version with AbletonOSC or a Max4Live OSC patch

---

## Setup

### 1. Install AbletonOSC in Ableton

Option A — **AbletonOSC** (recommended, free):
  https://github.com/ideoforms/AbletonOSC
  - Download and copy to your Ableton MIDI Remote Scripts folder
  - Enable in Preferences → MIDI → Control Surface

Option B — **Max4Live OSC Receiver**:
  - Use any M4L device that listens on UDP port 9000
  - e.g. "OSCulator" or a custom Max patch with `udpreceive 9000`

### 2. Start the Bridge Server

```bash
# Install dependencies (one time)
npm install ws osc

# Start the bridge
node osc-bridge-server.js
```

You should see:
```
✅ OSC UDP ready → 127.0.0.1:9000
🌐 WebSocket bridge listening on ws://localhost:8080
```

### 3. Open the Web App

Open `gravitas.html` in Chrome or Edge.

> Tip: You can also serve it with `npx serve .` for a cleaner URL.

### 4. Connect the Scale

1. Plug in your USB scale via USB
2. Select your scale type from the **Scale Type** dropdown:
   - **DYMO S100 Postal Scale (USB HID)** — for DYMO postal scales
   - **U.S. Solid Precision Balance (Serial)** — for U.S. Solid lab scales (uses virtual COM port)
   - **Generic USB Scale (HID)** — for any other USB HID scale
   - **Generic USB Scale (Serial)** — for any other serial-output scale
3. For serial scales, select the correct **Baud Rate** (9600 is the default for most U.S. Solid models)
4. Click **Connect Scale** — Chrome will show a device/port picker
5. Select your scale from the list

> **Note on U.S. Solid scales:** These scales use a USB-to-serial chip (CH340, CP2102, or FTDI) and
> appear as a virtual COM port, not as a plug-and-play HID device. On macOS you may need to install
> the appropriate driver (e.g. CH340 driver). The scale continuously sends ASCII weight readings
> over the serial connection.

### 5. Connect the OSC Bridge

1. Click **Connect Bridge** (default: `ws://localhost:8080`)
2. The status pills in the header should turn green

### 6. Configure OSC Mappings

Add OSC addresses that match your AbletonOSC setup. Common addresses:

| Address | Description |
|---|---|
| `/live/track/1/volume` | Track 1 volume |
| `/live/master/volume` | Master volume |
| `/live/track/1/send/0` | Track 1, Send A |
| `/live/device/1/parameter/1` | Device param |

---

## Configuration Options

| Control | Description |
|---|---|
| **Weight Range** | Maps min→max grams to MIDI 0→127 |
| **Smoothing** | Averaging window (1=raw, 20=very smooth) |
| **Poll Rate** | How often weight is read (20–500ms) |
| **Unit** | Display in g, oz, or lb |
| **OSC Type** | Float (0–1) or Int (0–127) per mapping |

---

## Ableton OSC Port Reference

AbletonOSC defaults: **receive port 9000, send port 11000**

If using a different port, edit `osc-bridge-server.js`:
```js
const OSC_PORT = 9000;  // ← change this
```

---

## Troubleshooting

**Scale not appearing in picker:**
- Make sure your scale is plugged in before clicking Connect
- Select the correct Scale Type from the dropdown
- Try the **Generic** option (HID or Serial) if your specific model isn't listed
- Try a different USB port/cable
- On Linux, add a udev rule for your scale's vendor ID:
  - DYMO: `SUBSYSTEM=="hidraw", ATTRS{idVendor}=="0922", MODE="0666"`
  - Serial scales: `SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", MODE="0666"` (CH340)

**U.S. Solid / serial scale not connecting:**
- On macOS, install the CH340 or CP2102 USB-to-serial driver if the port doesn't appear
- Check that the correct baud rate is selected (most U.S. Solid scales use 9600)
- The scale may need to be in "continuous print" or "auto-send" mode — check its settings menu
- Open a serial terminal app (CoolTerm, Serial) to verify the scale is sending data

**No weight changes:**
- Check that the scale is powered (it powers via USB)
- Check the browser console for HID report errors

**OSC not reaching Ableton:**
- Confirm bridge server is running (`node osc-bridge-server.js`)
- Confirm AbletonOSC is loaded in Ableton's Control Surface list
- Try `nc -u 127.0.0.1 9000` to test UDP connectivity

---

## USB HID Scale Report Format

HID scales (DYMO, generic) use the standard USB HID scale report protocol:

```
Byte 0: Report ID
Byte 1: Status (0=stable, 1=fault, 4=positive overweight, 5=negative)
Byte 2: Unit (2=g, 11=oz, 12=lb)
Byte 3: Scaling exponent (signed, e.g. -1 = ÷10)
Byte 4: Weight LSB
Byte 5: Weight MSB
```

Weight = (Byte5 << 8 | Byte4) × 10^(Byte3)

---

## Serial Scale Output Format

Serial scales (U.S. Solid, generic serial) transmit ASCII lines over a virtual COM port.
Common formats:

```
ST,GS,+  123.45,g       (stable, gross, positive, grams)
US,GS,+    0.02,g       (unstable reading)
+  123.45 g              (simple format)
   0.00 g                (zero reading)
```

GRAVITAS extracts the first numeric value (including sign and decimals) from each line,
making it tolerant of format variations across different serial scale brands.
