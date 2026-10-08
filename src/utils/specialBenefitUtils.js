import { 
  Sparkles, Heart, Moon, Umbrella, Baby, BookOpen, HandHeart, Activity 
} from 'lucide-react';

export const getSpecialBenefitIcon = (conf) => {
  if (!conf) return Sparkles;
  if (conf.icon) {
    const map = { 
      heart: Heart, 
      umbrella: Umbrella, 
      baby: Baby, 
      moon: Moon, 
      book: BookOpen, 
      hand: HandHeart, 
      health: Activity,
      sparkles: Sparkles 
    };
    if (map[conf.icon]) return map[conf.icon];
  }
  const key = `${conf.id || ''} ${conf.name || ''}`.toLowerCase();
  if (key.includes('menstru') || key.includes('period') || key.includes('cycle') || key.includes('cramp')) return Heart;
  if (key.includes('bereave') || key.includes('funeral') || key.includes('grief') || key.includes('compassion')) return Umbrella;
  if (key.includes('parent') || key.includes('matern') || key.includes('patern') || key.includes('baby') || key.includes('child')) return Baby;
  if (key.includes('mental') || key.includes('mind') || key.includes('wellness') || key.includes('rest') || key.includes('sleep') || key.includes('burnout')) return Moon;
  if (key.includes('study') || key.includes('exam') || key.includes('learn') || key.includes('educat')) return BookOpen;
  if (key.includes('volunteer') || key.includes('charity') || key.includes('donate') || key.includes('service')) return HandHeart;
  if (key.includes('health') || key.includes('medic') || key.includes('doctor') || key.includes('clinic')) return Activity;
  return Sparkles;
};

export const BENEFIT_ICON_PRESETS = [
  { id: 'heart', label: 'Heart', icon: Heart },
  { id: 'umbrella', label: 'Umbrella', icon: Umbrella },
  { id: 'baby', label: 'Baby', icon: Baby },
  { id: 'moon', label: 'Moon', icon: Moon },
  { id: 'book', label: 'Study', icon: BookOpen },
  { id: 'hand', label: 'Care', icon: HandHeart },
  { id: 'health', label: 'Health', icon: Activity },
  { id: 'sparkles', label: 'General', icon: Sparkles },
];
