app_name = "mfi"
app_title = "MFI"
app_publisher = "Totally Optimised Solutions"
app_description = "Microfinance — JLG/SHG, center meetings, KYC, lending lifecycle, collections & GL for MFI"
app_email = "hello@totallyoptimised.com"
app_license = "mit"

fixtures = [
	{
		"dt": "Role",
		"filters": [["name", "in", ["MFI Admin", "MFI Branch Manager", "MFI Loan Officer", "MFI Collection Agent", "MFI Auditor"]]],
	},
]

app_logo_url = "/assets/mfi/images/mfi-logo.svg"
app_icon = "octicon octicon-organization"
app_color = "blue"
app_home = "/app/mfi"

add_to_apps_screen = [
	{
		"name": app_name,
		"logo": app_logo_url,
		"title": app_title,
		"route": app_home,
		"has_permission": "frappe.permissions.check_app_permission",
	}
]

app_include_js = [
	"/assets/mfi/js/mfi_india_address.js",
	"/assets/mfi/js/mfi_geo.js",
	"/assets/mfi/js/mfi_titles.js",
]

after_migrate = ["mfi.patches.v0_1.create_mfi_roles.execute"]
