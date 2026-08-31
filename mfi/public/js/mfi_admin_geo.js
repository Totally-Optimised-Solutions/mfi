// MFI admin geo — district highlight overlay on the location/service_area maps.
// CDN: https://tosin.b-cdn.net/india-geodata/v1/administrative/ (gzip, immutable) with local /assets/mfi/geo/ fallback.
// Boundary source: yashveeeeeeer/india-geodata (CC0/CC-BY), LGD_States + LGD_Districts, 36 states + 785 districts, shards by-state.
// Hierarchy relation: district.state_lgd === state.State_LGD (stcode11/State_LGD), verified shards_features_sum=785.
// Does NOT touch frappe/form/controls/geolocation.js — separate L.geoJSON overlay FeatureGroup, polled via frm.fields_dict[field].map.
(function () {
	var CDN_BASE = "https://tosin.b-cdn.net/india-geodata/v1/administrative";
	var LOCAL_BASE = "/assets/mfi/geo";
	var _cache = {}; // url -> GeoJSON

	function slugState(name) {
		return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
	}

	function fetchGeoJson(url) {
		if (_cache[url]) return Promise.resolve(_cache[url]);
		return fetch(url, { mode: "cors" }).then(function (r) {
			if (!r.ok) throw new Error(url + " " + r.status);
			return r.json();
		}).then(function (gj) {
			_cache[url] = gj;
			return gj;
		});
	}

	function withFallback(cdnUrl, localUrl) {
		return fetchGeoJson(cdnUrl).catch(function () {
			return fetchGeoJson(localUrl);
		});
	}

	function ensureStateFeature(stateName) {
		var slug = slugState(stateName);
		// Prefer full states file and filter client-side to avoid per-state before we have per-state states shard; but we have districts/by-state only.
		// For state polygon: load states.min.geojson.gz via CDN (curl validated 36 features) — fetch decompresses via Content-Encoding gzip transparently.
		var cdn = CDN_BASE + "/states.min.geojson.gz";
		var local = LOCAL_BASE + "/states.min.geojson.gz";
		return withFallback(cdn, local).then(function (fc) {
			var feat = null;
			for (var i = 0; i < (fc.features || []).length; i++) {
				var p = fc.features[i].properties || {};
				var nm = (p.STNAME || "").toUpperCase();
				if (nm === String(stateName).toUpperCase().trim()) { feat = fc.features[i]; break; }
				// also match slug
				if (slugState(p.STNAME || "") === slug) { feat = fc.features[i]; break; }
			}
			return feat ? { type: "FeatureCollection", features: [feat] } : null;
		});
	}

	function ensureDistrictFeature(stateName, districtName) {
		var slug = slugState(stateName);
		var cdn = CDN_BASE + "/districts/by-state/" + slug + ".min.geojson.gz";
		var local = LOCAL_BASE + "/districts/by-state/" + slug + ".min.geojson.gz";
		// fallback to full districts file filtered if shard missing (e.g. new UT)
		var shard = withFallback(cdn, local).catch(function () {
			return withFallback(CDN_BASE + "/districts.min.geojson.gz", LOCAL_BASE + "/districts.min.geojson.gz");
		});
		return shard.then(function (fc) {
			if (!fc || !fc.features) return null;
			var dUp = String(districtName).toUpperCase().trim();
			var feats = fc.features.filter(function (f) {
				var p = f.properties || {};
				return String(p.dtname || "").toUpperCase().trim() === dUp;
			});
			// If shard was full districts fallback, also filter by state_lgd/state
			if (!feats.length) {
				// try case-insensitive contains as last resort
				feats = fc.features.filter(function (f) {
					var p = f.properties || {};
					return String(p.dtname || "").toUpperCase().indexOf(dUp) !== -1;
				}).slice(0, 1);
			}
			return feats.length ? { type: "FeatureCollection", features: feats } : null;
		});
	}

	function getLeafletMap(frm, fieldname) {
		var ctrl = frm.fields_dict && frm.fields_dict[fieldname];
		if (!ctrl || !ctrl.map) return null;
		return ctrl.map;
	}

	function ensureOverlayGroup(frm, fieldname) {
		var key = "_mfi_geo_overlay_" + fieldname;
		if (frm[key] && frm[key]._map) return frm[key];
		var m = getLeafletMap(frm, fieldname);
		if (!m) return null;
		var g = L.featureGroup().addTo(m);
		frm[key] = g;
		return g;
	}

	function highlightOnMap(frm, fieldname, geoJson, isDistrict) {
		var m = getLeafletMap(frm, fieldname);
		var g = ensureOverlayGroup(frm, fieldname);
		if (!m || !g || !geoJson) return;
		g.clearLayers();
		var layer = L.geoJSON(geoJson, {
			style: function () {
				return isDistrict ? { color: "#1a7f37", weight: 3, fillColor: "#2da44e", fillOpacity: 0.18 } : { color: "#0969da", weight: 2, fillOpacity: 0.08 };
			}
		});
		layer.eachLayer(function (l) { g.addLayer(l); });
		try { m.fitBounds(g.getBounds(), { padding: [24, 24] }); } catch (e) {}
	}

	function tryHighlightDistrict(frm) {
		var state = frm.doc.state;
		var district = frm.doc.district;
		if (!state || !district) {
			// only state -> highlight state
			if (state) {
				ensureStateFeature(state).then(function (gj) {
					if (!gj) return;
					["location", "service_area"].forEach(function (fn) {
						if (frm.fields_dict[fn] && frm.fields_dict[fn].map) highlightOnMap(frm, fn, gj, false);
					});
				});
			}
			return;
		}
		ensureDistrictFeature(state, district).then(function (gj) {
			if (!gj) {
				ensureStateFeature(state).then(function (sgj) {
					if (!sgj) return;
					["location", "service_area"].forEach(function (fn) {
						if (frm.fields_dict[fn] && frm.fields_dict[fn].map) highlightOnMap(frm, fn, sgj, false);
					});
				});
				return;
			}
			["location", "service_area"].forEach(function (fn) {
				if (frm.fields_dict[fn] && frm.fields_dict[fn].map) highlightOnMap(frm, fn, gj, true);
			});
		});
	}

	function waitForMap(frm, fn, cb) {
		var tries = 0;
		var t = setInterval(function () {
			tries += 1;
			if (frm.fields_dict[fn] && frm.fields_dict[fn].map) {
				clearInterval(t);
				cb();
			} else if (tries > 40) clearInterval(t);
		}, 250);
	}

	["MFI Branch", "MFI Center", "MFI Group", "MFI Member"].forEach(function (doctype) {
		frappe.ui.form.on(doctype, {
			refresh: function (frm) {
				// District highlight overlay — polled, does NOT mutate editableLayers
				["location", "service_area"].forEach(function (fn) {
					if (!frm.fields_dict[fn]) return;
					waitForMap(frm, fn, function () { tryHighlightDistrict(frm); });
				});
			},
			state: function (frm) {
				setTimeout(function () { tryHighlightDistrict(frm); }, 300);
			},
			district: function (frm) {
				tryHighlightDistrict(frm);
			}
		});
	});

	window._mfi_admin_geo = { ensureStateFeature: ensureStateFeature, ensureDistrictFeature: ensureDistrictFeature, tryHighlightDistrict: tryHighlightDistrict };
})();
