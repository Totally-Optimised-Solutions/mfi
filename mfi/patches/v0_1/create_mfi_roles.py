"""Create MFI roles. Idempotent — safe to re-run on migrate."""

import frappe

MFI_ROLES = [
	"MFI Admin",
	"MFI Branch Manager",
	"MFI Loan Officer",
	"MFI Collection Agent",
	"MFI Auditor",
]


def execute():
	for role_name in MFI_ROLES:
		if not frappe.db.exists("Role", role_name):
			doc = frappe.new_doc("Role")
			doc.role_name = role_name
			doc.desk_access = 1
			doc.insert(ignore_permissions=True)

	# Grant MFI Admin all MFI module access is handled via DocType permissions.
	# This patch is also wired as after_migrate in hooks.py for idempotency.
	# Re-export fixtures via bench --site tos.local export-fixtures --app mfi if roles edited via Desk.
