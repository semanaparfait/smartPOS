// utils/printSound.ts
import { Audio } from 'expo-av';

let soundInstance: Audio.Sound | null = null;

async function getSound() {
  if (!soundInstance) {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sound/receipt-print.wav')
    );
    soundInstance = sound;
  }
  return soundInstance;
}

// Load ahead of time so playback starts in sync with the paper feed.
export async function preloadPrintSound() {
  try {
    await getSound();
  } catch (e) {
    console.log("Print sound preload error", e);
  }
}

export async function playPrintSound() {
  try {
    const sound = await getSound();
    await sound.replayAsync();
  } catch (e) {
    console.log("Print sound error", e);
  }
}

export async function stopPrintSound() {
  try {
    await soundInstance?.stopAsync();
  } catch (e) {
    console.log("Print sound stop error", e);
  }
}
