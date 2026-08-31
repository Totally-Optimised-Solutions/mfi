// MFI geo — Base pin lat/long + pencil polygon (Leaflet + Leaflet.draw, bundled in Frappe).
// Branch/Center/Group: location (Point pin) -> latitude/longitude + service_area (Polygon).
// Member: location pin only.
// Leaflet.draw already enabled in frappe/form/controls/geolocation.js: polyline, polygon,
// circle, rectangle + edit/remove. This file only syncs GeoJSON Point -> Floats and
// adds read-only helpers for polygon (vertex count, rough area).
(function () {
	function syncLatLng(frm, locField, latField, lngField) {
		var raw = frm.doc[locField];
		if (!raw) {
			return;
		}
		try {
			var gj = JSON.parse(raw);
			var feats = gj.features || gj.geometries || [];
			// FeatureCollection path
			var list = gj.features ? gj.features : feats.length ? feats : [];
			for (var i = 0; i < list.length; i++) {
				var f = list[i];
				var geom = f.geometry || f;
				if (geom && geom.type === "Point" && Array.isArray(geom.coordinates)) {
					var lng = geom.coordinates[0];
					var lat = geom.coordinates[1];
					if (typeof lat === "number" && typeof lng === "number") {
						frm.set_value(latField, lat);
						frm.set_value(lngField, lng);
						break;
					}
				}
			}
		} catch (e) {}
	}

	function polygonStats(geojsonStr) {
		if (!geojsonStr) return null;
		try {
			var gj = JSON.parse(geojsonStr);
			var polys = [];
			var feats = gj.features || [];
			for (var i = 0; i < feats.length; i++) {
				var g = feats[i].geometry;
				if (!g) continue;
				if (g.type === "Polygon") polys.push(g.coordinates[0] || []);
				if (g.type === "MultiPolygon") {
					for (var k = 0; k < g.coordinates.length; k++) polys.push(g.coordinates[k][0] || []);
				}
			}
			if (!polys.length) return null;
			var vertices = polys.reduce(function (n, ring) {
				return n + ring.length;
			}, 0);
			return { polygons: polys.length, vertices: vertices };
		} catch (e) {
			return null;
		}
	}

	["MFI Branch", "MFI Center", "MFI Group"].forEach(function (doctype) {
		frappe.ui.form.on(doctype, {
			refresh: function (frm) {
				syncLatLng(frm, "location", "latitude", "longitude");
				var stats = polygonStats(frm.doc.service_area);
				if (stats && frm.fields_dict.service_area) {
					frm.fields_dict.service_area.df.description =
						"Pencil tool से polygon draw करो — " +
						stats.polygons +
						" polygon(s), " +
						stats.vertices +
						" vertices. Edit/delete pencil toolbar से।";
				}
			},
			location: function (frm) {
				syncLatLng(frm, "location", "latitude", "longitude");
			},
			service_area: function (frm) {
				var stats = polygonStats(frm.doc.service_area);
				if (stats && frm.fields_dict.service_area) {
					frm.fields_dict.service_area.df.description =
						"Pencil tool से polygon draw करो — " +
						stats.polygons +
						" polygon(s), " +
						stats.vertices +
						" vertices. Edit/delete pencil toolbar से।";
				}
			},
		});
	});

	frappe.ui.form.on("MFI Member", {
		refresh: function (frm) {
			syncLatLng(frm, "location", "latitude", "longitude");
		},
		location: function (frm) {
			syncLatLng(frm, "location", "latitude", "longitude");
		},
	});
})();
