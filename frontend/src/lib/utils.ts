/**
 * Utility functions and helpers
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes
 * Using clsx and tailwind-merge for optimal CSS performance
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
