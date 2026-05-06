import axios from "axios";

// ─────────────────────────────────────────────
// Helper utilities
// ─────────────────────────────────────────────

const windDirection = (deg) => {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
};

const getIrrigationAdvice = (rainProbability, humidity) => {
  if (rainProbability > 60)
    return "High chance of rain. Skip irrigation today — save water.";
  if (rainProbability > 30)
    return "Moderate rain possible. Light irrigation only if soil is dry.";
  if (humidity > 75)
    return "High humidity present. Monitor soil before irrigating.";
  return "Low rain chance. Safe to irrigate crops as needed.";
};

const getPesticideAdvice = (windSpeed, rainProbability, humidity) => {
  if (windSpeed > 8)
    return "Wind too high (>8 m/s). Do NOT spray — severe drift risk.";
  if (windSpeed > 6)
    return "High wind detected. Avoid spraying pesticides — drift risk.";
  if (rainProbability > 50)
    return "Rain likely soon. Avoid spraying — chemicals may wash off.";
  if (humidity > 90)
    return "Very high humidity. Spraying may reduce effectiveness.";
  if (windSpeed < 1)
    return "Calm conditions. Ideal for pesticide application.";
  return "Wind conditions are safe for pesticide spraying.";
};

const getDiseaseRisk = (temperature, humidity, rainProbability) => {
  // High fungal risk: warm + humid
  if (humidity > 80 && temperature >= 20 && temperature <= 32)
    return { level: "High", reason: "Warm and humid — high fungal disease risk. Inspect crops." };

  // Blight risk: cool + very wet
  if (humidity > 85 && temperature >= 10 && temperature < 20)
    return { level: "High", reason: "Cool and wet — risk of late blight. Apply preventive fungicide." };

  // Moderate risk
  if (humidity > 65 && rainProbability > 40)
    return { level: "Moderate", reason: "Elevated humidity and rain likely — monitor for signs of disease." };

  if (humidity > 70)
    return { level: "Moderate", reason: "Humidity elevated — keep monitoring crop health." };

  return { level: "Low", reason: "Weather conditions are not favorable for crop disease." };
};

const getSoilMoistureIndex = (rainProbability, humidity, rain1h = 0) => {
  // Weighted index based on recent rain, probability, and ambient humidity
  const index = Math.min(100, Math.round(
    rain1h * 35 + (rainProbability / 100) * 40 + humidity * 0.25
  ));
  if (index > 75) return { index, status: "Well saturated", advice: "No irrigation needed." };
  if (index > 45) return { index, status: "Adequate moisture", advice: "Light irrigation if needed." };
  if (index > 20) return { index, status: "Slightly dry", advice: "Schedule irrigation soon." };
  return { index, status: "Dry", advice: "Irrigate immediately." };
};

const getUVRisk = (hour) => {
  if (hour >= 10 && hour <= 14) return { level: "High", advice: "Limit direct sun exposure for workers. Wear protective gear." };
  if (hour >= 8 && hour <= 16)  return { level: "Moderate", advice: "Take breaks in shade. Stay hydrated." };
  return { level: "Low", advice: "UV exposure is low. Normal field activities are fine." };
};

const getHarvestWindow = (rainProbability, windSpeed, condition, humidity) => {
  const badConditions = ["Rain", "Drizzle", "Thunderstorm", "Snow"];
  if (badConditions.includes(condition))
    return { suitable: false, reason: `${condition} detected. Delay harvesting.` };
  if (rainProbability > 65)
    return { suitable: false, reason: "High rain probability. Avoid harvesting — crop quality may suffer." };
  if (windSpeed > 10)
    return { suitable: false, reason: "Very high winds. Harvesting equipment operation is risky." };
  if (humidity > 88)
    return { suitable: false, reason: "Excessive humidity. Crops may not be dry enough for safe harvest." };
  if (rainProbability > 35 || windSpeed > 6)
    return { suitable: "partial", reason: "Conditions are marginal. Harvest with caution and monitor closely." };
  return { suitable: true, reason: "Good conditions for harvesting. Proceed as planned." };
};

const getFrostRisk = (temperature, dewPoint) => {
  if (temperature <= 0)
    return { risk: "Active frost", advice: "Frost occurring now. Protect crops immediately." };
  if (temperature <= 3)
    return { risk: "High", advice: "Near-frost temperatures. Cover sensitive crops tonight." };
  if (temperature <= 7)
    return { risk: "Moderate", advice: "Cool night ahead. Monitor temperature-sensitive crops." };
  return { risk: "Low", advice: "No frost risk at current temperatures." };
};

// ─────────────────────────────────────────────
// @desc    Get smart farming weather insights
// @route   GET /api/weather?city=Durgapur
// @access  Public
// ─────────────────────────────────────────────

const getWeather = async (req, res) => {
  try {
    const city = req.query.city?.trim();

    if (!city) {
      return res.status(400).json({
        success: false,
        message: "City parameter is required.",
      });
    }

    const API_KEY = process.env.OPENWEATHER_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Weather API key is not configured on the server.",
      });
    }

    const baseURL = "https://api.openweathermap.org/data/2.5";
    const params  = `&appid=${API_KEY}&units=metric`;

    // Fetch current weather + 5-day forecast in parallel for speed
    const [currentRes, forecastRes] = await Promise.all([
      axios.get(`${baseURL}/weather?q=${encodeURIComponent(city)}${params}`),
      axios.get(`${baseURL}/forecast?q=${encodeURIComponent(city)}${params}`),
    ]);

    const current  = currentRes.data;
    const forecast = forecastRes.data;

    // ── Current conditions ──────────────────────────────────
    const temperature   = Math.round(current.main.temp * 10) / 10;
    const feelsLike     = Math.round(current.main.feels_like * 10) / 10;
    const tempMin       = Math.round(current.main.temp_min * 10) / 10;
    const tempMax       = Math.round(current.main.temp_max * 10) / 10;
    const humidity      = current.main.humidity;
    const pressure      = current.main.pressure;
    const windSpeed     = current.wind.speed;
    const windDeg       = current.wind.deg;
    const windGust      = current.wind.gust ?? null;
    const visibility    = current.visibility ? current.visibility / 1000 : null; // km
    const cloudiness    = current.clouds?.all ?? 0;
    const weatherMain   = current.weather[0].main;
    const weatherDesc   = current.weather[0].description;
    const weatherIcon   = current.weather[0].icon;
    const rain1h        = current.rain?.["1h"] ?? 0;
    const snow1h        = current.snow?.["1h"] ?? 0;
    const sunrise       = new Date(current.sys.sunrise * 1000).toISOString();
    const sunset        = new Date(current.sys.sunset  * 1000).toISOString();
    const currentHour   = new Date(current.dt * 1000).getHours();

    // Approximate dew point from temperature and humidity
    const dewPoint = Math.round(
      temperature - ((100 - humidity) / 5) * 10
    ) / 10;

    // ── 5-day / 40-slot forecast ─────────────────────────────
    const forecastSlots = forecast.list.map((slot) => ({
      datetime:            new Date(slot.dt * 1000).toISOString(),
      temperature:         Math.round(slot.main.temp * 10) / 10,
      feelsLike:           Math.round(slot.main.feels_like * 10) / 10,
      humidity:            slot.main.humidity,
      windSpeed:           slot.wind.speed,
      windDirection:       windDirection(slot.wind.deg),
      precipitationChance: Math.round((slot.pop ?? 0) * 100),
      rain3h:              slot.rain?.["3h"] ?? 0,
      snow3h:              slot.snow?.["3h"] ?? 0,
      condition:           slot.weather[0].main,
      description:         slot.weather[0].description,
      icon:                slot.weather[0].icon,
      cloudiness:          slot.clouds?.all ?? 0,
    }));

    // Next-3-hour rain probability for irrigation logic
    const rainProbability = forecastSlots[0]?.precipitationChance ?? 0;

    // ── Farming intelligence ─────────────────────────────────
    const irrigationAdvice = getIrrigationAdvice(rainProbability, humidity);
    const pesticideAdvice  = getPesticideAdvice(windSpeed, rainProbability, humidity);
    const diseaseRisk      = getDiseaseRisk(temperature, humidity, rainProbability);
    const soilMoisture     = getSoilMoistureIndex(rainProbability, humidity, rain1h);
    const uvRisk           = getUVRisk(currentHour);
    const harvestWindow    = getHarvestWindow(rainProbability, windSpeed, weatherMain, humidity);
    const frostRisk        = getFrostRisk(temperature, dewPoint);

    // ── Daily summary from forecast (group by date) ──────────
    const dailyMap = {};
    forecastSlots.forEach((slot) => {
      const date = slot.datetime.slice(0, 10);
      if (!dailyMap[date]) {
        dailyMap[date] = { temps: [], rainChances: [], conditions: [] };
      }
      dailyMap[date].temps.push(slot.temperature);
      dailyMap[date].rainChances.push(slot.precipitationChance);
      dailyMap[date].conditions.push(slot.condition);
    });

    const dailySummary = Object.entries(dailyMap).slice(0, 5).map(([date, d]) => ({
      date,
      tempMin:    Math.round(Math.min(...d.temps) * 10) / 10,
      tempMax:    Math.round(Math.max(...d.temps) * 10) / 10,
      maxRainChance: Math.max(...d.rainChances),
      dominantCondition: d.conditions
        .sort((a, b) =>
          d.conditions.filter(v => v === b).length -
          d.conditions.filter(v => v === a).length
        )[0],
    }));

    // ── Set cache headers for performance ───────────────────
    // Fresh for 5 min, stale-while-revalidate for 2 min
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=120");

    // ── Final response ───────────────────────────────────────
    return res.status(200).json({
      success: true,
      fetchedAt: new Date().toISOString(),
      data: {
        location: {
          city:      current.name,
          country:   current.sys.country,
          latitude:  current.coord.lat,
          longitude: current.coord.lon,
        },

        current: {
          condition:   weatherMain,
          description: weatherDesc,
          icon:        `https://openweathermap.org/img/wn/${weatherIcon}@2x.png`,
          temperature,
          feelsLike,
          tempMin,
          tempMax,
          dewPoint,
          humidity,
          pressure,
          visibility,
          cloudiness,
          rain1h,
          snow1h,
          wind: {
            speed:     windSpeed,
            direction: windDirection(windDeg),
            degrees:   windDeg,
            gust:      windGust,
          },
          sun: { sunrise, sunset },
          precipitationProbability: rainProbability,
        },

        farmingInsights: {
          irrigationAdvice,
          pesticideAdvice,
          diseaseRisk: {
            level:  diseaseRisk.level,
            reason: diseaseRisk.reason,
          },
          soilMoisture: {
            index:  soilMoisture.index,
            status: soilMoisture.status,
            advice: soilMoisture.advice,
          },
          uvRisk: {
            level:  uvRisk.level,
            advice: uvRisk.advice,
          },
          harvestWindow: {
            suitable: harvestWindow.suitable,
            reason:   harvestWindow.reason,
          },
          frostRisk: {
            risk:   frostRisk.risk,
            advice: frostRisk.advice,
          },
        },

        forecast: {
          hourly: forecastSlots,   // 40 slots × 3h = 5 days
          daily:  dailySummary,    // grouped 5-day view
        },
      },
    });
  } catch (error) {
    console.error("Weather fetch error:", error.message);

    // OpenWeather sends 404 for unknown cities
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: `City "${req.query.city}" not found. Check spelling or try a nearby city.`,
      });
    }

    if (error.response?.status === 401) {
      return res.status(500).json({
        success: false,
        message: "Invalid API key. Check OPENWEATHER_API_KEY in your environment.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch weather data. Please try again shortly.",
    });
  }
};

export { getWeather };