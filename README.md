# GRAVITAS — Scale → MIDI/OSC Controller

Turn physical weight from a DYMO S100 USB Postal Scale into MIDI control
messages sent to Ableton Live via OSC.

## Signal Chain

```
DYMO S100 (USB HID) → Chrome/Edge (WebHID)
    → Weight value → MIDI map (0–127 / float 0–1)
        → WebSocket → Node.js bridge server
            → OSC UDP → AbletonOSC / Max4Live
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

1. Plug in your DYMO S100 via USB
2. Click **Connect DYMO S100** — Chrome will show a device picker
3. Select your scale

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
- Make sure the DYMO S100 is plugged in before clicking Connect
- Try a different USB port/cable
- On Linux, add a udev rule: `SUBSYSTEM=="hidraw", ATTRS{idVendor}=="0922", MODE="0666"`

**No weight changes:**
- Check that the scale is powered (it powers via USB)
- Check the browser console for HID report errors

**OSC not reaching Ableton:**
- Confirm bridge server is running (`node osc-bridge-server.js`)
- Confirm AbletonOSC is loaded in Ableton's Control Surface list
- Try `nc -u 127.0.0.1 9000` to test UDP connectivity

---

## DYMO S100 HID Report Format

```
Byte 0: Report ID
Byte 1: Status (0=stable, 1=fault, 4=positive overweight, 5=negative)
Byte 2: Unit (2=g, 11=oz, 12=lb)
Byte 3: Scaling exponent (signed, e.g. -1 = ÷10)
Byte 4: Weight LSB
Byte 5: Weight MSB
```

Weight = (Byte5 << 8 | Byte4) × 10^(Byte3)
