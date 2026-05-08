import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: any, currency: string = "₹") {
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return `${currency}${numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function formatDate(dateString: any) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return 'Invalid Date';
  }
}

export async function apiFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const userId = localStorage.getItem('userId') || '';
  const userRole = localStorage.getItem('userRole') || '';
  
  const headers = new Headers(init?.headers);
  if (userId) headers.set('x-user-id', userId);
  if (userRole) headers.set('x-user-role', userRole);

  return fetch(input, { ...init, headers });
}
