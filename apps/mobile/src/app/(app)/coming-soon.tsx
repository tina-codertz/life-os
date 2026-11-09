import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/placeholder-screen';

// The design's Settings tiles for features that aren't built yet (your choice: show all four).
const FEATURES = {
  insights: {
    title: 'Insights',
    description: 'Charts and patterns from your tasks, habits and goals (coming in v2).',
  },
  'ask-lio': {
    title: 'Ask Lio',
    description: 'Ask Lio to plan your day or sum up your week (coming in v2).',
  },
} as const;

export default function ComingSoon() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const { title, description } = feature === 'ask-lio' ? FEATURES['ask-lio'] : FEATURES.insights;
  return <PlaceholderScreen title={title} description={description} tabBar={false} />;
}
