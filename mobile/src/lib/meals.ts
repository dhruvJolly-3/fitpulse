import type { MealType } from './types';

export const MEALS: { value: MealType; label: string; icon: string }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: '☀️' },
  { value: 'lunch', label: 'Lunch', icon: '🌤️' },
  { value: 'dinner', label: 'Dinner', icon: '🌙' },
  { value: 'snack', label: 'Snack', icon: '🍎' },
  { value: 'pre_workout', label: 'Pre-workout', icon: '⚡' },
  { value: 'post_workout', label: 'Post-workout', icon: '💪' },
];
