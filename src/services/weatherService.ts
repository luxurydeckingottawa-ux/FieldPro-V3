/**
 * Weather Service — Open-Meteo
 *
 * Why Open-Meteo: no API key, no billing, reliable 7-day forecast +
 * historical precipitation going back decades. Perfect for:
 *   • 7-day forecast card in the customer portal Schedule tab
 *   • Daily weather icon on each calendar day
 *   • Rain-days-since-booking smart meter
 *
 * Rate-limits on the free tier are generous (~10k req/day per source IP).
 * We cache per-coord+date so we never call twice for the same query in a
 * session. The portal is a small number of admins + a small number of
 * customer views per day — well inside the free budget.
 */

// Default: Ottawa, ON (home base for Luxury Decking)
export const DEFAULT_COORDS = { lat: 45.4215, lon: -75.6972 } as const;

export type WeatherCondition =
  | 'clear'        // 0 — clear sky
  | 'partly'       // 1–3 — mainly clear → partly cloudy → overcast
  | 'cloudy'       // 45, 48 — fog
  | 'rain-light'   // 51–57, 61, 80 — drizzle + light rain + light showers
  | 'rain'         // 63, 65, 81, 82 — moderate/heavy rain
  | 'snow'         // 71–77, 85, 86 — snow/snow showers
  | 'storm';       // 95, 96, 99 — thunderstorm

export interface DailyWeather {
  date: string;             // ISO yyyy-mm-dd
  condition: WeatherCondition;
  tempMaxC: number;
  tempMinC: number;
  precipMm: number;
  precipProbabilityPct: number;
  weatherCode: number;
}

export interface WeatherForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  days: DailyWeather[];     // chronological, today-first, length 7
}

export interface HistoricalRainSummary {
  startDate: string;
  endDate: string;
  totalDays: number;
  rainDays: number;         // days with >= 1mm precipitation
  heavyRainDays: number;    // days with >= 10mm
  totalPrecipMm: number;
}

// ── Weather-code → condition mapping (Open-Meteo WMO codes) ────────────────
function codeToCondition(code: number): WeatherCondition {
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly';
  if (code === 45 || code === 48) return 'cloudy';
  if ([51, 53, 55, 56, 57, 61, 80].includes(code)) return 'rain-light';
  if ([63, 65, 66, 67, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  return 'partly';
}

// ── In-memory cache (keyed by url) ─────────────────────────────────────────
const _cache = new Map<string, { at: number; data: unknown }>();
const _inflight = new Map<string, Promise<unknown>>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

async function fetchJson<T>(url: string): Promise<T> {
  const hit = _cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data as T;

  // Coalesce duplicate requests in-flight
  const pending = _inflight.get(url);
  if (pending) return pending as Promise<T>;

  const p = (async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather fetch failed (${res.status})`);
    const json = (await res.json()) as T;
    _cache.set(url, { at: Date.now(), data: json });
    _inflight.delete(url);
    return json;
  })();
  _inflight.set(url, p);
  return p;
}

// ── Public: 7-day forecast ─────────────────────────────────────────────────
export async function getSevenDayForecast(
  lat: number = DEFAULT_COORDS.lat,
  lon: number = DEFAULT_COORDS.lon,
): Promise<WeatherForecast> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max` +
    `&forecast_days=7` +
    `&timezone=auto`;

  const raw = await fetchJson<{
    latitude: number;
    longitude: number;
    timezone: string;
    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_sum: number[];
      precipitation_probability_max: number[];
    };
  }>(url);

  const days: DailyWeather[] = raw.daily.time.map((date, i) => ({
    date,
    condition: codeToCondition(raw.daily.weather_code[i]),
    tempMaxC: raw.daily.temperature_2m_max[i],
    tempMinC: raw.daily.temperature_2m_min[i],
    precipMm: raw.daily.precipitation_sum[i] ?? 0,
    precipProbabilityPct: raw.daily.precipitation_probability_max[i] ?? 0,
    weatherCode: raw.daily.weather_code[i],
  }));

  return {
    latitude: raw.latitude,
    longitude: raw.longitude,
    timezone: raw.timezone,
    days,
  };
}

// ── Public: historical rain since a date (for the rain-days meter) ─────────
export async function getRainSince(
  startIso: string,
  lat: number = DEFAULT_COORDS.lat,
  lon: number = DEFAULT_COORDS.lon,
): Promise<HistoricalRainSummary> {
  // Normalise to YYYY-MM-DD, ensure start is not in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startIso);
  start.setHours(0, 0, 0, 0);

  const startDate = start.toISOString().slice(0, 10);
  const endDate = today.toISOString().slice(0, 10);

  // If the range is empty (start == today), return zeros without a network call
  if (start >= today) {
    return { startDate, endDate, totalDays: 0, rainDays: 0, heavyRainDays: 0, totalPrecipMm: 0 };
  }

  // Open-Meteo's archive API returns observed daily precipitation for any past
  // date range. We query end = yesterday (today's observations aren't closed
  // yet) and let the caller pretend "since start".
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const archiveEnd = yesterday.toISOString().slice(0, 10);

  // When startDate > archiveEnd (e.g. booked today/yesterday), no observed
  // data available yet. Return zeros gracefully.
  if (startDate > archiveEnd) {
    return { startDate, endDate, totalDays: 0, rainDays: 0, heavyRainDays: 0, totalPrecipMm: 0 };
  }

  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${lat}&longitude=${lon}` +
    `&start_date=${startDate}&end_date=${archiveEnd}` +
    `&daily=precipitation_sum` +
    `&timezone=auto`;

  const raw = await fetchJson<{
    daily: { time: string[]; precipitation_sum: (number | null)[] };
  }>(url);

  const precips = raw.daily.precipitation_sum ?? [];
  const times = raw.daily.time ?? [];
  const totalDays = times.length;
  let rainDays = 0;
  let heavyRainDays = 0;
  let totalPrecipMm = 0;

  for (const mm of precips) {
    if (mm == null) continue;
    totalPrecipMm += mm;
    if (mm >= 1) rainDays++;
    if (mm >= 10) heavyRainDays++;
  }

  return {
    startDate,
    endDate: archiveEnd,
    totalDays,
    rainDays,
    heavyRainDays,
    totalPrecipMm: Math.round(totalPrecipMm * 10) / 10,
  };
}
