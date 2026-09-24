# Separate Income from Ledger

## Changes
- Remove the Income choice from the Ledger add-entry form so Ledger returns to Lent and Borrowed only.
- Add an Income item to desktop and mobile navigation.
- Add an Income page that lists only Income notebooks and opens their existing notebook details.
- Keep Home focused on Expense notebooks; creating a notebook from each page automatically uses that page’s type.
- Keep existing income notebook data and currency behavior unchanged.

## Technical details
- Reuse the current notebook list and notebook detail screens with a required Expense/Income filter.
- Add `/dashboard/income` as a protected route.
- Remove Ledger’s `income` UI and calculation branches without deleting previously stored records.
- Verify desktop and mobile navigation, notebook filtering, and the Ledger form.
