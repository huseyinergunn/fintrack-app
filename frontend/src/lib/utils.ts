import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn/ui'nin cn() helper'ı — Tailwind class'larını birleştirir, çakışanları çözer
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
