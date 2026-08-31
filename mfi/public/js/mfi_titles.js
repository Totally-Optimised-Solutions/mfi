// MFI titles — show "MFI / Branch / New" not "Branch / New Branch".
// Branch/Center/Group etc live under MFI module. Breadcrumb should be
// MFI -> Branch -> New (generic), not "New Branch" duplicated.
// List title -> "Branch" stays.
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

	Object.keys(MAP).forEach(function (dt) {
		var label = MAP[dt];

		// Form: frappe.breadcrumbs.add(module, doctype) uses doctype string.
		// We intercept breadcrumb add to map "MFI Branch" -> "Branch",
		// then set page title to just "New" for new docs (breadcrumb already shows Branch).
		frappe.ui.form.on(dt, {
			refresh: function (frm) {
				if (!frm.is_new()) return;
				setTimeout(function () {
					// Fix title: was "New Branch" -> make it just "New"
					// with breadcrumb MFI / Branch / New
					if (frm.page && frm.page.set_title) {
						frm.page.set_title(__("New"));
					}
					// Fallback DOM — avoid double "New Branch" if another hook already set it
					var h = document.querySelector(".page-title .title-text");
					if (h) {
						var t = h.textContent.trim();
						// "New Branch" or "New MFI Branch" -> "New"
						if (t === "New " + label || t.indexOf("New MFI") === 0) {
							h.textContent = "New";
						}
					}
				}, 0);
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

	// Breadcrumb cleaner: patch frappe.breadcrumbs.add to strip "MFI " from doctype
	var _add = frappe.breadcrumbs && frappe.breadcrumbs.add;
	if (_add) {
		frappe.breadcrumbs.add = function (module, doctype) {
			if (doctype && MAP[doctype]) doctype = MAP[doctype];
			// frappe.breadcrumbs.add can be called with (module, doctype) or (label)
			if (module && MAP[module]) module = MAP[module];
			// Normalize: module "MFI" stays, doctype "MFI Branch" -> "Branch"
			return _add.call(this, module, doctype);
		};
	}

	// Also clean any already-rendered breadcrumb "MFI Branch" -> "Branch"
	if (frappe.router && frappe.router.on) {
		frappe.router.on("change", function () {
			setTimeout(function () {
				document.querySelectorAll(".breadcrumb-item, .breadcrumb a, .page-title .title-text").forEach(function (el) {
					var t = el.textContent.trim();
					Object.keys(MAP).forEach(function (k) {
						if (t === k) el.textContent = MAP[k];
						if (t === "New " + k) el.textContent = "New";
					});
				});
			}, 150);
		});
	}
})();
