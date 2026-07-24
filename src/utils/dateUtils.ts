export const formatDateInput = (date: Date): string => date.toISOString().slice(0, 10);

export const formatTimeInput = (date: Date): string => date.toTimeString().slice(0, 5);

export const combineDateAndTime = (date: string, time: string): Date => {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  const now = new Date();
  const year = dateMatch ? Number(dateMatch[1]) : now.getFullYear();
  const month = dateMatch ? Number(dateMatch[2]) - 1 : now.getMonth();
  const day = dateMatch ? Number(dateMatch[3]) : now.getDate();
  const hours = timeMatch ? Number(timeMatch[1]) : now.getHours();
  const minutes = timeMatch ? Number(timeMatch[2]) : now.getMinutes();
  return new Date(year, month, day, hours, minutes, 0, 0);
};

export const toOverviewDate = (date: string, time: string): string => {
  const normalizedTime = time.trim() || '--:--';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) {
    return `Unbekanntes Datum · ${normalizedTime}`;
  }

  const [, year, month, day] = match;
  const validatedDate = new Date(Number(year), Number(month) - 1, Number(day));
  const isValidDate =
    !Number.isNaN(validatedDate.getTime()) &&
    validatedDate.getFullYear() === Number(year) &&
    validatedDate.getMonth() === Number(month) - 1 &&
    validatedDate.getDate() === Number(day);

  if (!isValidDate) {
    return `Unbekanntes Datum · ${normalizedTime}`;
  }

  return `${day}.${month}.${year} · ${normalizedTime}`;
};
