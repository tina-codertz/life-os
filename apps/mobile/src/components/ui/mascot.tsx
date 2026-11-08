import { Image } from 'expo-image';
import celebrating from '@/assets/mascot/lio-celebrating.png';
import excited from '@/assets/mascot/lio-excited.png';
import focused from '@/assets/mascot/lio-focused.png';
import happy from '@/assets/mascot/lio-happy.png';
import planning from '@/assets/mascot/lio-planning.png';
import sleepy from '@/assets/mascot/lio-sleepy.png';

// Lio, the mascot from the design (docs/07 §8). Each mood is a picture; the alt text says
// which, for screen readers, unless the screen marks it decorative.
const MOODS = {
  happy: { source: happy, alt: 'Lio, happy', ratio: 350 / 374 },
  excited: { source: excited, alt: 'Lio, excited', ratio: 344 / 412 },
  focused: { source: focused, alt: 'Lio, focused', ratio: 312 / 342 },
  sleepy: { source: sleepy, alt: 'Lio, asleep', ratio: 316 / 288 },
  planning: { source: planning, alt: 'Lio, planning', ratio: 378 / 366 },
  celebrating: { source: celebrating, alt: 'Lio, celebrating', ratio: 1 },
} as const;

export type MascotMood = keyof typeof MOODS;

export function Mascot({
  mood,
  height,
  decorative = false,
}: {
  mood: MascotMood;
  height: number;
  decorative?: boolean;
}) {
  const { source, alt, ratio } = MOODS[mood];
  return (
    <Image
      source={source}
      style={{ height, width: Math.round(height * ratio) }}
      contentFit="contain"
      accessible={!decorative}
      {...(decorative ? {} : { accessibilityLabel: alt })}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
    />
  );
}
