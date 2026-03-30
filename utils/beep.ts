import { Audio } from 'expo-av';

export async function playBeep() {
  const { sound } = await Audio.Sound.createAsync(
    require('../assets/sound/beep.mp3')
  );
  await sound.playAsync();
}