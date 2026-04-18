interface WeatherData {
  temperature: number
  condition: string
  humidity: number
  location: string
}

export async function getCurrentWeather(lat?: number, lon?: number): Promise<WeatherData | null> {
  try {
    // Default to major cities if no coordinates provided
    const latitude = lat || 40.7128 // NYC default
    const longitude = lon || -74.0060

    const apiKey = process.env.OPENWEATHER_API_KEY
    if (!apiKey) {
      console.warn('OpenWeather API key not found')
      return null
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
    )

    if (!response.ok) {
      throw new Error('Weather API request failed')
    }

    const data = await response.json()
    
    return {
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].main.toLowerCase(),
      humidity: data.main.humidity,
      location: data.name
    }
  } catch (error) {
    console.error('Error fetching weather:', error)
    return null
  }
}

export function getWeatherEmoji(condition: string): string {
  const weatherEmojis: Record<string, string> = {
    clear: '☀️',
    clouds: '☁️',
    rain: '🌧️',
    drizzle: '🌦️',
    thunderstorm: '⛈️',
    snow: '❄️',
    mist: '🌫️',
    fog: '🌫️',
    haze: '🌫️',
    dust: '🌫️',
    sand: '🌫️',
    ash: '🌋',
    squall: '💨',
    tornado: '🌪️'
  }
  
  return weatherEmojis[condition] || '🌤️'
}

export function getWeatherDescription(condition: string, temperature: number): string {
  const descriptions: Record<string, (temp: number) => string> = {
    clear: (temp) => temp > 25 ? 'hot and sunny' : temp > 15 ? 'pleasant and clear' : 'cold and clear',
    clouds: (temp) => temp > 20 ? 'warm and cloudy' : 'cool and overcast',
    rain: (temp) => temp > 15 ? 'warm rain' : 'cold rain',
    snow: () => 'snowy',
    thunderstorm: () => 'stormy',
    mist: () => 'misty',
    fog: () => 'foggy'
  }
  
  const getDescription = descriptions[condition] || (() => 'unknown weather')
  return getDescription(temperature)
}
