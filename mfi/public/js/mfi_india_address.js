// MFI Branch/Center/Group/Member — India Geo Link filter chain.
// Region -> Zone -> State -> District -> City.
// Pincode autofills via local pincode_map.json; external api.postalpincode.in fallback removed
// because India Geo masters are the source of truth (Region/Zone/State/District/City).
(function () {
	const PIN_URL = "/assets/mfi/js/pincode_map.json";
	let PIN_MAP = null;
	let _pinLoading = null;
	function loadPin() {
		if (PIN_MAP) return Promise.resolve(PIN_MAP);
		if (_pinLoading) return _pinLoading;
		_pinLoading = fetch(PIN_URL).then(function (r) {
			return r.ok ? r.json() : {};
		}).then(function (data) {
			PIN_MAP = data || {};
			return PIN_MAP;
		}).catch(function () {
			PIN_MAP = {};
			return PIN_MAP;
		});
		return _pinLoading;
	}
	function setupDocType(doctype) {
		frappe.ui.form.on(doctype, {
			refresh: function (frm) {
				applyQueries(frm);
				loadPin();
			},
			region: function (frm) { clearStaleZone(frm); },
			state: function (frm) { clearStaleDistrict(frm); clearStaleCity(frm); },
			district: function (frm) { clearStaleCity(frm); },
			pincode: function (frm) {
				var v = (frm.doc.pincode || "").trim();
				if (v.length === 6 && /^\d{6}$/.test(v)) fillFromPin(frm, v);
			}
		});
	}
	function applyQueries(frm) {
		if (frm.fields_dict.zone) {
			frm.set_query("zone", function () {
				var r = frm.doc.region;
				return r ? { filters: { region: r, is_enabled: 1 } } : { filters: { is_enabled: 1 } };
			});
		}
		if (frm.fields_dict.state) {
			frm.set_query("state", function () {
				return { filters: { is_enabled: 1 } };
			});
		}
		if (frm.fields_dict.district) {
			frm.set_query("district", function () {
				var s = frm.doc.state;
				return s ? { filters: { state: s, is_enabled: 1 } } : { filters: { is_enabled: 1 } };
			});
		}
		if (frm.fields_dict.city) {
			frm.set_query("city", function () {
				var d = frm.doc.district, s = frm.doc.state;
				if (d) return { filters: { district: d, is_enabled: 1 } };
				if (s) return { filters: { state: s, is_enabled: 1 } };
				return { filters: { is_enabled: 1 } };
			});
		}
	}
	function clearStaleZone(frm) {
		if (!frm.doc.region || !frm.doc.zone) return;
		frappe.db.get_value("Zone", frm.doc.zone, "region").then(function (r) {
			if (r && r.message && r.message.region !== frm.doc.region) frm.set_value("zone", "");
		});
	}
	function clearStaleDistrict(frm) {
		if (!frm.doc.state || !frm.doc.district) return;
		frappe.db.get_value("District", frm.doc.district, "state").then(function (r) {
			if (r && r.message && r.message.state !== frm.doc.state) {
				frm.set_value("district", "");
				frm.set_value("city", "");
			}
		});
	}
	function clearStaleCity(frm) {
		if (!frm.doc.district || !frm.doc.city) return;
		frappe.db.get_value("City", frm.doc.city, "district").then(function (r) {
			if (r && r.message && r.message.district !== frm.doc.district) frm.set_value("city", "");
		});
	}
	function fillFromPin(frm, pin) {
		loadPin().then(function () {
			var rec = PIN_MAP && PIN_MAP[pin];
			if (!rec) return;
			if (rec.state && !frm.doc.state) frm.set_value("state", rec.state);
			setTimeout(function () {
				if (rec.district && !frm.doc.district) frm.set_value("district", rec.district);
			}, rec.state && !frm.doc.state ? 350 : 80);
			setTimeout(function () {
				if (rec.city && !frm.doc.city) frm.set_value("city", rec.city);
			}, rec.state && !frm.doc.state ? 600 : 150);
		});
	}
	window._mfi_india = window._mfi_india || {};
	window._mfi_india.loadPin = loadPin;
	window._mfi_india.fillFromPin = fillFromPin;
	["MFI Branch", "MFI Center", "MFI Group", "MFI Member"].forEach(setupDocType);
})();
