# Separate Income from Expenses

## What will change
- Create a dedicated income records table in Lovable Cloud and safely move existing records from Income notebooks into it.
- Keep Expense notebooks reading and writing expense records only; Income notebooks will read and write income records only.
- Update Income wording throughout: “Total Income”, “income entries”, “Search income”, income-specific empty states, exports, charts, and filters.
- Hide spending-focused AI analysis and receipt scanning on Income notebooks so expense-only features are not presented as income tools.
- Verify both Expense and Income flows in the preview without changing Ledger behavior.

## Technical details
- Add row-level access rules and grants for the new income table.
- Reuse the existing notebook ownership model and shared display controls while selecting the correct table by notebook type.
- Preserve existing Income notebook data during migration.
