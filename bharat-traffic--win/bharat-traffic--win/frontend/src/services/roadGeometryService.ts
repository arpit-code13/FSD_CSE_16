/**
 * Road Geometry Service (Passthrough)
 *
 * Previously fetched real road geometry from OpenStreetMap via the Overpass API.
 * Overpass is no longer used — traffic geometry now comes from HERE Traffic API
 * via the FastAPI backend.
 *
 * This module is kept as a passthrough to avoid breaking existing imports.
 * It returns the input GeoJSON unchanged.
 */

import type { RoadGeoJSONCollection } from '../data/mockGeoJSON';

/**
 * Passthrough — returns the input GeoJSON unchanged.
 * Real road geometry is now served by HERE Traffic API → FastAPI → GeoJSON.
 */
export async function fetchRoadGeometry(
  geoJSON: RoadGeoJSONCollection,
  _cityName: string,
): Promise<RoadGeoJSONCollection> {
  return geoJSON;
}
