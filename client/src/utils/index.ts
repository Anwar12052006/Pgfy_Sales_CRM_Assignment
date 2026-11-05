/**
 * Client-side utility helpers.
 * Add shared formatting, date, and misc utilities here.
 */

/**
 * Concatenate CSS class names, filtering out falsy values.
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
