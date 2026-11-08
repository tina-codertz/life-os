import { Redirect } from 'expo-router';
import { areaFor, HOME_OF, useSession } from '@/features/auth/session';

// "/" isn't a screen: it sends each user to the start of the part of the app they may see.
export default function Index() {
  const area = areaFor(useSession());
  return area ? <Redirect href={HOME_OF[area]} /> : null;
}
