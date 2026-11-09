import { useEffect, useRef, useState } from "react";
import { CalendarDays, CloudRain, CloudSun, Droplets, Info, RefreshCw, Sun, Thermometer, Wind } from "lucide-react";
import type { City, Weather } from "../data";
import { fetchCityForecast, forecastDateChoices, forecastTip, isDateString, shanghaiDate, WeatherForecastError, type ForecastResult } from "../weather";
import "./weather.css";

export interface WeatherPanelProps { city: City; date: string; scenario: Weather; scenarioRequest?: number; onWeatherChange: (weather: Weather) => void; onDateChange: (date: string) => void; }
type LoadState = { key: string; status: "loading" | "ready" | "error" | "out-of-range"; result?: ForecastResult; message?: string };
const scenarios: Weather[] = ["晴天", "多云", "下雨"];
const scenarioTips: Record<Weather, string> = { 晴天: "试试晴天的出游灵感，看看哪些路线更合心意。", 多云: "用多云情景先做计划，出发前再确认实际天气。", 下雨: "雨天情景优先筛选室内活动，下雨也能好好过周末。" };
const formattedTime = (timestamp: number) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit" }).format(timestamp);

export function WeatherPanel({ city, date, scenario, scenarioRequest = 0, onWeatherChange, onDateChange }: WeatherPanelProps) {
  const [requestedMode, setMode] = useState<"live" | "scenario">("live");
  const [acceptedScenarioRequest, setAcceptedScenarioRequest] = useState(0);
  const mode = scenarioRequest !== acceptedScenarioRequest ? "scenario" : requestedMode;
  const [refresh, setRefresh] = useState(0);
  const forceNextRefresh = useRef(false);
  const [state, setState] = useState<LoadState>({ key: "", status: "loading" });
  const callback = useRef(onWeatherChange);
  callback.current = onWeatherChange;
  const latestScenarioRequest = useRef(scenarioRequest);
  latestScenarioRequest.current = scenarioRequest;
  const key = `${city}:${date}`;
  useEffect(() => {
    if (mode !== "live") return;
    const controller = new AbortController();
    const forceRefresh = forceNextRefresh.current;
    forceNextRefresh.current = false;
    setState({ key, status: "loading" });
    fetchCityForecast(city, date, { signal: controller.signal, forceRefresh }).then(result => {
      if (controller.signal.aborted || latestScenarioRequest.current !== scenarioRequest) return;
      setState({ key, status: "ready", result });
      callback.current(result.forecast.category);
    }).catch(error => {
      if (controller.signal.aborted || latestScenarioRequest.current !== scenarioRequest) return;
      setState({ key, status: error instanceof WeatherForecastError && error.code === "out-of-range" ? "out-of-range" : "error", message: error instanceof WeatherForecastError ? error.message : "天气暂时不可用，可以用情景模式继续探索。" });
    });
    return () => controller.abort();
  }, [city, date, mode, refresh, key, scenarioRequest]);
  const current = state.key === key ? state : { key, status: "loading" as const };
  const forecast = mode === "live" && current.status === "ready" ? current.result?.forecast : undefined;
  const iconWeather = forecast?.category || scenario;
  const WeatherIcon = iconWeather === "晴天" ? Sun : iconWeather === "下雨" ? CloudRain : CloudSun;
  const chooseScenario = (weather: Weather) => { setMode("scenario"); callback.current(weather); };
  const switchToLive = () => { setAcceptedScenarioRequest(scenarioRequest); setMode("live"); };
  const retry = () => { forceNextRefresh.current = true; switchToLive(); setRefresh(value => value + 1); };
  const showScenarioControls = mode === "scenario" || current.status === "error" || current.status === "out-of-range";
  return <section className="forecast-panel" aria-label="出行日期与天气">
    <div className="forecast-topline"><div className="forecast-heading"><CloudSun size={19}/><h2>出发前，看一眼天气</h2><span className={`forecast-status ${forecast ? "is-live" : ""}`}>{forecast ? "联网预报" : mode === "scenario" ? "情景演示" : current.status === "loading" ? "正在更新" : current.status === "out-of-range" ? "暂无该日预报" : "预报暂不可用"}</span></div><div className="forecast-mode" aria-label="天气来源"><button type="button" aria-pressed={mode === "live"} onClick={switchToLive}>联网预报</button><button type="button" aria-pressed={mode === "scenario"} onClick={() => setMode("scenario")}>情景体验</button></div></div>
    <div className="forecast-layout"><div className="forecast-date-group"><label htmlFor="explore-weather-date"><CalendarDays size={15}/>计划哪天出发</label><input id="explore-weather-date" type="date" value={isDateString(date) ? date : ""} min={shanghaiDate()} onChange={event => { if (isDateString(event.target.value)) onDateChange(event.target.value); }}/><div className="forecast-dates">{forecastDateChoices().map(choice => <button type="button" key={choice.date} aria-pressed={date === choice.date} onClick={() => onDateChange(choice.date)}>{choice.label}</button>)}</div></div>
      <div className="forecast-body" aria-live="polite" aria-atomic="true">
        {forecast ? <><div className="forecast-summary"><span className="forecast-weather-icon"><WeatherIcon size={31}/></span><div className="forecast-condition"><strong>{city} · {forecast.description}</strong><span>城区参考 · 全天预报</span></div><div className="forecast-temperature"><Thermometer size={17}/><strong>{Math.round(forecast.temperatureMin)}–{Math.round(forecast.temperatureMax)}°C</strong></div><div className="forecast-metric"><span><Droplets size={14}/>最高降水概率</span><strong>{forecast.precipitationProbability === null ? "暂无数据" : `${Math.round(forecast.precipitationProbability)}%`}</strong></div><div className="forecast-metric"><span><Wind size={14}/>最大风速</span><strong>{forecast.windSpeedMax === null ? "暂无数据" : `${Math.round(forecast.windSpeedMax)} km/h`}</strong></div></div><p className="forecast-tip"><Info size={14}/>{forecastTip(forecast)}</p>{[71, 73, 75, 77, 85, 86, 95, 96, 97, 99].includes(forecast.weatherCode) && <p className="forecast-category-note">雨雪或雷暴天气均按“下雨”情景筛选室内活动。</p>}</>
          : mode === "scenario" ? <div className="forecast-placeholder"><WeatherIcon size={30}/><div><strong>{city} · {scenario}情景</strong><p>{scenarioTips[scenario]}</p><span>这是体验用的天气条件，不代表实际预报。</span></div></div>
          : current.status === "loading" ? <div className="forecast-placeholder"><RefreshCw className="forecast-spin" size={25}/><div><strong>正在获取 {city} 的出行天气…</strong><p>筛选暂按“{scenario}”情景，预报返回后自动更新。</p></div></div>
          : <div className="forecast-placeholder forecast-unavailable"><CloudSun size={29}/><div><strong>{current.status === "out-of-range" ? "这一天，还没有可用预报" : "天气暂时没有连上"}</strong><p>{current.message}</p><span>当前活动筛选使用“{scenario}”情景。</span></div></div>}
        {showScenarioControls && <div className="forecast-scenarios"><span>试试不同天气</span>{scenarios.map(weather => <button type="button" key={weather} aria-pressed={mode === "scenario" && scenario === weather} onClick={() => chooseScenario(weather)}>{weather === "晴天" ? <Sun size={14}/> : weather === "下雨" ? <CloudRain size={14}/> : <CloudSun size={14}/>} {weather}</button>)}</div>}
      </div></div>
    <div className="forecast-footnote"><span>天气数据：<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · <a href="https://open-meteo.com/en/licence" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>{forecast && current.result ? ` · ${formattedTime(current.result.fetchedAt)} 获取${current.result.fromCache ? "（30 分钟内缓存）" : ""}` : " · 仅使用所选城市参考位置"}</span><button type="button" onClick={retry} disabled={mode === "live" && current.status === "loading"}><RefreshCw size={13}/>{mode === "scenario" ? "切回联网预报" : forecast ? "刷新预报" : "重新获取"}</button></div>
  </section>;
}
export default WeatherPanel;
