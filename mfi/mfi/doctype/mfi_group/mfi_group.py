import frappe
from frappe.model.document import Document

from mfi.mfi.geo_utils import sync_lat_lng_from_geojson, validate_polygon_geojson


class MFIGroup(Document):
	def validate(self):
		sync_lat_lng_from_geojson(self, "location", "latitude", "longitude")
		validate_polygon_geojson(self.service_area, "Service Area")
