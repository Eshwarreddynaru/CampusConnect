import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate report code in format: KARE[YEAR][TYPE][RANDOM]
 * Example: KARE26L-A3X9B2 (Lost), KARE26F-K7M1P4 (Found)
 * Uses a random suffix to avoid duplicate key collisions.
 */
export function generateReportCode(type: 'lost' | 'found'): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const typeCode = type === 'lost' ? 'L' : 'F';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `KARE${year}${typeCode}-${random}`;
}

/**
 * Extract register number for privacy display
 * Only shows register number, hides all other PII
 */
export function formatRegisterNumber(registerNumber: string): string {
  return registerNumber.toUpperCase();
}

/**
 * Validate college email domain
 */
export function isValidCollegeEmail(email: string): boolean {
  // Accept @klu.ac.in domain for Kalasalingam University
  const validDomains = ['@klu.ac.in', '@kalasalingam.ac.in'];
  return validDomains.some(domain => email.toLowerCase().endsWith(domain));
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

/**
 * Campus coordinates for map bounds
 */
export const CAMPUS_BOUNDS = {
  center: { lat: 9.5743, lng: 77.6761 },
  bounds: {
    north: 9.5850,
    south: 9.5630,
    east: 77.6900,
    west: 77.6620,
  },
  zoom: {
    default: 16,
    min: 15,
    max: 19,
  },
};

/**
 * Report categories
 */
export const REPORT_CATEGORIES = [
  { id: 'electronics', label: 'Electronics', icon: 'Smartphone' },
  { id: 'id', label: 'ID Cards', icon: 'CreditCard' },
  { id: 'wallet', label: 'Wallet', icon: 'Wallet' },
  { id: 'books', label: 'Books', icon: 'BookOpen' },
  { id: 'clothes', label: 'Clothes', icon: 'Shirt' },
  { id: 'accessories', label: 'Accessories', icon: 'Watch' },
  { id: 'keys', label: 'Keys', icon: 'Key' },
  { id: 'others', label: 'Others', icon: 'Package' },
] as const;

export type ReportCategory = typeof REPORT_CATEGORIES[number]['id'];

/**
 * Report status types
 */
export const REPORT_STATUS = {
  active: { label: 'Active', color: 'primary' },
  claimed: { label: 'Claimed', color: 'warning' },
  returned_qr: { label: 'Returned (QR)', color: 'success' },
  returned_direct: { label: 'Returned', color: 'success' },
} as const;

export type ReportStatus = keyof typeof REPORT_STATUS;

/**
 * User status types
 */
export const USER_STATUS = {
  active: { label: 'Active', color: 'success' },
  warned: { label: 'Warned', color: 'warning' },
  suspended: { label: 'Suspended', color: 'destructive' },
  banned: { label: 'Banned', color: 'destructive' },
} as const;

export type UserStatus = keyof typeof USER_STATUS;
