import type { GpsCoords } from '../types';

export const generateMapHtml = (lat: number, lon: number, showMarker = false): string =>
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
    #locate-btn {
      position: absolute;
      bottom: 24px;
      right: 12px;
      z-index: 1000;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid rgba(0,0,0,0.25);
      font-size: 22px;
      line-height: 36px;
      text-align: center;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <button id="locate-btn" title="Aktueller Standort">⊙</button>
  <script>
    var map = L.map('map', { center: [${lat}, ${lon}], zoom: 13 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '\\u00a9 OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    ${showMarker ? `L.marker([${lat}, ${lon}]).addTo(map);` : ''}
    map.on('moveend', function() {
      var c = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({ lat: c.lat, lon: c.lng }));
    });
    document.getElementById('locate-btn').addEventListener('click', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'requestCurrentLocation' }));
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
