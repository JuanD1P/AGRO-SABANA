// Routes/openmeteo.js
import { Router } from 'express';
import axios from 'axios';

export const openmeteoRouter = Router();

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ymd = (d) => d.toISOString().slice(0, 10);

function parseLatLon(place) {
  const m = place?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
}

openmeteoRouter.get('/daily', async (req, res) => {
  try {
    const { place, date } = req.query;
    if (!place || !date) {
      return res.status(400).json({ error: 'Faltan parámetros: place y date (YYYY-MM-DD)' });
    }

    const asked = new Date(`${date}T00:00:00Z`);
    if (isNaN(asked)) {
      return res.status(400).json({ error: 'Fecha inválida (usa YYYY-MM-DD)' });
    }

    let lat, lon, resolvedName = place;
    const ll = parseLatLon(place);
    if (ll) {
      lat = ll.lat; lon = ll.lon; resolvedName = `${lat},${lon}`;
    } else {
      const geoUrl = 'https://geocoding-api.open-meteo.com/v1/search';
      const { data: geo } = await axios.get(geoUrl, {
        params: { name: place, count: 1, language: 'es', format: 'json' }
      });
      if (!geo?.results?.length) return res.status(404).json({ error: 'No se encontró el lugar' });
      const g = geo.results[0];
      lat = g.latitude; lon = g.longitude;
      resolvedName = `${g.name}${g.admin1 ? ', ' + g.admin1 : ''}, ${g.country_code}`;
    }

    const today = new Date(ymd(new Date()) + 'T00:00:00Z');
    const diffDays = Math.floor((asked - today) / MS_PER_DAY);

    let dataDay = null;
    let source = '';

    if (diffDays < 0) {

      source = 'archive';
      const url = 'https://archive-api.open-meteo.com/v1/era5';
      const params = {
        latitude: lat, longitude: lon,
        start_date: date, end_date: date,
        daily: [
          'temperature_2m_max','temperature_2m_min','temperature_2m_mean',
          'relative_humidity_2m_mean','precipitation_sum',
          'windspeed_10m_max','windgusts_10m_max','cloudcover_mean'
        ].join(','),
        timezone: 'auto'
      };
      const { data } = await axios.get(url, { params });
      if (!data?.daily?.time?.length) return res.status(404).json({ error: 'Sin datos para esa fecha.' });
      dataDay = {
        date: data.daily.time[0],
        temp_avg_c: data.daily.temperature_2m_mean?.[0],
        temp_min_c: data.daily.temperature_2m_min?.[0],
        temp_max_c: data.daily.temperature_2m_max?.[0],
        humidity: data.daily.relative_humidity_2m_mean?.[0],
        precip_mm: data.daily.precipitation_sum?.[0],
        wind_kph: data.daily.windspeed_10m_max?.[0] != null ? data.daily.windspeed_10m_max[0] * 3.6 : null,
        wind_gust_kph: data.daily.windgusts_10m_max?.[0] != null ? data.daily.windgusts_10m_max[0] * 3.6 : null,
        cloudcover: data.daily.cloudcover_mean?.[0]
      };

    } else if (diffDays <= 16) {
      source = 'forecast';
      const url = 'https://api.open-meteo.com/v1/forecast';
      const params = {
        latitude: lat, longitude: lon,
        start_date: date, end_date: date,
        daily: [
          'temperature_2m_max','temperature_2m_min','temperature_2m_mean',
          'relative_humidity_2m_mean','precipitation_sum',
          'windspeed_10m_max','windgusts_10m_max','cloudcover_mean'
        ].join(','),
        timezone: 'auto'
      };
      const { data } = await axios.get(url, { params });
      if (!data?.daily?.time?.length) return res.status(404).json({ error: 'Sin datos de pronóstico para esa fecha.' });
      dataDay = {
        date: data.daily.time[0],
        temp_avg_c: data.daily.temperature_2m_mean?.[0],
        temp_min_c: data.daily.temperature_2m_min?.[0],
        temp_max_c: data.daily.temperature_2m_max?.[0],
        humidity: data.daily.relative_humidity_2m_mean?.[0],
        precip_mm: data.daily.precipitation_sum?.[0],
        wind_kph: data.daily.windspeed_10m_max?.[0] != null ? data.daily.windspeed_10m_max[0] * 3.6 : null,
        wind_gust_kph: data.daily.windgusts_10m_max?.[0] != null ? data.daily.windgusts_10m_max[0] * 3.6 : null,
        cloudcover: data.daily.cloudcover_mean?.[0]
      };

    } else {
      source = 'climate';
      const url = 'https://climate-api.open-meteo.com/v1/climate';
      const month = (asked.getUTCMonth() + 1).toString().padStart(2, '0');
      const params = {
        latitude: lat, longitude: lon,
        start_year: 1991, end_year: 2020, models: 'ERA5',
        monthly: [
          'temperature_2m_mean','temperature_2m_max','temperature_2m_min',
          'relative_humidity_2m_mean','precipitation_sum',
          'windspeed_10m_mean','cloudcover_mean'
        ].join(',')
      };
      const { data } = await axios.get(url, { params });
      if (!data?.monthly?.time?.length) return res.status(404).json({ error: 'Sin climatología.' });
      const idx = data.monthly.time.findIndex((t) => t.endsWith(`-${month}`));
      if (idx === -1) return res.status(404).json({ error: 'Mes fuera de rango.' });
      dataDay = {
        date,
        note: 'Climatología mensual 1991–2020 (promedio del mes seleccionado)',
        temp_avg_c: data.monthly.temperature_2m_mean?.[idx],
        temp_min_c: data.monthly.temperature_2m_min?.[idx],
        temp_max_c: data.monthly.temperature_2m_max?.[idx],
        humidity: data.monthly.relative_humidity_2m_mean?.[idx],
        precip_mm: data.monthly.precipitation_sum?.[idx],
        wind_kph: data.monthly.windspeed_10m_mean?.[idx] != null ? data.monthly.windspeed_10m_mean[idx] * 3.6 : null,
        cloudcover: data.monthly.cloudcover_mean?.[idx]
      };
    }

    res.json({
      source, 
      location: { name: resolvedName, lat, lon },
      date: dataDay.date,
      metrics: dataDay
    });

  } catch (err) {
    const status = err?.response?.status || 500;
    const msg = err?.response?.data?.reason || err?.response?.data?.error || err.message || 'Error';
    res.status(status).json({ error: msg });
  }
});
