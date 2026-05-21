# UltraFlex Workspace

Local-first Session 1 prototype for editing a copied UltraFlex test control file workflow with sample data.

## Run

From this folder:

```powershell
node server.mjs
```

Open:

```text
http://localhost:5174
```

## Prototype Scope

- Uses fake/sample data only.
- Supports search, filters, editing, attachment assignment, row duplication, validation summary, JSON export/import, and CSV export.
- Does not read or write real `.xlsx` files yet.
- Does not start Power Automate, send email, use SharePoint, require login, or connect to ERP/CRM.
