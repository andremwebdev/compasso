// Date di calendario nella forma AAAA-MM-GG. Il giorno è la data locale del dispositivo
// (specifica, sezione 9): la si ricava una volta da un Date, poi si lavora solo sulle stringhe.

/** La data locale di un istante, AAAA-MM-GG. */
export function localDate(when: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`;
}

/** Una data come numero di giorni dal 1970 (in UTC, così l'ora legale non sposta nulla). */
export function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.round(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

/** La data che viene `days` giorni dopo (o prima, se negativo). */
export function addDays(date: string, days: number): string {
  const when = new Date((dayNumber(date) + days) * 86_400_000);
  return when.toISOString().slice(0, 10);
}

/** Quanti giorni da `from` a `to` (positivo se `to` viene dopo). */
export const daysBetween = (from: string, to: string): number => dayNumber(to) - dayNumber(from);

/** Il lunedì della settimana della data (le settimane vanno da lunedì a domenica). */
export function weekStart(date: string): string {
  // Il 1° gennaio 1970 era un giovedì: con lo scarto di 3 il lunedì vale 0.
  const weekday = (((dayNumber(date) + 3) % 7) + 7) % 7;
  return addDays(date, -weekday);
}

/** La data locale di un istante salvato in formato ISO. */
export const dateOf = (at: string): string => localDate(new Date(at));

/** Giorni passati da un istante ISO a `now`, con la frazione (per i pesi che si dimezzano). */
export const ageInDays = (at: string, now: Date): number => Math.max(0, (now.getTime() - Date.parse(at)) / 86_400_000);
