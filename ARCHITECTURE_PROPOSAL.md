# DDD Architecture Proposal for Virteex ERP

The current `libs` folder contains flat libraries (`accounting`, `accounts-payable`). To support a scalable Enterprise ERP system, we propose a Domain-Driven Design (DDD) structure.

## Proposed Structure

Organize libraries by **Domain** (e.g., Inventory, Finance, Auth) and then by **Type** (Feature, Data Access, UI, Utils).

### Domains

1.  **shared**: Common utilities, UI components, and models used across multiple domains.
2.  **auth**: Authentication and authorization (login, register, guards, interceptors).
3.  **inventory**: Product management, stock levels, warehousing.
4.  **finance**: Accounting, invoicing, payments (migrating `accounting` and `accounts-payable` here).
5.  **crm**: Customer management, leads, contacts.
6.  **sales**: Orders, quotes.

### Library Types (per domain)

For each domain (e.g., `inventory`), we should have:

*   **feature**: Smart components, pages, routing. Contains the business logic for UI flows.
    *   `libs/inventory/feature-product-list`
    *   `libs/inventory/feature-stock-adjustment`
*   **data-access**: Services, state management (Ngrx/Signals), API clients.
    *   `libs/inventory/data-access`
*   **ui**: Dumb/Presentational components specific to the domain.
    *   `libs/inventory/ui-product-card`
*   **util**: Helper functions, validators, formatting logic.
    *   `libs/inventory/util`
*   **model**: Interfaces, types, DTOs (shared between frontend and backend if possible).
    *   `libs/inventory/model`

### Migration of Existing Libs

*   `libs/accounting` -> `libs/finance/feature-accounting` or `libs/finance/data-access` depending on content.
*   `libs/accounts-payable` -> `libs/finance/feature-accounts-payable`.

### Example Folder Structure

```
libs/
├── shared/
│   ├── ui/
│   ├── util/
│   └── data-access/
├── auth/
│   ├── feature-login/
│   ├── feature-register/
│   ├── data-access/
│   └── util/
├── inventory/
│   ├── feature-dashboard/
│   ├── data-access/
│   └── model/
└── finance/
    ├── feature-ledger/
    ├── feature-invoicing/
    ├── data-access/
    └── model/
```

## Next Steps

1.  Create the domain folders.
2.  Move existing logic into appropriate `finance` libraries.
3.  Enforce module boundaries with strict ESLint rules (already configured).
