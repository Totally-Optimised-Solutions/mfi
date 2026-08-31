# MFI geo helpers — pin -> lat/lng + polygon GeoJSON validation.
# GeoJSON is FeatureCollection with Point (pin) and Polygon/MultiPolygon (pencil).
# Leaflet stores [lng, lat]; we store Float lat/lng for queries.
import json

import frappe


def sync_lat_lng_from_geojson(doc, loc_field="location", lat_field="latitude", lng_field="longitude"):
	raw = getattr(doc, loc_field, None)
	if not raw:
		return
	try:
		gj = json.loads(raw) if isinstance(raw, str) else raw
	except Exception:
		return
	feats = gj.get("features", []) if isinstance(gj, dict) else []
	for feat in feats:
		geom = (feat or {}).get("geometry") or {}
		if geom.get("type") == "Point":
			coords = geom.get("coordinates") or []
			if len(coords) >= 2 and isinstance(coords[0], (int, float)) and isinstance(coords[1], (int, float)):
				lng, lat = coords[0], coords[1]
				# GeoJSON is [lng, lat]
				if -90 <= lat <= 90 and -180 <= lng <= 180:
					setattr(doc, lat_field, float(lat))
					setattr(doc, lng_field, float(lng))
					return


def validate_polygon_geojson(value, field_label="Service Area"):
	if not value:
		return
	try:
		gj = json.loads(value) if isinstance(value, str) else value
	except Exception:
		frappe.throw(f"{field_label}: invalid GeoJSON")
	if not isinstance(gj, dict):
		frappe.throw(f"{field_label}: GeoJSON must be an object")
	feats = gj.get("features", [])
	if not feats:
		return
	for feat in feats:
		geom = (feat or {}).get("geometry") or {}
		gtype = geom.get("type")
		if gtype not in ("Point", "Polygon", "MultiPolygon", "LineString", "MultiLineString", "Circle", "Rectangle"):
			continue
		if gtype in ("Polygon", "MultiPolygon"):
			coords = geom.get("coordinates") or []
			rings = []
			if gtype == "Polygon" and coords and isinstance(coords[0], list):
				rings = [coords[0]]
			elif gtype == "MultiPolygon":
				rings = [c[0] for c in coords if c and isinstance(c[0], list)]
			for ring in rings:
				if isinstance(ring, list) and len(ring) < 4:
					frappe.throw(f"{field_label}: polygon needs at least 4 points (closed ring)")
