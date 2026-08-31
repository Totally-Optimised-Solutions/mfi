from frappe import _


def get_data():
	return [
		{
			"module_name": "MFI",
			"type": "module",
			"label": _("MFI"),
			"description": _("Microfinance Institutions — JLG/SHG, centers, lending & collections"),
			"icon": "octicon octicon-organization",
			"color": "blue",
			"link": "mfi",
		}
	]
