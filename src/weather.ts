import type { City, Weather } from "./data";

// City reference points verified with Open-Meteo Geocoding; no device location is requested.
// API fields and WMO codes: https://open-meteo.com/en/docs
export const CITY_COORDINATES: Record<City, { latitude: number; longitude: number }> = {
  上海: { latitude: 31.22222, longitude: 121.45806 },
  杭州: { latitude: 30.29365, longitude: 120.16142 },
  北京: { latitude: 39.9075, longitude: 116.39723 },
};
export const WEATHER_CACHE_TTL = 30 * 60 * 1000;
const CACHE_PREFIX = "weekend-forecast-v1:";
const WEATHER_LABELS: Record<number, string> = {
  0: "晴朗", 1: "大部晴朗", 2: "局部多云", 3: "阴天", 45: "有雾", 48: "雾凇",
  51: "小毛毛雨", 53: "毛毛雨", 55: "较强毛毛雨", 56: "冻毛毛雨", 57: "较强冻毛毛雨",
  61: "小雨", 63: "中雨", 65: "大雨", 66: "冻雨", 67: "较强冻雨",
  71: "小雪", 73: "中雪", 75: "大雪", 77: "米雪", 80: "小阵雨", 81: "阵雨", 82: "强阵雨",
  85: "阵雪", 86: "强阵雪", 95: "雷暴", 96: "雷暴伴冰雹", 97: "强雷暴", 99: "雷暴伴强冰雹",
};
type ErrorCode = "invalid-data" | "out-of-range" | "rate-limit" | "network" | "timeout";
export class WeatherForecastError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) { super(message); this.name = "WeatherForecastError"; this.code = code; }
}
export interface DailyForecast {
  date: string;
  weatherCode: number;
  category: Weather;
  description: string;
  temperatureMin: number;
  temperatureMax: number;
  precipitationProbability: number | null;
  windSpeedMax: number | null;
}
export interface ForecastResult { forecast: DailyForecast; fetchedAt: number; fromCache: boolean; }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function isDateString(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const value = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(value.getTime()) && value.toISOString().slice(0, 10) === date;
}
export function shanghaiDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function addDateDays(date: string, count: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}
export function forecastDateChoices(now = new Date()): { label: string; date: string }[] {
  const today = shanghaiDate(now), weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const saturday = addDateDays(today, (6 - weekday + 7) % 7);
  const choices = [{ label: "今天", date: today }, { label: "明天", date: addDateDays(today, 1) }, { label: "周六", date: saturday }, { label: "周日", date: addDateDays(saturday, 1) }];
  return choices.filter((item, index) => choices.findIndex(other => other.date === item.date) === index);
}

/** The three planning categories are deliberately coarse; the panel retains the exact condition. */
export function categorizeWeather(weatherCode: number): Weather {
  if (!Number.isInteger(weatherCode) || !(weatherCode in WEATHER_LABELS)) throw new WeatherForecastError("invalid-data", "天气条件暂时无法识别，请稍后重试。");
  if (weatherCode <= 1) return "晴天";
  if (weatherCode <= 48) return "多云";
  // Snow and storms use the existing wet-weather indoor filter as well.
  return "下雨";
}

/** Validate the requested daily row only: later missing model data must not invalidate today's forecast. */
export function normalizeForecast(payload: unknown, date: string): DailyForecast {
  if (!isDateString(date)) throw new WeatherForecastError("out-of-range", "请选择一个有效的出发日期。");
  if (!record(payload) || payload.error === true || !record(payload.daily) || !record(payload.daily_units) || payload.timezone !== "Asia/Shanghai") {
    throw new WeatherForecastError("invalid-data", "天气数据暂时不完整，请稍后重试。");
  }
  const daily = payload.daily, units = payload.daily_units;
  if (units.temperature_2m_max !== "°C" || units.temperature_2m_min !== "°C" || units.wind_speed_10m_max !== "km/h" || units.precipitation_probability_max !== "%") {
    throw new WeatherForecastError("invalid-data", "天气数据的单位暂时无法识别。");
  }
  const times = daily.time;
  const fields = ["weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_probability_max", "wind_speed_10m_max"] as const;
  if (!Array.isArray(times) || !times.length || times.some(t => typeof t !== "string" || !isDateString(t)) || new Set(times).size !== times.length || fields.some(key => !Array.isArray(daily[key]) || (daily[key] as unknown[]).length !== times.length)) {
    throw new WeatherForecastError("invalid-data", "天气数据暂时不完整，请稍后重试。");
  }
  const index = times.indexOf(date);
  if (index < 0) throw new WeatherForecastError("out-of-range", "这个日期暂时没有可用预报，请选择未来 16 天内的日期，或使用天气情景。");
  const get = (key: typeof fields[number]): unknown => (daily[key] as unknown[])[index];
  const code = get("weather_code"), min = get("temperature_2m_min"), max = get("temperature_2m_max"), rain = get("precipitation_probability_max"), wind = get("wind_speed_10m_max");
  if (!finite(code) || !finite(min) || !finite(max) || min < -100 || max > 70 || min > max) throw new WeatherForecastError("invalid-data", "这一天的预报还不完整，可稍后重试或使用天气情景。");
  if ((rain !== null && (!finite(rain) || rain < 0 || rain > 100)) || (wind !== null && (!finite(wind) || wind < 0 || wind > 500))) {
    throw new WeatherForecastError("invalid-data", "天气数据暂时不完整，请稍后重试。");
  }
  return { date, weatherCode: code, category: categorizeWeather(code), description: WEATHER_LABELS[code], temperatureMin: min, temperatureMax: max, precipitationProbability: rain as number | null, windSpeedMax: wind as number | null };
}

export function buildForecastUrl(city: City): string {
  const point = CITY_COORDINATES[city];
  const params = new URLSearchParams({ latitude: String(point.latitude), longitude: String(point.longitude), daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max", timezone: "Asia/Shanghai", forecast_days: "16", temperature_unit: "celsius", wind_speed_unit: "kmh" });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}
function readCache(city: City, date: string): ForecastResult | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const cached: unknown = JSON.parse(sessionStorage.getItem(`${CACHE_PREFIX}${city}:${date}`) || "null");
    if (!record(cached) || !finite(cached.fetchedAt) || Date.now() - cached.fetchedAt < 0 || Date.now() - cached.fetchedAt >= WEATHER_CACHE_TTL || !record(cached.forecast)) return null;
    const day = cached.forecast;
    if (day.date !== date || !finite(day.weatherCode) || !finite(day.temperatureMin) || !finite(day.temperatureMax) || day.temperatureMin > day.temperatureMax || day.temperatureMin < -100 || day.temperatureMax > 70 || (day.precipitationProbability !== null && (!finite(day.precipitationProbability) || day.precipitationProbability < 0 || day.precipitationProbability > 100)) || (day.windSpeedMax !== null && (!finite(day.windSpeedMax) || day.windSpeedMax < 0 || day.windSpeedMax > 500))) return null;
    return { forecast: { date, weatherCode: day.weatherCode, category: categorizeWeather(day.weatherCode), description: WEATHER_LABELS[day.weatherCode], temperatureMin: day.temperatureMin, temperatureMax: day.temperatureMax, precipitationProbability: day.precipitationProbability as number | null, windSpeedMax: day.windSpeedMax as number | null }, fetchedAt: cached.fetchedAt, fromCache: true };
  } catch { return null; }
}
function cachePayload(city: City, payload: unknown, fetchedAt: number) {
  if (!record(payload) || !record(payload.daily) || !Array.isArray(payload.daily.time)) return;
  for (const date of payload.daily.time) {
    if (typeof date !== "string") continue;
    try { const forecast = normalizeForecast(payload, date); sessionStorage.setItem(`${CACHE_PREFIX}${city}:${date}`, JSON.stringify({ fetchedAt, forecast })); } catch { /* A missing daily row or unavailable storage must not break usable data. */ }
  }
}
export async function fetchCityForecast(city: City, date: string, options: { signal?: AbortSignal; forceRefresh?: boolean; fetchImpl?: typeof fetch } = {}): Promise<ForecastResult> {
  const today = shanghaiDate();
  if (!isDateString(date) || date < today || date > addDateDays(today, 15)) throw new WeatherForecastError("out-of-range", "联网预报覆盖今天起的 16 天。这个日期可以先用天气情景规划。");
  if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const cached = options.forceRefresh ? null : readCache(city, date);
  if (cached) return cached;
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 8000);
  try {
    const response = await (options.fetchImpl || fetch)(buildForecastUrl(city), { signal: controller.signal });
    if (response.status === 429) throw new WeatherForecastError("rate-limit", "天气服务请求较多，暂时读不到预报。稍后重试，或先用天气情景规划。");
    if (!response.ok) throw new WeatherForecastError("network", "暂时没能连接天气服务。可以重试，或先用天气情景规划。");
    const payload: unknown = await response.json();
    if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const forecast = normalizeForecast(payload, date), fetchedAt = Date.now();
    cachePayload(city, payload, fetchedAt);
    return { forecast, fetchedAt, fromCache: false };
  } catch (error) {
    if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (timedOut) throw new WeatherForecastError("timeout", "天气服务响应有点慢。可以重试，或先用天气情景规划。");
    if (error instanceof WeatherForecastError) throw error;
    throw new WeatherForecastError("network", "暂时没能连接天气服务。可以重试，或先用天气情景规划。");
  } finally { clearTimeout(timer); options.signal?.removeEventListener("abort", abort); }
}

export function forecastTip(day: DailyForecast): string {
  if (day.weatherCode >= 95) return "有雷暴可能，优先安排室内活动；出发前再查看最新预报。";
  if ([71, 73, 75, 77, 85, 86].includes(day.weatherCode)) return "可能有降雪，留意路面，优先室内活动或缩短步行。";
  if (day.windSpeedMax !== null && day.windSpeedMax >= 39) return "风较大，减少开阔地带停留，优先安排室内活动。";
  if ([45, 48].includes(day.weatherCode)) return "可能有雾，留足交通时间，不安排能见度要求高的户外路线。";
  if (day.category === "下雨" || (day.precipitationProbability !== null && day.precipitationProbability >= 60)) return "把雨具放进包里，选一处室内活动，路上留一点余量。";
  if (day.temperatureMax >= 32) return "白天偏热，穿轻便衣物、带好水，户外活动避开午间。";
  if (day.temperatureMin <= 10) return "早晚偏凉，带件外套；散步可以安排在较暖的白天。";
  if (day.temperatureMax - day.temperatureMin >= 10) return "昼夜温差较大，叠穿更方便，晚归时加一件外套。";
  return "穿舒服的鞋，带上水，把一点时间留给途中遇见的风景。";
}
