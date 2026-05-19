// Déclaration pour les imports CSS dynamiques (ex: maplibre-gl/dist/maplibre-gl.css)
declare module '*.css' {
  const content: Record<string, string>
  export default content
}
