import { createRouteContext, errorResponse, jsonWithRequestId, logRouteError, logRouteWarning } from "@/lib/observability";

const GEOCODE_API_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_API_URL = "https://api.open-meteo.com/v1/forecast";

function describeWeatherCode(code: number) {
  switch (code) {
    case 0:
      return "Clear sky";
    case 1:
    case 2:
    case 3:
      return "Partly cloudy";
    case 45:
    case 48:
      return "Foggy";
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return "Drizzle";
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
      return "Rainy";
    case 71:
    case 73:
    case 75:
    case 77:
      return "Snowy";
    case 80:
    case 81:
    case 82:
      return "Rain showers";
    case 85:
    case 86:
      return "Snow showers";
    case 95:
    case 96:
    case 99:
      return "Stormy";
    default:
      return "Weather update ready";
  }
}

export async function GET(request: Request) {
  const context = createRouteContext("/api/weather", request);
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location")?.trim();

  if (!location) {
    return errorResponse(context, 400, "Location is required.");
  }

  try {
    const geocodeUrl = new URL(GEOCODE_API_URL);
    geocodeUrl.searchParams.set("name", location);
    geocodeUrl.searchParams.set("count", "1");
    geocodeUrl.searchParams.set("language", "en");
    geocodeUrl.searchParams.set("format", "json");

    const geocodeResponse = await fetch(geocodeUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "FamilyFlowAI/1.0",
      },
    });

    if (!geocodeResponse.ok) {
      logRouteWarning(context, "Weather geocoding request failed.", { location });
      return errorResponse(context, 502, "Weather lookup failed.");
    }

    const geocodeBody = (await geocodeResponse.json()) as {
      results?: Array<{
        name: string;
        admin1?: string;
        country?: string;
        latitude: number;
        longitude: number;
      }>;
    };

    const match = geocodeBody.results?.[0];
    if (!match) {
      return errorResponse(context, 404, "We could not find that weather location.");
    }

    const forecastUrl = new URL(FORECAST_API_URL);
    forecastUrl.searchParams.set("latitude", String(match.latitude));
    forecastUrl.searchParams.set("longitude", String(match.longitude));
    forecastUrl.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m");
    forecastUrl.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
    forecastUrl.searchParams.set("temperature_unit", "fahrenheit");
    forecastUrl.searchParams.set("wind_speed_unit", "mph");
    forecastUrl.searchParams.set("forecast_days", "1");
    forecastUrl.searchParams.set("timezone", "auto");

    const forecastResponse = await fetch(forecastUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "FamilyFlowAI/1.0",
      },
    });

    if (!forecastResponse.ok) {
      logRouteWarning(context, "Weather forecast request failed.", { location });
      return errorResponse(context, 502, "Weather forecast is unavailable right now.");
    }

    const forecastBody = (await forecastResponse.json()) as {
      timezone?: string;
      current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        weather_code?: number;
        is_day?: number;
        wind_speed_10m?: number;
      };
      daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        weather_code?: number[];
      };
    };

    const weatherCode = forecastBody.current?.weather_code ?? forecastBody.daily?.weather_code?.[0] ?? 0;
    const locationLabel = [match.name, match.admin1, match.country].filter(Boolean).join(", ");

    return jsonWithRequestId(context, {
      location: {
        label: locationLabel,
        latitude: match.latitude,
        longitude: match.longitude,
        timezone: forecastBody.timezone ?? "auto",
      },
      weather: {
        summary: describeWeatherCode(weatherCode),
        temperatureF: forecastBody.current?.temperature_2m ?? null,
        feelsLikeF: forecastBody.current?.apparent_temperature ?? null,
        windMph: forecastBody.current?.wind_speed_10m ?? null,
        highF: forecastBody.daily?.temperature_2m_max?.[0] ?? null,
        lowF: forecastBody.daily?.temperature_2m_min?.[0] ?? null,
        isDay: forecastBody.current?.is_day === 1,
        date: forecastBody.daily?.time?.[0] ?? null,
        code: weatherCode,
      },
    });
  } catch (error) {
    logRouteError(context, error, { location });
    return errorResponse(context, 500, "Weather lookup failed.");
  }
}
