import frappe

# Indian subcontinent codes present in frappe/geo/languages.csv + English
KEEP = {"en", "hi", "bn", "gu", "kn", "ml", "mr", "ta", "te", "ur"}


def execute():
	langs = frappe.get_all("Language", pluck="name")
	for code in langs:
		should_enable = 1 if code in KEEP else 0
		doc = frappe.get_doc("Language", code)
		if int(doc.enabled or 0) != should_enable:
			doc.enabled = should_enable
			doc.save(ignore_permissions=True)
	# Ensure missing Indian languages from CSV exist (if bench was seeded before hi etc)
	# frappe/geo/languages.csv has them but migration inserts only on fresh install.
	# Insert any KEEP that is missing.
	import csv
	import os

	csv_path = frappe.get_app_path("frappe", "geo", "languages.csv")
	if os.path.exists(csv_path):
		with open(csv_path, encoding="utf-8") as f:
			reader = csv.DictReader(f)
			for row in reader:
				code = (row.get("language_code") or "").strip()
				if code in KEEP and code not in langs:
					name = (row.get("language_name") or code).strip()
					doc = frappe.get_doc({"doctype": "Language", "language_code": code, "language_name": name, "enabled": 1})
					doc.insert(ignore_permissions=True)
	frappe.db.commit()
