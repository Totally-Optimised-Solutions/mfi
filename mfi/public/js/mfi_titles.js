// MFI titles — fix double "New Branch" breadcrumb.
// Frappe set_form_breadcrumb adds "New MFI Branch" as last crumb; page title also "New Branch".
// Goal: MFI / Branch / New (single New), button "Add" not "Add Branch".
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

	// Patch __("New {0}") for MFI doctypes: return just "New" for breadcrumb
	var _orig__ = window.__;
	if (_orig__) {
		window.__ = function (txt, replace, context) {
			if (txt === "New {0}" && replace && replace[0] && MAP[replace[0]]) {
				return "New";
			}
			if (txt === "Add {0}" && replace && replace[0] && MAP[replace[0]]) {
				return "Add";
			}
			// generic MFI doctype name in any translated string -> short
			if (replace && replace[0] && MAP[replace[0]] && typeof txt === "string" && txt.indexOf("{0}") !== -1) {
				// e.g. other wrappers that use __ with doctype — keep New/Add above, else short name
				var short = MAP[replace[0]];
				if (txt === "{0}") return short;
			}
			return _orig__(txt, replace, context);
		};
		window.__._orig = _orig__;
	}

	// Also patch breadcrumbs.add: "MFI Branch" -> "Branch" so list crumb clean
	var _add = frappe.breadcrumbs && frappe.breadcrumbs.add;
	if (_add) {
		frappe.breadcrumbs.add = function (module, doctype) {
			if (doctype && MAP[doctype]) doctype = MAP[doctype];
			if (module && MAP[module]) module = MAP[module];
			return _add.call(this, module, doctype);
		};
	}

	Object.keys(MAP).forEach(function (dt) {
		var label = MAP[dt];
		frappe.listview_settings[dt] = frappe.listview_settings[dt] || {};
		var orig = frappe.listview_settings[dt].onload;
		frappe.listview_settings[dt].onload = function (listview) {
			if (orig) orig(listview);
			if (listview.page && listview.page.set_title) {
				listview.page.set_title(__(label));
			}
		};
	});

	// On form route, after breadcrumbs rendered, ensure last crumb is exactly "New" not "New Branch"
	if (frappe.router && frappe.router.on) {
		frappe.router.on("change", function () {
			setTimeout(function () {
				var crumbs = document.querySelectorAll(".navbar-breadcrumbs li, .breadcrumb-item");
				if (!crumbs.length) return;
				var last = crumbs[crumbs.length - 1];
				var t = last.textContent.trim();
				// "New Branch" or "New MFI Branch" -> "New"
				Object.keys(MAP).forEach(function (k) {
					var short = MAP[k];
					if (t === "New " + short || t === "New " + k || t === "New") {
						last.querySelector("a").textContent = "New";
					}
					// Also fix doctype crumb "MFI Branch" -> "Branch"
					if (t === k) {
						var a = last.querySelector("a");
						if (a) a.textContent = short;
					}
				});
				// Dedup: if breadcrumb is "... / New / New Branch" style, collapse
				// Find two consecutive "New" crumbs — keep one
				var texts = Array.from(crumbs).map(function (li) { return li.textContent.trim(); });
				if (texts.length >= 2) {
					var lastTxt = texts[texts.length - 1];
					var prevTxt = texts[texts.length - 2];
					if ((lastTxt === "New Branch" || lastTxt === "New MFI Branch") && prevTxt === "New") {
						last.querySelector("a").textContent = "New";
					}
					if (lastTxt === "New" && prevTxt === "New") {
						// hide duplicate (keep last)
						crumbs[crumbs.length - 2].style.display = "none";
					}
				}
				// Also clean page title duplication if any "New Branch New Branch"
				var titleEl = document.querySelector(".page-title .title-text, .page-title .title-text-form");
				if (titleEl) {
					var tt = titleEl.textContent.trim();
					if (tt === "New " + texts[texts.length - 2] || tt.indexOf("New MFI") === 0) {
						titleEl.textContent = "New";
					}
				}
			}, 180);
		});
	}
})();
