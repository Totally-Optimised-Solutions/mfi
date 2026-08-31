// MFI geo — pin + pencil polygon via Frappe's built-in Leaflet + Leaflet.draw.
// Branch/Center/Group have: location (pin) + service_area (polygon). Member has location only.
// Syncs GeoJSON [lng, lat] -> Float latitude/longitude on load/change.
(function () {
	function syncLatLng(frm, locField, latField, lngField) {
		var raw = frm.doc[locField];
		if (!raw) return;
		try {
			var gj = JSON.parse(raw);
			var feats = gj.features || [];
			for (var i = 0; i < feats.length; i++) {
				var f = feats[i];
				if (f.geometry && f.geometry.type === "Point") {
					var lng = f.geometry.coordinates[0];
					var lat = f.geometry.coordinates[1];
					if (typeof lat === "number" && typeof lng === "number") {
						frm.set_value(latField, lat);
						frm.set_value(lngField, lng);
						break;
					}
				}
			}
		} catch (e) {}
	}

	["MFI Branch", "MFI Center", "MFI Group", "MFI Member"].forEach(function (doctype) {
		frappe.ui.form.on(doctype, {
			refresh: function (frm) {
				syncLatLng(frm, "location", "latitude", "longitude");
			},
			location: function (frm) {
				syncLatLng(frm, "location", "latitude", "longitude");
			},
		});
	});
})();
