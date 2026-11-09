import type { LucideIcon } from 'lucide-react-native';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import BookOpen from 'lucide-react-native/icons/book-open';
import Briefcase from 'lucide-react-native/icons/briefcase';
import Calendar from 'lucide-react-native/icons/calendar';
import ChartColumn from 'lucide-react-native/icons/chart-column';
import Check from 'lucide-react-native/icons/check';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronsRight from 'lucide-react-native/icons/chevrons-right';
import Clock from 'lucide-react-native/icons/clock';
import Flag from 'lucide-react-native/icons/flag';
import Flame from 'lucide-react-native/icons/flame';
import History from 'lucide-react-native/icons/history';
import Globe from 'lucide-react-native/icons/globe';
import HeartPulse from 'lucide-react-native/icons/heart-pulse';
import House from 'lucide-react-native/icons/house';
import Layers from 'lucide-react-native/icons/layers';
import ListChecks from 'lucide-react-native/icons/list-checks';
import Lock from 'lucide-react-native/icons/lock';
import LogOut from 'lucide-react-native/icons/log-out';
import Mail from 'lucide-react-native/icons/mail';
import Moon from 'lucide-react-native/icons/moon';
import Palette from 'lucide-react-native/icons/palette';
import Plus from 'lucide-react-native/icons/plus';
import Search from 'lucide-react-native/icons/search';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Repeat from 'lucide-react-native/icons/repeat';
import Smartphone from 'lucide-react-native/icons/smartphone';
import Sun from 'lucide-react-native/icons/sun';
import Tag from 'lucide-react-native/icons/tag';
import TextAlignStart from 'lucide-react-native/icons/text-align-start';
import Trash from 'lucide-react-native/icons/trash';
import TriangleExclamationPoint from 'lucide-react-native/icons/triangle-exclamation-point';
import Trophy from 'lucide-react-native/icons/trophy';
import User from 'lucide-react-native/icons/user';
import Wallet from 'lucide-react-native/icons/wallet';
import X from 'lucide-react-native/icons/x';
import Zap from 'lucide-react-native/icons/zap';
import Target from 'lucide-react-native/icons/target';
import Star from 'lucide-react-native/icons/star';
import Sparkle from 'lucide-react-native/icons/sparkle';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import Pencil from 'lucide-react-native/icons/pencil';
import Music from 'lucide-react-native/icons/music';
import Gift from 'lucide-react-native/icons/gift';
import Footprints from 'lucide-react-native/icons/footprints';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import Droplet from 'lucide-react-native/icons/droplet';
import Bell from 'lucide-react-native/icons/bell';
import Brain from 'lucide-react-native/icons/brain';
import Archive from 'lucide-react-native/icons/archive';
import { View } from 'react-native';
import { useTheme } from '@/theme';

// The design's line icons: Lucide, drawn with a 1.9 stroke as in the design export. Screens
// name an icon by meaning; each icon is imported on its own so only these end up in the app.
const ICONS = {
  archive: Archive,
  bell: Bell,
  brain: Brain,
  droplet: Droplet,
  dumbbell: Dumbbell,
  footprints: Footprints,
  gift: Gift,
  music: Music,
  pencil: Pencil,
  sliders: SlidersHorizontal,
  sparkle: Sparkle,
  star: Star,
  target: Target,
  zap: Zap,
  add: Plus,
  arrowRight: ArrowRight,
  book: BookOpen,
  briefcase: Briefcase,
  calendar: Calendar,
  chart: ChartColumn,
  check: Check,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronsRight: ChevronsRight,
  clock: Clock,
  close: X,
  flag: Flag,
  flame: Flame,
  globe: Globe,
  health: HeartPulse,
  history: History,
  home: House,
  layers: Layers,
  lock: Lock,
  mail: Mail,
  moon: Moon,
  notes: TextAlignStart,
  palette: Palette,
  person: User,
  phone: Smartphone,
  refresh: RefreshCw,
  repeat: Repeat,
  search: Search,
  signOut: LogOut,
  sun: Sun,
  tag: Tag,
  tasks: ListChecks,
  trash: Trash,
  trophy: Trophy,
  wallet: Wallet,
  warning: TriangleExclamationPoint,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

// Decorative: the button or row around it carries the label, so screen readers skip the icon.
export function Icon({ name, size = 20, color }: IconProps) {
  const { colors } = useTheme();
  const Glyph = ICONS[name];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Glyph size={size} color={color ?? colors.text.primary} strokeWidth={1.9} />
    </View>
  );
}
