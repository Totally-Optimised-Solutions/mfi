// MFI India address — state -> district -> city + India Post pincode autofill.
// Library: country-state-city (city suggestions) + india-pincode derived pincode_map.json (19.5k codes).
// Flow: state select filters district/city Autocomplete; pincode 6-digit autofills state/district/city.
// India Post API (api.postalpincode.in) as fallback if pincode not in local map. Manual fallback always allowed.
(function () {
	const CSC_URL = "/assets/mfi/js/mfi_india_address.json";
	const PIN_URL = "/assets/mfi/js/pincode_map.json";
	let CITY_BY_STATE = null;
	let PIN_MAP = null;

	function loadJson(url) {
		return fetch(url).then(function (r) {
			return r.ok ? r.json() : Promise.reject(r.statusText);
		});
	}
	function ensureData() {
		if (CITY_BY_STATE) return Promise.resolve(CITY_BY_STATE);
		return loadJson(CSC_URL).then(function (data) {
			CITY_BY_STATE = data.citiesByState || {};
			return CITY_BY_STATE;
		});
	}
	function ensurePin() {
		if (PIN_MAP) return Promise.resolve(PIN_MAP);
		return loadJson(PIN_URL).then(function (data) {
			PIN_MAP = data;
			return PIN_MAP;
		});
	}

	var STATE_TITLE = {
		"DELHI": "Delhi", "MAHARASHTRA": "Maharashtra", "BIHAR": "Bihar",
		"UTTAR PRADESH": "Uttar Pradesh", "WEST BENGAL": "West Bengal", "TAMIL NADU": "Tamil Nadu",
		"KARNATAKA": "Karnataka", "KERALA": "Kerala", "GUJARAT": "Gujarat", "RAJASTHAN": "Rajasthan",
		"MADHYA PRADESH": "Madhya Pradesh", "PUNJAB": "Punjab", "HARYANA": "Haryana", "ASSAM": "Assam",
		"ODISHA": "Odisha", "TELANGANA": "Telangana", "ANDHRA PRADESH": "Andhra Pradesh",
		"JHARKHAND": "Jharkhand", "CHHATTISGARH": "Chhattisgarh", "HIMACHAL PRADESH": "Himachal Pradesh",
		"UTTARAKHAND": "Uttarakhand", "JAMMU AND KASHMIR": "Jammu and Kashmir", "LADAKH": "Ladakh",
		"TRIPURA": "Tripura", "MEGHALAYA": "Meghalaya", "MANIPUR": "Manipur", "NAGALAND": "Nagaland",
		"MIZORAM": "Mizoram", "ARUNACHAL PRADESH": "Arunachal Pradesh", "SIKKIM": "Sikkim", "GOA": "Goa",
		"ANDAMAN AND NICOBAR ISLANDS": "Andaman and Nicobar Islands", "CHANDIGARH": "Chandigarh",
		"DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "Dadra and Nagar Haveli and Daman and Diu",
		"LAKSHADWEEP": "Lakshadweep", "PUDUCHERRY": "Puducherry",
	};
	function normalizeState(s) {
		if (!s) return s;
		var up = s.toUpperCase().trim();
		return STATE_TITLE[up] || up.split(" ").map(function (w) { return w.charAt(0) + w.slice(1).toLowerCase(); }).join(" ");
	}

	function setupDocType(doctype) {
		frappe.ui.form.on(doctype, {
			refresh: function (frm) {
				ensureData().then(function () { bindState(frm, doctype); bindDistrict(frm, doctype); });
				ensurePin();
			},
			state: function (frm) { bindState(frm, doctype); },
			district: function (frm) { bindDistrict(frm, doctype); },
			pincode: function (frm) {
				var v = (frm.doc.pincode || "").trim();
				if (v.length === 6 && /^\d{6}$/.test(v)) fillFromPincode(frm, v);
			},
		});
	}

	function bindState(frm, doctype) {
		var stateVal = frm.doc.state;
		if (!stateVal || !CITY_BY_STATE) return;
		// District options = all cities of state; City options also from same state pool filtered by district if set
		var pool = CITY_BY_STATE[stateVal] || [];
		var df = frappe.meta.get_docfield(doctype, "district", frm.docname) || frappe.meta.get_docfield(doctype, "district");
		if (df) df.options = pool.join("\n");
		bindDistrict(frm, doctype);
	}

	function bindDistrict(frm, doctype) {
		// After district chosen, filter city to that district's post-office cities from pincode map
		if (!PIN_MAP) return;
		var state = frm.doc.state;
		var district = frm.doc.district;
		if (!state || !district) {
			// no district filter -> full state pool
			var pool = CITY_BY_STATE && CITY_BY_STATE[state] ? CITY_BY_STATE[state] : [];
			var cdf = frappe.meta.get_docfield(doctype, "city", frm.docname) || frappe.meta.get_docfield(doctype, "city");
			if (cdf && pool.length) cdf.options = pool.join("\n");
			return;
		}
		// Collect cities for this state+district from PIN_MAP
		var cities = {};
		Object.values(PIN_MAP).forEach(function (rec) {
			if (normalizeState(rec.state).toUpperCase() === state.toUpperCase() && rec.district.toUpperCase() === district.toUpperCase()) {
				cities[rec.city] = 1;
			}
		});
		var list = Object.keys(cities).sort();
		if (!list.length && CITY_BY_STATE && CITY_BY_STATE[state]) list = CITY_BY_STATE[state];
		var cdf2 = frappe.meta.get_docfield(doctype, "city", frm.docname) || frappe.meta.get_docfield(doctype, "city");
		if (cdf2) cdf2.options = list.join("\n");
	}

	function fillFromPincode(frm, pin) {
		ensurePin().then(function () {
			var rec = PIN_MAP[pin];
			if (!rec) {
				fetch("https://api.postalpincode.in/pincode/" + pin)
					.then(function (r) { return r.json(); })
					.then(function (j) {
						var po = j && j[0] && j[0].PostOffice && j[0].PostOffice[0];
						if (!po) return;
						applyFill(frm, { state: normalizeState(po.State), district: po.District, city: po.Block && po.Block !== "NA" ? po.Block : po.Name });
					})
					.catch(function () {});
				return;
			}
			applyFill(frm, rec);
		});
	}

	function applyFill(frm, rec) {
		var needState = rec.state && (!frm.doc.state || frm.doc.state.toUpperCase() !== normalizeState(rec.state).toUpperCase());
		if (needState) frm.set_value("state", normalizeState(rec.state));
		setTimeout(function () {
			if (rec.district && !frm.doc.district) frm.set_value("district", rec.district);
		}, needState ? 350 : 80);
		setTimeout(function () {
			if (rec.city && !frm.doc.city) frm.set_value("city", rec.city);
		}, needState ? 600 : 150);
	}

	window._mfi_india = { ensureData: ensureData, ensurePin: ensurePin, fillFromPincode: fillFromPincode };
	["MFI Branch", "MFI Member", "MFI Center", "MFI Group"].forEach(setupDocType);
})();
