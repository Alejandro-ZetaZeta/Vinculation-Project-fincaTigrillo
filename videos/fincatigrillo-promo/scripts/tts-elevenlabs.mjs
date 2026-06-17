import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function loadDotEnvIfPresent(dotenvPath) {
  if (!fs.existsSync(dotenvPath)) return;
  const raw = fs.readFileSync(dotenvPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (!key) continue;

    // Strip wrapping quotes if present.
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }

    if (process.env[key] == null) process.env[key] = val;
  }
}

function detectAudioType(buf) {
  const a0 = buf[0];
  const a1 = buf[1];
  const a2 = buf[2];
  const a3 = buf[3];
  const head4 = buf.toString("ascii", 0, 4);

  if (head4 === "RIFF" && buf.toString("ascii", 8, 12) === "WAVE") return "wav";
  if (a0 === 0x49 && a1 === 0x44 && a2 === 0x33) return "mp3"; // ID3
  if (a0 === 0xff && (a1 & 0xe0) === 0xe0) return "mp3"; // frame sync
  return "unknown";
}

// Minimal WAV duration parser (PCM).
function getWavDurationSeconds(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error(`Not a WAV file: ${filePath}`);
  }

  let offset = 12;
  let byteRate = null;
  let dataSize = null;

  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;

    if (id === "fmt ") {
      // ByteRate at fmt offset + 8 (AudioFormat[2], NumChannels[2], SampleRate[4], ByteRate[4]).
      if (chunkDataStart + 16 <= buf.length) {
        byteRate = buf.readUInt32LE(chunkDataStart + 8);
      }
    } else if (id === "data") {
      dataSize = size;
    }

    // Chunks are word-aligned.
    offset = chunkDataStart + size + (size % 2);
    if (byteRate != null && dataSize != null) break;
  }

  if (byteRate == null || dataSize == null || byteRate === 0) {
    throw new Error(`Failed to parse WAV duration: ${filePath}`);
  }
  return dataSize / byteRate;
}

function readSyncSafeInt(b0, b1, b2, b3) {
  // 7 bits per byte.
  return ((b0 & 0x7f) << 21) | ((b1 & 0x7f) << 14) | ((b2 & 0x7f) << 7) | (b3 & 0x7f);
}

// MP3 duration approximation. For CBR it is accurate; for VBR it's a good-enough estimate.
function getMp3DurationSeconds(filePath) {
  const buf = fs.readFileSync(filePath);
  const fileSize = buf.length;

  let offset = 0;
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    const tagSize = readSyncSafeInt(buf[6], buf[7], buf[8], buf[9]);
    offset = 10 + tagSize;
  }

  // Find first frame header.
  while (offset + 4 < buf.length) {
    if (buf[offset] === 0xff && (buf[offset + 1] & 0xe0) === 0xe0) break;
    offset++;
  }
  if (offset + 4 >= buf.length) throw new Error(`Failed to find MP3 frame header: ${filePath}`);

  const b1 = buf[offset + 1];
  const b2 = buf[offset + 2];

  const versionBits = (b1 >> 3) & 0x03;
  const layerBits = (b1 >> 1) & 0x03;
  const bitrateIndex = (b2 >> 4) & 0x0f;
  const sampleRateIndex = (b2 >> 2) & 0x03;

  // Only handle MPEG1 Layer III and MPEG2/2.5 Layer III (enough for typical TTS output).
  const isMpeg1 = versionBits === 0x03;
  const isMpeg2 = versionBits === 0x02;
  const isMpeg25 = versionBits === 0x00;
  const isLayer3 = layerBits === 0x01;
  if (!isLayer3 || !(isMpeg1 || isMpeg2 || isMpeg25)) {
    throw new Error(`Unsupported MP3 format (version/layer): ${filePath}`);
  }

  const bitratesMpeg1L3 = [
    0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
  ];
  const bitratesMpeg2L3 = [
    0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0,
  ];
  const sampleRatesMpeg1 = [44100, 48000, 32000, 0];
  const sampleRatesMpeg2 = [22050, 24000, 16000, 0];
  const sampleRatesMpeg25 = [11025, 12000, 8000, 0];

  const bitrateKbps = isMpeg1 ? bitratesMpeg1L3[bitrateIndex] : bitratesMpeg2L3[bitrateIndex];
  const sampleRate = isMpeg1
    ? sampleRatesMpeg1[sampleRateIndex]
    : isMpeg2
      ? sampleRatesMpeg2[sampleRateIndex]
      : sampleRatesMpeg25[sampleRateIndex];

  if (!bitrateKbps || !sampleRate) {
    throw new Error(`Failed to parse MP3 bitrate/sampleRate: ${filePath}`);
  }

  // Estimate duration from remaining bytes.
  const audioBytes = Math.max(0, fileSize - offset);
  return (audioBytes * 8) / (bitrateKbps * 1000);
}

function getAudioDurationSeconds(filePath) {
  const buf = fs.readFileSync(filePath);
  const type = detectAudioType(buf);
  if (type === "wav") return getWavDurationSeconds(filePath);
  if (type === "mp3") return getMp3DurationSeconds(filePath);
  throw new Error(`Unknown audio container for ${filePath}`);
}

async function elevenLabsTts({ apiKey, voiceId, text }) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      // Keep defaults unless explicitly tuned; we can parameterize later.
      model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
      voice_settings: {
        stability: Number(process.env.ELEVENLABS_STABILITY ?? 0.45),
        similarity_boost: Number(process.env.ELEVENLABS_SIMILARITY_BOOST ?? 0.8),
        style: Number(process.env.ELEVENLABS_STYLE ?? 0.2),
        use_speaker_boost: String(process.env.ELEVENLABS_SPEAKER_BOOST ?? "true") === "true",
      },
    }),
  });

  if (!res.ok) {
    const textErr = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed: HTTP ${res.status} ${res.statusText}${textErr ? `\n${textErr}` : ""}`);
  }

  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  loadDotEnvIfPresent(path.resolve(projectRoot, ".env"));
  const scriptsPath = path.resolve(projectRoot, "narrator_scripts.json");
  const audioMetaPath = path.resolve(projectRoot, "audio_meta.json");
  const voiceDir = path.resolve(projectRoot, "assets", "voice");

  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ELEVENLABS_API_KEY (or XI_API_KEY) in environment");
  }

  const narrator = readJson(scriptsPath);
  const audioMeta = readJson(audioMetaPath);
  const voiceId = audioMeta.voice_id;
  if (!voiceId) throw new Error("audio_meta.json missing voice_id");

  ensureDir(voiceDir);

  audioMeta.tts_provider = "elevenlabs";
  audioMeta.voice_id = voiceId;
  audioMeta.scenes = audioMeta.scenes || {};

  for (const scene of narrator.scenes || []) {
    const n = scene.sceneNumber;
    const outRelMp3 = path.join("assets", "voice", `scene_${n}.mp3`);
    const outAbsMp3 = path.resolve(projectRoot, outRelMp3);

    // Migrate incorrectly-named existing assets: *.wav that are actually MP3.
    const legacyRelWav = path.join("assets", "voice", `scene_${n}.wav`);
    const legacyAbsWav = path.resolve(projectRoot, legacyRelWav);
    if (!fs.existsSync(outAbsMp3) && fs.existsSync(legacyAbsWav)) {
      const legacyBuf = fs.readFileSync(legacyAbsWav);
      if (detectAudioType(legacyBuf) === "mp3") {
        fs.renameSync(legacyAbsWav, outAbsMp3);
      }
    }

    const script = String(scene.script || "").trim();
    if (!script) {
      // Skip empty scenes but record them.
      audioMeta.scenes[String(n)] = {
        status: "skipped_empty",
        path: outRelMp3.replace(/\\/g, "/"),
        duration_s: 0,
        text: "",
      };
      continue;
    }

    const prev = audioMeta.scenes?.[String(n)];
    const needsRegenerate = !fs.existsSync(outAbsMp3) || (prev?.text && prev.text.trim() !== script);
    if (needsRegenerate) {
      const mp3 = await elevenLabsTts({ apiKey, voiceId, text: script });
      fs.writeFileSync(outAbsMp3, mp3);
    }

    const duration = getAudioDurationSeconds(outAbsMp3);
    audioMeta.scenes[String(n)] = {
      status: "ok",
      path: outRelMp3.replace(/\\/g, "/"),
      duration_s: Number(duration.toFixed(3)),
      text: script,
    };
  }

  const total = Object.values(audioMeta.scenes)
    .map((s) => (typeof s?.duration_s === "number" ? s.duration_s : 0))
    .reduce((a, b) => a + b, 0);

  audioMeta.total_duration_s = Number(total.toFixed(3));
  writeJson(audioMetaPath, audioMeta);

  // Intentionally do not print any secrets.
  const okCount = Object.values(audioMeta.scenes).filter((s) => s.status === "ok").length;
  console.log(`Generated/verified VO for ${okCount} scene(s). total_duration_s=${audioMeta.total_duration_s}`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
