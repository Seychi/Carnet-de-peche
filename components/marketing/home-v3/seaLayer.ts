import type {
  CustomLayerInterface,
  CustomRenderMethodInput,
  Map as MapLibreMap,
} from 'maplibre-gl'

type MaplibreModule = typeof import('maplibre-gl')

// Vertex : positionne un quad (coords mercator) via la matrice de la carte (v5 :
// options.defaultProjectionData.mainMatrix). Passe les UV au fragment.
const VS = `
uniform mat4 u_matrix;
attribute vec2 a_pos;
attribute vec2 a_uv;
varying vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
}`

// Fragment : caustiques/houle animées en teal, additif et très subtil (seuls les
// sommets brillent → des éclats de lumière qui glissent sur l'eau). GLSL ES 1.00
// (compatible contexte WebGL1/2 sans #version).
const FS = `
precision highp float;
uniform float u_time;
varying vec2 v_uv;
void main() {
  vec2 uv = v_uv * 12.0;
  float t = u_time * 0.22;
  float c = sin(uv.x * 1.3 + t) * cos(uv.y * 1.6 - t * 0.8);
  c += sin((uv.x + uv.y) * 1.05 + t * 1.2) * 0.7;
  c += sin(uv.y * 2.1 - t * 0.6) * 0.4;
  c = clamp(c * 0.25 + 0.5, 0.0, 1.0);
  c = pow(c, 2.7);
  vec3 col = mix(vec3(0.04, 0.30, 0.40), vec3(0.24, 0.90, 0.78), c);
  float a = c * 0.28;
  gl_FragColor = vec4(col * a, a);
}`

/**
 * Mer WebGL du hero (sprint 34, WS-3.4) — custom layer MapLibre rendant des
 * caustiques animées DANS LE MÊME contexte GL que la carte (pas de 2e canvas).
 * Un quad couvre une bbox de mer autour du centre ; il s'aligne et dérive avec la
 * carte (matrice). `triggerRepaint()` entretient l'animation (auto-pause onglet
 * caché). N'est ajoutée QUE hors reduced-motion (cf HeroMap).
 */
export function makeSeaLayer(
  maplibre: MaplibreModule,
  center: { lat: number; lng: number },
): CustomLayerInterface {
  let program: WebGLProgram | null = null
  let buffer: WebGLBuffer | null = null
  let aPos = 0
  let aUv = 0
  let uMatrix: WebGLUniformLocation | null = null
  let uTime: WebGLUniformLocation | null = null
  let mapRef: MapLibreMap | null = null
  const start = performance.now()

  const minLng = center.lng - 1.8
  const maxLng = center.lng + 1.8
  const minLat = center.lat - 1.2
  const maxLat = center.lat + 1.2

  return {
    id: 'hero-sea',
    type: 'custom',
    renderingMode: '2d',

    onAdd(map, gl) {
      mapRef = map
      const vs = gl.createShader(gl.VERTEX_SHADER)
      const fs = gl.createShader(gl.FRAGMENT_SHADER)
      const prog = gl.createProgram()
      if (!vs || !fs || !prog) return
      gl.shaderSource(vs, VS)
      gl.compileShader(vs)
      gl.shaderSource(fs, FS)
      gl.compileShader(fs)
      gl.attachShader(prog, vs)
      gl.attachShader(prog, fs)
      gl.linkProgram(prog)
      program = prog
      aPos = gl.getAttribLocation(prog, 'a_pos')
      aUv = gl.getAttribLocation(prog, 'a_uv')
      uMatrix = gl.getUniformLocation(prog, 'u_matrix')
      uTime = gl.getUniformLocation(prog, 'u_time')

      const tl = maplibre.MercatorCoordinate.fromLngLat({ lng: minLng, lat: maxLat })
      const tr = maplibre.MercatorCoordinate.fromLngLat({ lng: maxLng, lat: maxLat })
      const bl = maplibre.MercatorCoordinate.fromLngLat({ lng: minLng, lat: minLat })
      const br = maplibre.MercatorCoordinate.fromLngLat({ lng: maxLng, lat: minLat })
      // TRIANGLE_STRIP : TL, TR, BL, BR — interleaved [x, y, u, v].
      const data = new Float32Array([
        tl.x, tl.y, 0, 0,
        tr.x, tr.y, 1, 0,
        bl.x, bl.y, 0, 1,
        br.x, br.y, 1, 1,
      ])
      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
      buffer = buf
    },

    render(gl, options: CustomRenderMethodInput) {
      if (!program) return
      gl.useProgram(program)
      gl.uniformMatrix4fv(uMatrix, false, options.defaultProjectionData.mainMatrix)
      gl.uniform1f(uTime, (performance.now() - start) / 1000)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(aPos)
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0)
      gl.enableVertexAttribArray(aUv)
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE) // additif → glow
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      mapRef?.triggerRepaint()
    },

    onRemove(_map, gl) {
      if (program) gl.deleteProgram(program)
      if (buffer) gl.deleteBuffer(buffer)
    },
  }
}
