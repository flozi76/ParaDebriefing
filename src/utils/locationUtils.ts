import type { GpsCoords } from '../types';

export const generateMapHtml = (lat: number, lon: number): string =>
  `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { center: [${lat}, ${lon}], zoom: 13 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '\\u00a9 OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    map.on('moveend', function() {
      var c = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({ lat: c.lat, lon: c.lng }));
    });
    window.ReactNativeWebView.postMessage(JSON.stringify({ lat: ${lat}, lon: ${lon} }));
  </script>
</body>
</html>`;

export const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'de', 'User-Agent': 'ParaDebriefing/1.0' } },
    );
    if (!resp.ok) throw new Error('HTTP error');
    const data = (await resp.json()) as {
      address?: {
        village?: string;
        town?: string;
        city_district?: string;
        city?: string;
        county?: string;
        state?: string;
        country?: string;
      };
      display_name?: string;
    };
    const a = data.address ?? {};
    const locality =
      a.village ?? a.town ?? a.city_district ?? a.city ?? a.county ?? a.state;
    if (locality && a.country) return `${locality}, ${a.country}`;
    if (locality) return locality;
    if (data.display_name) return data.display_name;
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
};
