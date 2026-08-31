// MFI titles — MFI / Branch / New, list Add -> Add, titles without MFI prefix.
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

		frappe.ui.form.on(dt, {
			refresh: function (frm) {
				if (!frm.is_new()) return;
				setTimeout(function () {
					if (frm.page && frm.page.set_title) {
						frm.page.set_title(__("New"));
					}
					var h = document.querySelector(".page-title .title-text");
					if (h) {
						var t = h.textContent.trim();
						if (t === "New " + label || t.indexOf("New MFI") === 0) {
							h.textContent = "New";
						}
					}
				}, 0);
			},
		});

		frappe.listview_settings[dt] = frappe.listview_settings[dt] || {};
		var orig = frappe.listview_settings[dt].onload;
		frappe.listview_settings[dt].onload = function (listview) {
			if (orig) orig(listview);
			if (listview.page && listview.page.set_title) {
				listview.page.set_title(__(label));
			}
			// "Add Branch" -> "Add" — primary action button
			setTimeout(function () {
				var btn = listview.page && listview.page.btn_primary;
				if (!btn) btn = document.querySelector(".page-actions .btn-primary, .primary-action");
				if (!btn) return;
				var $btn = $(btn);
				// frappe sets "Add {0}" — replace with just "Add"
				var txt = $btn.text().trim();
				if (txt.indexOf("Add ") === 0) {
					// keep icon, replace label
					$btn.contents().filter(function () { return this.nodeType === 3; }).each(function () {
						this.textContent = this.textContent.replace(/Add\s+.*/, "Add");
					});
					if ($btn.text().trim() !== "Add") $btn.text("Add");
				}
			}, 80);
		};
	});

	// Generic fallback: any list view primary button "Add X" -> "Add" for MFI routes
	function cleanAddButton() {
		var path = frappe.get_route_str ? frappe.get_route_str() : "";
			if (path.indexOf("MFI") === -1 && !Object.keys(MAP).some(function (k) { return path.indexOf(encodeURIComponent(k)) !== -1; })) { return; }
		document.querySelectorAll(".page-actions .btn-primary, .primary-action, .btn-primary[data-label]").forEach(function (btn) {
			var t = btn.textContent.trim();
			if (t.indexOf("Add ") === 0) {
				// preserve icon spans, only replace text node
				btn.childNodes.forEach(function (n) {
					if (n.nodeType === 3 && n.textContent.trim().indexOf("Add ") === 0) {
						n.textContent = " Add ";
					}
				});
				if (btn.textContent.trim().indexOf("Add ") === 0) {
					btn.textContent = "Add";
				}
			}
		});
	}

	var _add = frappe.breadcrumbs && frappe.breadcrumbs.add;
	if (_add) {
		frappe.breadcrumbs.add = function (module, doctype) {
			if (doctype && MAP[doctype]) doctype = MAP[doctype];
			if (module && MAP[module]) module = MAP[module];
			return _add.call(this, module, doctype);
		};
	}

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
				cleanAddButton();
			}, 150);
		});
	}

	// Patch __("Add {0}") for MFI doctypes to return just "Add"
	var _orig__ = window.__;
	if (_orig__) {
		window.__ = function (txt, replace, context) {
			if (txt === "Add {0}" && replace && replace[0] && MAP[replace[0]]) {
				return "Add";
			}
			return _orig__(txt, replace, context);
		};
		window.__._orig = _orig__;
	}
})();
