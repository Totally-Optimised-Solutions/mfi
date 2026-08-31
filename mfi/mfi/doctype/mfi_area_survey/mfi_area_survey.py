import frappe
from frappe.model.document import Document


class MFIAreaSurvey(Document):
    def validate(self):
        self.household_count = len(self.households or [])
        self.existing_mfi_borrowings = sum(
            1 for h in (self.households or []) if (h.existing_mfi_loans or 0) > 0
        )
