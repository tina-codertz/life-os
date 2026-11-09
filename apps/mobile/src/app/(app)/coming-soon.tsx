import { PlaceholderScreen } from '@/components/placeholder-screen';

// Ask Lio, opened from the Lio page (your choice). The assistant itself comes in v2.
export default function ComingSoon() {
  return (
    <PlaceholderScreen
      title="Ask Lio"
      description="Ask Lio to plan your day or sum up your week (coming in v2)."
      tabBar={false}
    />
  );
}
