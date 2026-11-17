// Short notification sounds. Each is loaded once and replayed, so it starts
// straight away. Never throws: a sound failing must not stop the screen.
import { Audio } from "expo-av";

const FILES = {
  // On the till or waiter's phone: a cook took their order.
  taken: require("../assets/sound/order-taken.wav"),
  // On a kitchen screen: a new order (or new items) arrived.
  newOrder: require("../assets/sound/new-order.wav"),
  // On the till: a scanned barcode could not be added.
  scanError: require("../assets/sound/scan-error.wav"),
} as const;

export type SoundName = keyof typeof FILES;

const loaded: Partial<Record<SoundName, Audio.Sound>> = {};

export async function playSound(name: SoundName) {
  try {
    if (!loaded[name]) {
      const { sound } = await Audio.Sound.createAsync(FILES[name]);
      loaded[name] = sound;
    }
    await loaded[name]!.replayAsync();
  } catch (e) {
    console.log("Sound error", e);
  }
}
