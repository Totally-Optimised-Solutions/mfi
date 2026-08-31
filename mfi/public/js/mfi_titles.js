// MFI titles — remove "MFI " prefix from form & list headers.
// Branch/Center/Group etc show "New Branch" not "New MFI Branch", list shows "Branch".
(function () {
	var MAP = {
		"MFI Branch": "Branch",
		"MFI Center": "Center",
		"MFI Group": "Group",
		"MFI Member": "Member",
		"MFI KYC": "KYC",
		"MFI Loan": "Loan",
		"MFI Loan Product": "Loan Product",
		"MFI Field Officer": "Field Officer",
		"MFI Area Survey": "Area Survey",
		"MFI Area Survey Household": "Household",
		"MFI Group Member": "Group Member",
		"MFI Repayment Schedule": "Repayment Schedule",
	};

	function clean(dt) {
		return MAP[dt] || dt.replace(/^MFI\s+/, "");
	}

	// Form: "New MFI Branch" -> "New Branch"
	Object.keys(MAP).forEach(function (dt) {
		var label = MAP[dt];
		frappe.ui.form.on(dt, {
			refresh: function (frm) {
				if (frm.is_new()) {
					setTimeout(function () {
						if (frm.page && frm.page.set_title) {
							frm.page.set_title(__("New {0}", [label]));
						}
						var h = document.querySelector(".page-title .title-text");
						if (h && h.textContent.indexOf("MFI ") !== -1) {
							h.textContent = h.textContent.replace(/MFI\s+/g, "");
						}
					}, 0);
				}
			},
		});

		// List: "MFI Branch" -> "Branch"
		frappe.listview_settings[dt] = frappe.listview_settings[dt] || {};
		var orig = frappe.listview_settings[dt].onload;
		frappe.listview_settings[dt].onload = function (listview) {
			if (orig) orig(listview);
			if (listview.page && listview.page.set_title) {
				listview.page.set_title(__(label));
			}
		};
	});

	// Fallback for any MFI route — clean leftover "MFI " in page title
	if (frappe.router && frappe.router.on) {
		frappe.router.on("change", function () {
			setTimeout(function () {
				var el = document.querySelector(".page-title .title-text");
				if (!el) return;
				var t = el.textContent.trim();
				if (t.indexOf("MFI ") !== -1) {
					// "New MFI Branch" -> "New Branch", "MFI Branch List" -> "Branch List"
					el.textContent = t.replace(/MFI\s+/g, "");
				}
			}, 120);
		});
	}

	// Also patch __ for these keys as last resort if translation misses
	var _orig__ = window.__;
	if (_orig__) {
		window.__ = function (txt, replace, context) {
			var out = _orig__(txt, replace, context);
			// only clean known MFI doctype strings, not arbitrary text
			if (MAP[txt]) return MAP[txt];
			if (txt && txt.indexOf("MFI ") === 0 && MAP[txt]) return MAP[txt];
			return out;
		};
		// keep format helper
		window.__._orig = _orig__;
	}
})();
