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

scheduler_events = {
	"daily": ["mfi.tasks.process_npa_classification"],
	"cron": {
		"0 6 * * *": ["mfi.tasks.send_due_reminders"],
	},
}

after_migrate = ["mfi.patches.v0_1.create_mfi_roles.execute"]
