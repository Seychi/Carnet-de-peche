import {
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle,
  CloudRain, CloudSnow, Zap, Wind, Thermometer, Droplets, Gauge,
} from 'lucide-react'
import { degreesToCompass, beaufortLabel, formatWeatherTime } from '@/lib/conditions/format'
import { wmoLabel, wmoIconName, type WeatherIconName } from '@/lib/conditions/weather-codes'
import type { SpotConditions } from '@/lib/conditions/spot-forecast'

type Props = {
  weather: SpotConditions['weather']
}

function WeatherIcon({ name, className }: { name: WeatherIconName; className?: string }) {
  const props = { size: 20, className }
  switch (name) {
    case 'Sun':          return <Sun {...props} />
    case 'CloudSun':     return <CloudSun {...props} />
    case 'CloudFog':     return <CloudFog {...props} />
    case 'CloudDrizzle': return <CloudDrizzle {...props} />
    case 'CloudRain':    return <CloudRain {...props} />
    case 'CloudSnow':    return <CloudSnow {...props} />
    case 'Zap':          return <Zap {...props} />
    default:             return <Cloud {...props} />
  }
}

function Card({
  icon, title, value, detail,
}: {
  icon: React.ReactNode
  title: string
  value: string
  detail?: string | null
}) {
  return (
    <div className="bg-white border border-sand-200 rounded-[14px] p-4">
      <div className="text-teal-500 mb-2">{icon}</div>
      <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-500">{title}</p>
      <p className="font-mono text-lg font-semibold text-navy-900 leading-tight">{value}</p>
      {detail && <p className="text-xs text-ink-500 mt-0.5 leading-snug">{detail}</p>}
    </div>
  )
}

export default function WeatherGrid({ weather }: Props) {
  const windDir   = weather.wind_direction_deg !== null ? degreesToCompass(weather.wind_direction_deg) : null
  const windBeauf = weather.wind_speed_kmh !== null ? beaufortLabel(weather.wind_speed_kmh) : null
  const iconName  = wmoIconName(weather.code)
  const sunrise   = formatWeatherTime(weather.sunrise)
  const sunset    = formatWeatherTime(weather.sunset)

  const tempRange = [
    weather.min_temp_c !== null ? `↓ ${Math.round(weather.min_temp_c)}°` : null,
    weather.max_temp_c !== null ? `↑ ${Math.round(weather.max_temp_c)}°` : null,
  ].filter(Boolean).join('  ')

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {/* Météo */}
      <Card
        icon={<WeatherIcon name={iconName} />}
        title="Météo"
        value={weather.air_temp_c !== null ? `${Math.round(weather.air_temp_c)}°C` : '—'}
        detail={[wmoLabel(weather.code), tempRange].filter(Boolean).join(' · ') || undefined}
      />

      {/* Vent */}
      <Card
        icon={<Wind size={20} />}
        title="Vent"
        value={weather.wind_speed_kmh !== null ? `${Math.round(weather.wind_speed_kmh)} km/h` : '—'}
        detail={[windDir, windBeauf].filter(Boolean).join(' · ') || undefined}
      />

      {/* Précipitations */}
      <Card
        icon={<Droplets size={20} />}
        title="Précipitations"
        value={weather.precipitation_mm !== null ? `${weather.precipitation_mm.toFixed(1)} mm` : '—'}
        detail={weather.precipitation_probability !== null
          ? `${Math.round(weather.precipitation_probability)} % de risque`
          : undefined}
      />

      {/* Pression */}
      <Card
        icon={<Gauge size={20} />}
        title="Pression"
        value={weather.pressure_hpa !== null ? `${Math.round(weather.pressure_hpa)} hPa` : '—'}
        detail={weather.cloud_cover_pct !== null
          ? `${Math.round(weather.cloud_cover_pct)} % de nébulosité`
          : undefined}
      />

      {/* Température */}
      <Card
        icon={<Thermometer size={20} />}
        title="Température"
        value={weather.air_temp_c !== null ? `${Math.round(weather.air_temp_c)}°C` : '—'}
        detail={weather.humidity_pct !== null
          ? `Humidité ${Math.round(weather.humidity_pct)} %`
          : undefined}
      />

      {/* Soleil */}
      {(sunrise || sunset) && (
        <Card
          icon={<Sun size={20} />}
          title="Ensoleillement"
          value={sunrise ? `Lever ${sunrise}` : '—'}
          detail={sunset ? `Coucher ${sunset}` : undefined}
        />
      )}
    </div>
  )
}
