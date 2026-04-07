/**
 * Safe date parsing utilities that prevent timezone shifting.
 * 
 * Problem: new Date("2026-04-06") parses as UTC midnight, but the browser
 * renders it in local time, causing day shifts (e.g., April 6 UTC becomes April 5 PT).
 * 
 * Solution: Use parse() from date-fns with explicit format to handle date-only strings
 * without timezone interpretation.
 */

import { parse } from 'date-fns';

/**
 * Parse a date-only string (YYYY-MM-DD) safely without timezone shift.
 * This ensures April 6 stays April 6 regardless of browser timezone.
 * 
 * @param {string|Date} dateInput - Date string in YYYY-MM-DD format or Date object
 * @returns {Date} Parsed date object in local timezone
 * 
 * @example
 * parseDateOnly("2026-04-06") // Always April 6, not April 5 or 7
 */
export const parseDateOnly = (dateInput) => {
  if (!dateInput) return new Date();
  
  // If already a Date object, return as-is
  if (dateInput instanceof Date) return dateInput;
  
  // If it's a date-only string like "2026-04-06", parse with format
  if (typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return parse(dateInput, 'yyyy-MM-dd', new Date());
  }
  
  // Fallback for other formats (shouldn't happen in normal flow)
  return new Date(dateInput);
};

/**
 * Format a date to YYYY-MM-DD string (date-only, no time component).
 * Safe for database storage as it avoids timezone issues.
 * 
 * @param {Date} date - Date object to format
 * @returns {string} Date string in YYYY-MM-DD format
 * 
 * @example
 * formatDateOnly(new Date("2026-04-06")) // "2026-04-06"
 */
export const formatDateOnly = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};