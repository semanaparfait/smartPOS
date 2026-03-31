// utils/beep.ts
import { Audio } from 'expo-av';

let soundInstance: Audio.Sound | null = null;

export async function playBeep() {
  try {
    if (!soundInstance) {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sound/beep.mp3')
      );
      soundInstance = sound;
    }
    await soundInstance.replayAsync(); // Much faster than createAsync
  } catch (e) {
    console.log("Beep error", e);
  }
}