// MFI India address — generated from country-state-city npm 3.2.1 (see /tmp/mfi-csc-out.json)
// Provides state→district/city lists; Autocomplete fields keep manual fallback anyway.
(function () {
	// prebuilt by build_mfi_address.py; keep tiny: states list not needed (options in DocType JSON)
	// This file only loads district/city suggestions via set_query. Loaded via app_include_js.

	const CSC_URL = "/assets/mfi/js/mfi_india_address.json";
	let CITY_BY_STATE = null;

	function loadJson(url) {
		return new Promise((resolve, reject) => {
			fetch(url)
				.then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
				.then(resolve, reject);
		});
	}

	function ensureData() {
		if (CITY_BY_STATE) return Promise.resolve(CITY_BY_STATE);
		return loadJson(CSC_URL).then((data) => {
			CITY_BY_STATE = data.citiesByState || {};
			return CITY_BY_STATE;
		});
	}

	function setupDocType(doctype) {
		frappe.ui.form.on(doctype, {
			refresh(frm) {
				ensureData().then(() => bind(frm));
			},
			state(frm) {
				bind(frm);
			},
		});

		function bind(frm) {
			const stateVal = frm.doc.state;
			if (!stateVal || !CITY_BY_STATE) return;
			const suggestions = CITY_BY_STATE[stateVal] || [];
			// frappe Autocomplete: options newline string shows suggestions but still allows free text
			["district", "city"].forEach((field) => {
				const df = frappe.meta.get_docfield(doctype, field, frm.docname) || frappe.meta.get_docfield(doctype, field);
				if (!df) return;
				df.options = suggestions.join("\n");
				// awesomplete picks it up on next focus; no refresh_needed for filter
			});
			// hint for pincode — 6 digits
		}
	}

	// Expose for console testing
	window._mfi_india = { ensureData, setupDocType };

	// Apply to all four address-bearing DocTypes
	["MFI Branch", "MFI Member", "MFI Center", "MFI Group"].forEach(setupDocType);
})();
