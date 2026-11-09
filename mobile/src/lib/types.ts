// Shapes returned by the FitPulse API (only the fields the app uses).

export type Goal = 'lose_weight' | 'maintain' | 'gain_muscle' | 'endurance';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
export type DietType = 'veg' | 'non-veg' | 'vegan' | 'keto' | 'paleo';

export interface ReminderSlot { on: boolean; time: string }
export interface Reminders {
  enabled: boolean;
  water: { on: boolean; everyHours: number; from: string; to: string };
  workout: ReminderSlot;
  meals: ReminderSlot;
  sleep: ReminderSlot;
  weighIn: ReminderSlot;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  profile: {
    age?: number;
    gender?: 'male' | 'female' | 'other';
    height?: number;
    weight?: number;
    targetWeight?: number;
    activityLevel?: ActivityLevel;
    dietType?: DietType;
    goal?: Goal;
  };
  tdee?: number;
  dailyCalorieTarget?: number;
  macroTargets?: { protein: number; carbs: number; fat: number };
  waterTarget: number;
  stepTarget: number;
  sleepTarget: number;
  timezone?: string;
  reminders?: Reminders;
  healthSync?: { source?: 'health_connect' | 'apple_health'; lastSyncAt?: string };
}

export interface AuthResponse { token: string; user: User }

export interface FoodItem {
  _id: string;
  name: string;
  brand?: string;
  quantity?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  mealType: MealType;
}
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';

export interface NutritionLog {
  date: string;
  foods: FoodItem[];
  totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
}

export interface Food {
  id: string;
  name: string;
  brand: string | null;
  source: 'fitpulse' | 'openfoodfacts';
  barcode: string | null;
  image: string | null;
  serving: { label: string; grams: number };
  per100g: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
}

export interface WaterLog { date: string; entries: { _id: string; amount: number; type: string; time: string }[]; total: number }
export interface SleepLog { date: string; duration: number; quality?: number; bedtime?: string; wakeTime?: string; source?: string }
export interface StepsLog { date: string; steps: number; distance?: number; caloriesBurnt?: number; activeMinutes?: number; source?: string }

export interface Exercise { name: string; category?: string; sets?: number; reps?: string | number; duration?: number; completed?: boolean }
export interface WorkoutLog {
  _id: string;
  date: string;
  dayLabel?: string;
  programName?: string;
  isRestDay?: boolean;
  isOffDay?: boolean;
  exercises: Exercise[];
  totalCaloriesBurnt?: number;
  totalDuration?: number;
  synced?: { externalId: string; type: string; durationMin?: number; calories?: number; distanceKm?: number; source: string }[];
}
export interface TrainingProgram {
  _id: string;
  name: string;
  schedule: { day: number; label: string; isRest: boolean; exercises: Exercise[] }[];
}

export interface WeightEntry { _id: string; date: string; weight: number; bodyFat?: number; trend: number; source?: string }
export interface WeightHistory {
  entries: WeightEntry[];
  summary: { count: number; start: number | null; latest: number | null; change: number | null; targetWeight: number | null };
}

export interface Photo { _id: string; date: string; pose: 'front' | 'side' | 'back' | 'other'; weight?: number; note?: string }
