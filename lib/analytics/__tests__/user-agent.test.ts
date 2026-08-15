import { describe, it, expect } from 'vitest'
import { devicePropsFromUserAgent } from '../user-agent'

// Sprint 79, Bloc 0. Le funnel mobile ne pouvait pas se terminer parce que les
// événements serveur (`signup_completed`, `onboarding_finished`) arrivaient sans
// `$device_type`. Ce test verrouille le vocabulaire attendu par PostHog : si
// « Mobile » devenait « mobile » ou « phone », le filtre du funnel retomberait à
// zéro, et on relirait le résultat comme un échec produit.
describe('devicePropsFromUserAgent', () => {
  const IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  const ANDROID_PHONE =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
  const ANDROID_TABLET =
    'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  const IPAD =
    'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/604.1'
  const DESKTOP_CHROME =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  const DESKTOP_EDGE =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
  const MAC_SAFARI =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'

  it('classe un iPhone en Mobile / iOS / Safari', () => {
    expect(devicePropsFromUserAgent(IPHONE)).toEqual({
      $device_type: 'Mobile',
      $os: 'iOS',
      $browser: 'Safari',
    })
  })

  it('classe un téléphone Android en Mobile', () => {
    const props = devicePropsFromUserAgent(ANDROID_PHONE)
    expect(props?.$device_type).toBe('Mobile')
    expect(props?.$os).toBe('Android')
    expect(props?.$browser).toBe('Chrome')
  })

  it('distingue la tablette Android du téléphone (pas de jeton « Mobile »)', () => {
    expect(devicePropsFromUserAgent(ANDROID_TABLET)?.$device_type).toBe('Tablet')
  })

  it('classe un iPad en Tablet, malgré son UA qui ressemble à un Mac', () => {
    expect(devicePropsFromUserAgent(IPAD)?.$device_type).toBe('Tablet')
  })

  it('classe le desktop en Desktop', () => {
    expect(devicePropsFromUserAgent(DESKTOP_CHROME)?.$device_type).toBe('Desktop')
    expect(devicePropsFromUserAgent(MAC_SAFARI)).toEqual({
      $device_type: 'Desktop',
      $os: 'Mac OS X',
      $browser: 'Safari',
    })
  })

  it('démêle Edge de Chrome, et Chrome de Safari (leurs UA se citent l\'un l\'autre)', () => {
    expect(devicePropsFromUserAgent(DESKTOP_EDGE)?.$browser).toBe('Microsoft Edge')
    expect(devicePropsFromUserAgent(DESKTOP_CHROME)?.$browser).toBe('Chrome')
  })

  it('renvoie null sans User-Agent, plutôt qu\'un « Desktop » inventé', () => {
    expect(devicePropsFromUserAgent(null)).toBeNull()
    expect(devicePropsFromUserAgent('')).toBeNull()
    expect(devicePropsFromUserAgent(undefined)).toBeNull()
  })
})
