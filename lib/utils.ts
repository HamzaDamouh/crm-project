import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  // Format as 12 450,00 MAD
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace(/\u202f/g, ' ') + ' MAD'
}

/**
 * Converts a number to French words for invoicing (e.g. 1110 -> mille cent dix)
 * Supports up to millions.
 */
export function numberToFrenchWords(number: number): string {
  if (number === 0) return "zéro";

  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingts", "quatre-vingt-dix"];

  function convertGroup(n: number): string {
    if (n === 0) return "";
    let result = "";

    const h = Math.floor(n / 100);
    const remainder = n % 100;

    if (h > 0) {
      if (h === 1) result += "cent ";
      else result += units[h] + " cent" + (remainder === 0 ? "s " : " ");
    }

    if (remainder > 0) {
      if (remainder < 10) {
        result += units[remainder] + " ";
      } else if (remainder < 20) {
        result += teens[remainder - 10] + " ";
      } else {
        const t = Math.floor(remainder / 10);
        const u = remainder % 10;
        
        if (t === 7) {
            result += "soixante" + (u === 1 ? " et onze " : "-" + teens[u] + " ");
        } else if (t === 9) {
            result += "quatre-vingt-" + teens[u] + " ";
        } else {
            result += tens[t] + (u === 1 && t < 8 ? " et un " : u > 0 ? "-" + units[u] + " " : " ");
            if (t === 8 && u === 0 && h === 0) {
                // Fix for just "quatre-vingts"
                result = result.trimEnd() + "s ";
            }
        }
      }
    }
    return result;
  }

  let words = "";
  
  const m = Math.floor(number / 1000000);
  number %= 1000000;
  
  const th = Math.floor(number / 1000);
  const remainder = number % 1000;

  if (m > 0) {
    if (m === 1) words += "un million ";
    else words += convertGroup(m).trim() + " millions ";
  }

  if (th > 0) {
    if (th === 1) words += "mille ";
    else words += convertGroup(th).trim() + " mille ";
  }

  if (remainder > 0) {
    words += convertGroup(remainder);
  }

  // Handle decimals
  const decimalPart = Math.round((number % 1) * 100);
  if (decimalPart > 0) {
    return (words.trim() + " virgule " + numberToFrenchWords(decimalPart).trim()).replace(/\s+/g, ' ');
  }

  return words.trim().replace(/\s+/g, ' ');
}
