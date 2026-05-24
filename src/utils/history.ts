import { UserProfile, START_DATE } from '../types';

// Simple deterministic hash based on userId/displayName
function getSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// Generate deterministic random numbers based on a seed
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  // Min inclusive, max exclusive
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export interface DayRecord {
  dateStr: string; // YYYY-MM-DD
  distance: number;
}

export function generateUserHistory(user: UserProfile, currentDate: Date = new Date()): DayRecord[] {
  const history: Record<string, number> = { ...(user.history || {}) };
  
  // Sum up what is already in user.history
  const historySum = Object.values(history).reduce((sum, v) => sum + v, 0);
  
  const start = new Date(START_DATE.getFullYear(), START_DATE.getMonth(), START_DATE.getDate());
  const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  
  // Create all days from START_DATE up to today
  const daysList: string[] = [];
  const temp = new Date(start);
  while (temp <= today) {
    const yyyy = temp.getFullYear();
    const mm = String(temp.getMonth() + 1).padStart(2, '0');
    const dd = String(temp.getDate()).padStart(2, '0');
    daysList.push(`${yyyy}-${mm}-${dd}`);
    temp.setDate(temp.getDate() + 1);
  }

  // If user has zero distance, return empty records for all days
  if (user.totalDistance <= 0) {
    return daysList.map(d => ({ dateStr: d, distance: 0 }));
  }

  // Find remaining distance and runs to distribute
  const remainingDistance = Math.max(0, user.totalDistance - historySum);
  const remainingRuns = Math.max(0, (user.runCount || 0) - Object.keys(history).length);

  if (remainingDistance > 0 && daysList.length > 0) {
    const seed = getSeed(user.id + user.displayName);
    const rng = new SeededRandom(seed);
    
    // Choose which days they ran. We skip days that already have custom history.
    const availableDays = daysList.filter(d => !history[d]);
    const numRunsToPlace = Math.min(remainingRuns > 0 ? remainingRuns : 5, availableDays.length);
    
    if (numRunsToPlace > 0 && availableDays.length > 0) {
      // Pick numRunsToPlace days deterministically
      const selectedDays: string[] = [];
      const pool = [...availableDays];
      for (let i = 0; i < numRunsToPlace; i++) {
        const index = Math.floor(rng.range(0, pool.length));
        selectedDays.push(pool[index]);
        pool.splice(index, 1);
      }
      
      // Distribute remainingDistance across chosen days with slight variance
      const weights = selectedDays.map(() => rng.range(0.6, 1.4));
      const totalWeight = weights.reduce((s, w) => s + w, 0);
      
      selectedDays.forEach((day, i) => {
        const portion = (weights[i] / totalWeight) * remainingDistance;
        history[day] = Number(portion.toFixed(2));
      });
    } else {
      // Fallback: If no available days, put everything on the last day
      const lastDay = daysList[daysList.length - 1];
      history[lastDay] = Number(((history[lastDay] || 0) + remainingDistance).toFixed(2));
    }
  }

  // Return full array of days
  return daysList.map(d => ({
    dateStr: d,
    distance: history[d] || 0
  }));
}

export function generateClassHistory(members: UserProfile[], currentDate: Date = new Date()): DayRecord[] {
  // Generate user histories first
  const userHistories = members.map(m => generateUserHistory(m, currentDate));
  
  const start = new Date(START_DATE.getFullYear(), START_DATE.getMonth(), START_DATE.getDate());
  const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  
  // Create empty timeline
  const daysMap: Record<string, number> = {};
  const temp = new Date(start);
  while (temp <= today) {
    const yyyy = temp.getFullYear();
    const mm = String(temp.getMonth() + 1).padStart(2, '0');
    const dd = String(temp.getDate()).padStart(2, '0');
    daysMap[`${yyyy}-${mm}-${dd}`] = 0;
    temp.setDate(temp.getDate() + 1);
  }

  // Sum all runs for each day
  userHistories.forEach(userHist => {
    userHist.forEach(record => {
      if (daysMap[record.dateStr] !== undefined) {
        daysMap[record.dateStr] += record.distance;
      }
    });
  });

  // Convert to sorted DayRecords
  return Object.entries(daysMap).map(([dateStr, distance]) => ({
    dateStr,
    distance: Number(distance.toFixed(2))
  })).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}
