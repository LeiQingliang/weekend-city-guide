import test from "node:test";
import assert from "node:assert/strict";
import { addDateDays, buildForecastUrl, categorizeWeather, fetchCityForecast, forecastDateChoices, forecastTip, normalizeForecast, shanghaiDate, WEATHER_CACHE_TTL, WeatherForecastError } from "./weather";

const fixture = () => ({ timezone: "Asia/Shanghai", daily_units: { weather_code: "wmo code", temperature_2m_max: "°C", temperature_2m_min: "°C", precipitation_probability_max: "%", wind_speed_10m_max: "km/h" }, daily: { time: ["2026-11-14", "2026-11-15"], weather_code: [2, 61], temperature_2m_max: [19.2, 16.5], temperature_2m_min: [11.1, 10], precipitation_probability_max: [20, 85] as (number | null)[], wind_speed_10m_max: [15.5, 20] as (number | null)[] } });
test("forecast preserves the selected date and rain-day decision", () => {
  const day = normalizeForecast(fixture(), "2026-11-15");
  assert.equal(day.date, "2026-11-15"); assert.equal(day.description, "小雨"); assert.equal(day.category, "下雨"); assert.equal(day.temperatureMax, 16.5); assert.equal(day.precipitationProbability, 85);
});
test("WMO codes retain indoor treatment for rain, snow and storms", () => {
  assert.equal(categorizeWeather(0), "晴天"); assert.equal(categorizeWeather(1), "晴天"); assert.equal(categorizeWeather(3), "多云"); assert.equal(categorizeWeather(45), "多云");
  for (const code of [51, 61, 71, 85, 95, 97, 99]) assert.equal(categorizeWeather(code), "下雨");
  for (const code of [4, -1, 100, NaN]) assert.throws(() => categorizeWeather(code), WeatherForecastError);
});
test("missing optional forecast metrics stay unknown rather than zero", () => {
  const data = fixture(); data.daily.precipitation_probability_max[0] = null; data.daily.wind_speed_10m_max[0] = null;
  const day = normalizeForecast(data, "2026-11-14"); assert.equal(day.precipitationProbability, null); assert.equal(day.windSpeedMax, null);
});
test("out-of-range dates and malformed calendar dates are distinct from ready data", () => {
  for (const date of ["2026-11-30", "2026-02-30", "not-a-date"]) assert.throws(() => normalizeForecast(fixture(), date), (error: unknown) => error instanceof WeatherForecastError && error.code === "out-of-range");
});
test("inconsistent arrays, wrong units and impossible numbers are rejected", () => {
  const arrays = fixture(); arrays.daily.temperature_2m_max.pop(); assert.throws(() => normalizeForecast(arrays, "2026-11-14"), WeatherForecastError);
  const units = fixture(); units.daily_units.temperature_2m_max = "°F"; assert.throws(() => normalizeForecast(units, "2026-11-14"), WeatherForecastError);
  const rain = fixture(); rain.daily.precipitation_probability_max[0] = 101; assert.throws(() => normalizeForecast(rain, "2026-11-14"), WeatherForecastError);
  const temp = fixture(); temp.daily.temperature_2m_min[0] = 30; assert.throws(() => normalizeForecast(temp, "2026-11-14"), WeatherForecastError);
  assert.throws(() => normalizeForecast({ error: true, reason: "unavailable" }, "2026-11-14"), WeatherForecastError);
});
test("city requests use verified city coordinates, 16 daily forecasts and Shanghai timezone", () => {
  const url = new URL(buildForecastUrl("杭州")); assert.equal(url.origin, "https://api.open-meteo.com"); assert.equal(url.searchParams.get("latitude"), "30.29365"); assert.equal(url.searchParams.get("longitude"), "120.16142"); assert.equal(url.searchParams.get("timezone"), "Asia/Shanghai"); assert.equal(url.searchParams.get("forecast_days"), "16"); assert.ok(url.searchParams.get("daily")?.includes("precipitation_probability_max")); assert.equal(url.searchParams.has("apikey"), false);
});
test("quick dates use China calendar dates even across UTC midnight", () => {
  const now = new Date("2026-11-13T20:00:00Z"); assert.equal(shanghaiDate(now), "2026-11-14");
  const dates = forecastDateChoices(now); assert.deepEqual(dates, [{ label: "今天", date: "2026-11-14" }, { label: "明天", date: "2026-11-15" }]);
  assert.deepEqual(forecastDateChoices(new Date("2026-11-10T01:00:00Z")).map(x => x.date), ["2026-11-10", "2026-11-11", "2026-11-14", "2026-11-15"]);
});
test("rate limiting stays an unavailable state and is not replaced by fabricated forecast", async () => {
  await assert.rejects(fetchCityForecast("上海", shanghaiDate(), { forceRefresh: true, fetchImpl: async () => new Response("{}", { status: 429 }) }), (error: unknown) => error instanceof WeatherForecastError && error.code === "rate-limit");
});
test("aborted requests cannot update a newer city selection", async () => {
  const controller = new AbortController(); controller.abort(); let called = false;
  await assert.rejects(fetchCityForecast("上海", shanghaiDate(), { signal: controller.signal, fetchImpl: async () => { called = true; return new Response("{}"); } }), (error: unknown) => error instanceof DOMException && error.name === "AbortError"); assert.equal(called, false);
});
test("conditions produce relevant preparation tips", () => {
  const rain = normalizeForecast(fixture(), "2026-11-15"); assert.match(forecastTip(rain), /雨具/);
  assert.match(forecastTip({ ...rain, weatherCode: 95 }), /雷暴/);
  assert.match(forecastTip({ ...rain, weatherCode: 71 }), /降雪/);
  assert.match(forecastTip({ ...rain, category: "晴天", weatherCode: 0, precipitationProbability: 0, windSpeedMax: 45 }), /风较大/);
});
test("forecast cache is city/date-specific, expires after 30 minutes and supports explicit refresh", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: (key: string) => storage.get(key) || null, setItem: (key: string, value: string) => storage.set(key, value) } });
  try {
    const today = shanghaiDate(), data = fixture(); data.daily.time = [today, addDateDays(today, 1)];
    let calls = 0;
    const fetchImpl: typeof fetch = async () => { calls++; return new Response(JSON.stringify(data), { status: 200 }); };
    const first = await fetchCityForecast("上海", today, { fetchImpl }); assert.equal(first.fromCache, false);
    const second = await fetchCityForecast("上海", today, { fetchImpl }); assert.equal(second.fromCache, true); assert.equal(calls, 1);
    const nextDay = await fetchCityForecast("上海", addDateDays(today, 1), { fetchImpl }); assert.equal(nextDay.fromCache, true); assert.equal(calls, 1);
    await fetchCityForecast("北京", today, { fetchImpl }); assert.equal(calls, 2);
    const key = `weekend-forecast-v1:上海:${today}`, cached = JSON.parse(storage.get(key)!); cached.fetchedAt = Date.now() - WEATHER_CACHE_TTL; storage.set(key, JSON.stringify(cached));
    const expired = await fetchCityForecast("上海", today, { fetchImpl }); assert.equal(expired.fromCache, false); assert.equal(calls, 3);
    await fetchCityForecast("上海", today, { fetchImpl, forceRefresh: true }); assert.equal(calls, 4);
    storage.set(key, "broken JSON"); await fetchCityForecast("上海", today, { fetchImpl }); assert.equal(calls, 5);
  } finally { if (previous) Object.defineProperty(globalThis, "sessionStorage", previous); else Reflect.deleteProperty(globalThis, "sessionStorage"); }
});
test("dates beyond the model horizon do not trigger a misleading network request", async () => {
  let called = false;
  await assert.rejects(fetchCityForecast("杭州", addDateDays(shanghaiDate(), 16), { fetchImpl: async () => { called = true; return new Response("{}"); } }), (error: unknown) => error instanceof WeatherForecastError && error.code === "out-of-range"); assert.equal(called, false);
});
test("offline responses are recoverable errors without synthetic weather", async () => {
  await assert.rejects(fetchCityForecast("上海", shanghaiDate(), { forceRefresh: true, fetchImpl: async () => { throw new TypeError("Failed to fetch"); } }), (error: unknown) => error instanceof WeatherForecastError && error.code === "network");
});
