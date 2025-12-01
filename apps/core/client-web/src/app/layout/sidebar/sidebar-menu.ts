// Generated full sidebar menu with all required routes.
// Structure preserved from the original file.

export interface SidebarSubItem {
  path: string;
  translationKey: string;
}

export interface SidebarItem {
  path?: string; // Optional if it's just a group title
  translationKey: string;
  icon: string;
  isExpanded?: boolean; // To handle the state
  subItems?: SidebarSubItem[];
}

export interface SidebarGroup {
  groupTranslationKey: string;
  items: SidebarItem[];
}

export const SIDEBAR_MENU: SidebarGroup[] = [
  // 0) Global / Transversales
  {
    groupTranslationKey: 'sidebar.groups.general',
    items: [
      { path: '/app/dashboard', translationKey: 'sidebar.general.dashboard', icon: 'home' },
      { path: '/app/my-work', translationKey: 'sidebar.general.my_work', icon: 'assignment_ind' },
      { path: '/app/approvals', translationKey: 'sidebar.general.approvals', icon: 'rule' },
      { path: '/app/notifications', translationKey: 'sidebar.general.notifications', icon: 'notifications' },
      { path: '/app/global-search', translationKey: 'sidebar.general.search', icon: 'search' },
      {
        translationKey: 'sidebar.general.documents',
        icon: 'description',
        isExpanded: false,
        subItems: [
          { path: '/app/documents', translationKey: 'sidebar.general.documents_sub.all' },
          { path: '/app/documents/templates', translationKey: 'sidebar.general.documents_sub.templates' },
        ]
      },
      {
        translationKey: 'sidebar.general.etl',
        icon: 'data_object',
        isExpanded: false,
        subItems: [
          { path: '/app/etl/import', translationKey: 'sidebar.general.etl_sub.import' },
          { path: '/app/etl/export', translationKey: 'sidebar.general.etl_sub.export' },
        ]
      },
    ],
  },

  // 1) Master Data
  {
    groupTranslationKey: 'sidebar.groups.master_data',
    items: [
      { path: '/app/masters/customers', translationKey: 'sidebar.master_data.customers', icon: 'people' },
      { path: '/app/masters/suppliers', translationKey: 'sidebar.master_data.suppliers', icon: 'local_shipping' },
      { path: '/app/masters/products', translationKey: 'sidebar.master_data.products', icon: 'inventory' },
      { path: '/app/masters/price-lists', translationKey: 'sidebar.master_data.price_lists', icon: 'price_change' },
      { path: '/app/masters/taxes', translationKey: 'sidebar.master_data.taxes', icon: 'request_quote' },
      { path: '/app/masters/units-of-measure', translationKey: 'sidebar.master_data.uom', icon: 'straighten' },
      { path: '/app/masters/currencies', translationKey: 'sidebar.master_data.currencies', icon: 'payments' },
      { path: '/app/masters/banks', translationKey: 'sidebar.master_data.banks', icon: 'account_balance' },
      { path: '/app/masters/branches', translationKey: 'sidebar.master_data.branches', icon: 'store' },
      { path: '/app/masters/warehouses', translationKey: 'sidebar.master_data.warehouses', icon: 'warehouse' },
      { path: '/app/masters/payment-methods', translationKey: 'sidebar.master_data.payment_methods', icon: 'credit_card' },
      { path: '/app/masters/payment-terms', translationKey: 'sidebar.master_data.payment_terms', icon: 'history_toggle_off' },
      { path: '/app/masters/dimensions', translationKey: 'sidebar.master_data.dimensions', icon: 'view_quilt' },
      { path: '/app/masters/data-governance', translationKey: 'sidebar.master_data.data_governance', icon: 'rule_folder' },
      { path: '/app/masters/data-quality', translationKey: 'sidebar.master_data.data_quality', icon: 'task_alt' },
      { path: '/app/masters/duplicates', translationKey: 'sidebar.master_data.duplicates', icon: 'filter_none' },
    ],
  },

  // 2) Finance (GL, Treasury, AR, AP, Fixed Assets)
  {
    groupTranslationKey: 'sidebar.groups.finance',
    items: [
      // GL
      {
        translationKey: 'sidebar.finance.gl',
        icon: 'account_balance',
        isExpanded: false,
        subItems: [
          { path: '/app/accounting/journal-entries', translationKey: 'sidebar.finance.gl_sub.journal' },
          { path: '/app/accounting/books/journal', translationKey: 'sidebar.finance.gl_sub.book_journal' },
          { path: '/app/accounting/books/general-ledger', translationKey: 'sidebar.finance.gl_sub.book_gl' },
          { path: '/app/accounting/books/subledgers', translationKey: 'sidebar.finance.gl_sub.book_subledgers' },
          { path: '/app/accounting/chart-of-accounts', translationKey: 'sidebar.finance.gl_sub.coa' },
          { path: '/app/accounting/periods', translationKey: 'sidebar.finance.gl_sub.periods' },
          { path: '/app/accounting/closing/monthly', translationKey: 'sidebar.finance.gl_sub.closing_monthly' },
          { path: '/app/accounting/closing/annual', translationKey: 'sidebar.finance.gl_sub.closing_annual' },
          { path: '/app/accounting/closing/checklist', translationKey: 'sidebar.finance.gl_sub.closing_checklist' },
          { path: '/app/accounting/closing/tasks', translationKey: 'sidebar.finance.gl_sub.closing_tasks' },
          { path: '/app/accounting/reconciliations/accounts', translationKey: 'sidebar.finance.gl_sub.reconciliation_accounts' },
          { path: '/app/accounting/variance-analysis', translationKey: 'sidebar.finance.gl_sub.variance_analysis' },
          { path: '/app/accounting/multi-ledger', translationKey: 'sidebar.finance.gl_sub.multi_ledger' },
          { path: '/app/accounting/allocations', translationKey: 'sidebar.finance.gl_sub.allocations' },
          { path: '/app/accounting/intercompany/transactions', translationKey: 'sidebar.finance.gl_sub.ic_transactions' },
          { path: '/app/accounting/intercompany/reconciliation', translationKey: 'sidebar.finance.gl_sub.ic_reconciliation' },
          { path: '/app/accounting/intercompany/netting', translationKey: 'sidebar.finance.gl_sub.ic_netting' },
          { path: '/app/accounting/intercompany/billing', translationKey: 'sidebar.finance.gl_sub.ic_billing' },
          { path: '/app/accounting/consolidation/structure', translationKey: 'sidebar.finance.gl_sub.cons_structure' },
          { path: '/app/accounting/consolidation/eliminations', translationKey: 'sidebar.finance.gl_sub.cons_eliminations' },
          { path: '/app/accounting/consolidation/ownership', translationKey: 'sidebar.finance.gl_sub.cons_ownership' },
          { path: '/app/accounting/consolidation/cta', translationKey: 'sidebar.finance.gl_sub.cons_cta' },
          { path: '/app/accounting/consolidation/hyperinflation', translationKey: 'sidebar.finance.gl_sub.cons_hyperinflation' },
          { path: '/app/accounting/consolidation/ownership-changes', translationKey: 'sidebar.finance.gl_sub.cons_ownership_changes' },
          { path: '/app/accounting/multi-gaap', translationKey: 'sidebar.finance.gl_sub.multi_gaap' },
          { path: '/app/accounting/monetary-revaluation', translationKey: 'sidebar.finance.gl_sub.monetary_revaluation' },
          { path: '/app/accounting/rules-engine', translationKey: 'sidebar.finance.gl_sub.rules_engine' },
          { path: '/app/accounting/simulator', translationKey: 'sidebar.finance.gl_sub.simulator' },
          { path: '/app/accounting/audit', translationKey: 'sidebar.finance.gl_sub.audit' },
          // New (subledger & control)
          { path: '/app/accounting/reconciliation/subledger-gl', translationKey: 'sidebar.finance.gl_sub.reconciliation_subledger_gl' },
          { path: '/app/accounting/periods/subledger', translationKey: 'sidebar.finance.gl_sub.periods_subledger' },
          { path: '/app/accounting/revaluation/subledger', translationKey: 'sidebar.finance.gl_sub.revaluation_subledger' },
        ],
      },
      // Treasury
      {
        translationKey: 'sidebar.finance.treasury',
        icon: 'monetization_on',
        isExpanded: false,
        subItems: [
          { path: '/app/treasury/dashboard', translationKey: 'sidebar.finance.treasury_sub.dashboard' },
          { path: '/app/treasury/bank-accounts', translationKey: 'sidebar.finance.treasury_sub.accounts' },
          { path: '/app/treasury/reconciliation/manual', translationKey: 'sidebar.finance.treasury_sub.reconciliation_manual' },
          { path: '/app/treasury/reconciliation/auto', translationKey: 'sidebar.finance.treasury_sub.reconciliation_auto' },
          { path: '/app/treasury/bank-files', translationKey: 'sidebar.finance.treasury_sub.bank_files' },
          { path: '/app/treasury/file-adapters', translationKey: 'sidebar.finance.treasury_sub.file_adapters' },
          { path: '/app/treasury/bank-validations', translationKey: 'sidebar.finance.treasury_sub.bank_validations' },
          { path: '/app/treasury/scheduled-payments', translationKey: 'sidebar.finance.treasury_sub.scheduled_payments' },
          { path: '/app/treasury/mass-payments', translationKey: 'sidebar.finance.treasury_sub.mass_payments' },
          { path: '/app/treasury/mandates', translationKey: 'sidebar.finance.treasury_sub.mandates' },
          { path: '/app/treasury/positive-pay', translationKey: 'sidebar.finance.treasury_sub.positive_pay' },
          { path: '/app/treasury/cash-flow/actual', translationKey: 'sidebar.finance.treasury_sub.cash_flow_actual' },
          { path: '/app/treasury/cash-flow/forecast', translationKey: 'sidebar.finance.treasury_sub.cash_flow_forecast' },
          { path: '/app/treasury/forecasting', translationKey: 'sidebar.finance.treasury_sub.forecasting' },
          { path: '/app/treasury/exchange-rates', translationKey: 'sidebar.finance.treasury_sub.exchange_rates' },
          { path: '/app/treasury/cash-pooling', translationKey: 'sidebar.finance.treasury_sub.cash_pooling' },
          { path: '/app/treasury/fx-hedging', translationKey: 'sidebar.finance.treasury_sub.fx_hedging' },
          { path: '/app/treasury/derivatives', translationKey: 'sidebar.finance.treasury_sub.derivatives' },
          { path: '/app/treasury/hedge-accounting', translationKey: 'sidebar.finance.treasury_sub.hedge_accounting' },
          { path: '/app/treasury/checkbooks', translationKey: 'sidebar.finance.treasury_sub.checkbooks' },
          // Corporate
          { path: '/app/treasury/debt', translationKey: 'sidebar.finance.treasury_sub.debt' },
          { path: '/app/treasury/in-house-bank', translationKey: 'sidebar.finance.treasury_sub.in_house_bank' },
          { path: '/app/treasury/guarantees', translationKey: 'sidebar.finance.treasury_sub.guarantees' },
          { path: '/app/treasury/investments', translationKey: 'sidebar.finance.treasury_sub.investments' },
          { path: '/app/treasury/exposures', translationKey: 'sidebar.finance.treasury_sub.exposures' },
        ],
      },
      // AR
      {
        translationKey: 'sidebar.finance.ar',
        icon: 'request_quote',
        isExpanded: false,
        subItems: [
          { path: '/app/ar/dashboard', translationKey: 'sidebar.finance.ar_sub.dashboard' },
          { path: '/app/ar/invoices', translationKey: 'sidebar.finance.ar_sub.invoices' },
          { path: '/app/ar/receipts', translationKey: 'sidebar.finance.ar_sub.receipts' },
          { path: '/app/ar/credit-notes', translationKey: 'sidebar.finance.ar_sub.credit_notes' },
          { path: '/app/ar/debit-notes', translationKey: 'sidebar.finance.ar_sub.debit_notes' },
          { path: '/app/ar/cash-application', translationKey: 'sidebar.finance.ar_sub.cash_application' },
          { path: '/app/ar/dunning', translationKey: 'sidebar.finance.ar_sub.dunning' },
          { path: '/app/ar/disputes', translationKey: 'sidebar.finance.ar_sub.disputes' },
          { path: '/app/ar/customer-statements', translationKey: 'sidebar.finance.ar_sub.statements' },
          { path: '/app/ar/online-payments', translationKey: 'sidebar.finance.ar_sub.online_payments' },
          { path: '/app/ar/psp', translationKey: 'sidebar.finance.ar_sub.psp' },
          { path: '/app/ar/psp/reconciliation', translationKey: 'sidebar.finance.ar_sub.psp_reconciliation' },
          { path: '/app/ar/settings', translationKey: 'sidebar.finance.ar_sub.settings' },
          // New
          { path: '/app/ar/factoring', translationKey: 'sidebar.finance.ar_sub.factoring' },
          { path: '/app/ar/payment-plans', translationKey: 'sidebar.finance.ar_sub.payment_plans' },
          { path: '/app/ar/chargebacks', translationKey: 'sidebar.finance.ar_sub.chargebacks' },
        ],
      },
      // AP
      {
        translationKey: 'sidebar.finance.ap',
        icon: 'receipt_long',
        isExpanded: false,
        subItems: [
          { path: '/app/ap/dashboard', translationKey: 'sidebar.finance.ap_sub.dashboard' },
          { path: '/app/ap/invoices', translationKey: 'sidebar.finance.ap_sub.invoices' },
          { path: '/app/ap/credit-notes', translationKey: 'sidebar.finance.ap_sub.credit_notes' },
          { path: '/app/ap/withholdings', translationKey: 'sidebar.finance.ap_sub.withholdings' },
          { path: '/app/ap/approvals', translationKey: 'sidebar.finance.ap_sub.approvals' },
          { path: '/app/ap/ocr', translationKey: 'sidebar.finance.ap_sub.ocr' },
          { path: '/app/ap/payments', translationKey: 'sidebar.finance.ap_sub.payments' },
          { path: '/app/ap/suppliers', translationKey: 'sidebar.finance.ap_sub.suppliers' },
          { path: '/app/ap/advances', translationKey: 'sidebar.finance.ap_sub.advances' },
          { path: '/app/ap/dynamic-discounting', translationKey: 'sidebar.finance.ap_sub.dynamic_discounting' },
          { path: '/app/ap/scf-confirming', translationKey: 'sidebar.finance.ap_sub.scf_confirming' },
        ],
      },
      // Fixed Assets
      {
        translationKey: 'sidebar.finance.fixed_assets',
        icon: 'domain',
        isExpanded: false,
        subItems: [
          { path: '/app/fixed-assets/list', translationKey: 'sidebar.finance.fa_sub.list' },
          { path: '/app/fixed-assets/new', translationKey: 'sidebar.finance.fa_sub.new' },
          { path: '/app/fixed-assets/:id', translationKey: 'sidebar.finance.fa_sub.detail' },
          { path: '/app/fixed-assets/disposals', translationKey: 'sidebar.finance.fa_sub.disposals' },
          { path: '/app/fixed-assets/revaluations', translationKey: 'sidebar.finance.fa_sub.revaluations' },
          { path: '/app/fixed-assets/components', translationKey: 'sidebar.finance.fa_sub.components' },
          { path: '/app/fixed-assets/leases', translationKey: 'sidebar.finance.fa_sub.leases' },
          { path: '/app/fixed-assets/ap-integration', translationKey: 'sidebar.finance.fa_sub.ap_integration' },
          { path: '/app/fixed-assets/maintenance/plans', translationKey: 'sidebar.finance.fa_sub.maintenance_plans' },
          { path: '/app/fixed-assets/maintenance/work-orders', translationKey: 'sidebar.finance.fa_sub.maintenance_orders' },
          { path: '/app/fixed-assets/cip', translationKey: 'sidebar.finance.fa_sub.cip' },
          { path: '/app/fixed-assets/afe', translationKey: 'sidebar.finance.fa_sub.afe' },
        ],
      },
    ],
  },

  // 6–9) Operations (Sales, Purchasing, Inventory, Manufacturing, Deliveries)
  {
    groupTranslationKey: 'sidebar.groups.operations',
    items: [
      // Sales & Invoicing
      {
        translationKey: 'sidebar.operations.sales',
        icon: 'storefront',
        isExpanded: false,
        subItems: [
          { path: '/app/sales/quotes', translationKey: 'sidebar.operations.sales_sub.quotes' },
          { path: '/app/sales/orders', translationKey: 'sidebar.operations.sales_sub.orders' },
          { path: '/app/sales/returns', translationKey: 'sidebar.operations.sales_sub.returns' },
          { path: '/app/sales/credit-notes', translationKey: 'sidebar.operations.sales_sub.credit_notes' },
          { path: '/app/sales/contracts', translationKey: 'sidebar.operations.sales_sub.contracts' },
          { path: '/app/sales/cpq', translationKey: 'sidebar.operations.sales_sub.cpq' },
          { path: '/app/subscriptions', translationKey: 'sidebar.operations.sales_sub.subscriptions' },
          { path: '/app/subscriptions/usage', translationKey: 'sidebar.operations.sales_sub.subscriptions_usage' },
          { path: '/app/subscriptions/rating', translationKey: 'sidebar.operations.sales_sub.subscriptions_rating' },
          { path: '/app/pricing/lists', translationKey: 'sidebar.operations.sales_sub.pricing_lists' },
          { path: '/app/commissions', translationKey: 'sidebar.operations.sales_sub.commissions' },
          { path: '/app/invoices/list', translationKey: 'sidebar.operations.sales_sub.invoices_list' },
          { path: '/app/invoices/new', translationKey: 'sidebar.operations.sales_sub.invoices_new' },
        ],
      },
      // Purchasing
      {
        translationKey: 'sidebar.operations.purchasing',
        icon: 'shopping_cart',
        isExpanded: false,
        subItems: [
          { path: '/app/purchasing/requisitions', translationKey: 'sidebar.operations.purchasing_sub.requisitions' },
          { path: '/app/purchasing/orders', translationKey: 'sidebar.operations.purchasing_sub.orders' },
          { path: '/app/purchasing/receipts', translationKey: 'sidebar.operations.purchasing_sub.receipts' },
          { path: '/app/purchasing/contracts', translationKey: 'sidebar.operations.purchasing_sub.contracts' },
          { path: '/app/purchasing/approvals', translationKey: 'sidebar.operations.purchasing_sub.approvals' },
          { path: '/app/purchasing/3-way-match', translationKey: 'sidebar.operations.purchasing_sub.match_3way' },
          { path: '/app/purchasing/4-way-match', translationKey: 'sidebar.operations.purchasing_sub.match_4way' },
          { path: '/app/purchasing/analytics', translationKey: 'sidebar.operations.purchasing_sub.analytics' },
          { path: '/app/purchasing/returns', translationKey: 'sidebar.operations.purchasing_sub.returns' },
          // eSourcing & catalogs
          { path: '/app/purchasing/rfq', translationKey: 'sidebar.operations.purchasing_sub.rfq' },
          { path: '/app/purchasing/catalogs', translationKey: 'sidebar.operations.purchasing_sub.catalogs' },
          { path: '/app/suppliers/performance', translationKey: 'sidebar.operations.purchasing_sub.supplier_performance' },
          { path: '/app/suppliers/onboarding', translationKey: 'sidebar.operations.purchasing_sub.supplier_onboarding' },
          // Legacy generic matching kept for compatibility (optional)
          { path: '/app/purchasing/invoice-matching', translationKey: 'sidebar.operations.purchasing_sub.invoice_matching' },
        ],
      },
      // Inventory & WMS Light
      {
        translationKey: 'sidebar.operations.inventory',
        icon: 'inventory_2',
        isExpanded: false,
        subItems: [
          { path: '/app/inventory/stock', translationKey: 'sidebar.operations.inventory_sub.stock' },
          { path: '/app/inventory/movements', translationKey: 'sidebar.operations.inventory_sub.movements' },
          { path: '/app/inventory/adjustments', translationKey: 'sidebar.operations.inventory_sub.adjustments' },
          { path: '/app/inventory/transfers', translationKey: 'sidebar.operations.inventory_sub.transfers' },
          { path: '/app/inventory/locations', translationKey: 'sidebar.operations.inventory_sub.locations' },
          { path: '/app/inventory/lots-serials', translationKey: 'sidebar.operations.inventory_sub.lots_serials' },
          { path: '/app/inventory/cycle-counts', translationKey: 'sidebar.operations.inventory_sub.cycle_counts' },
          { path: '/app/inventory/picking-packing', translationKey: 'sidebar.operations.inventory_sub.picking_packing' },
          { path: '/app/inventory/shipments', translationKey: 'sidebar.operations.inventory_sub.shipments' },
          { path: '/app/inventory/costs/landed', translationKey: 'sidebar.operations.inventory_sub.costs_landed' },
          { path: '/app/inventory/kits-bom', translationKey: 'sidebar.operations.inventory_sub.kits_bom' },
          { path: '/app/inventory/reservations', translationKey: 'sidebar.operations.inventory_sub.reservations' },
          { path: '/app/inventory/planning', translationKey: 'sidebar.operations.inventory_sub.planning' },
          { path: '/app/inventory/quality', translationKey: 'sidebar.operations.inventory_sub.quality' },
          { path: '/app/inventory/quarantines', translationKey: 'sidebar.operations.inventory_sub.quarantines' },
          { path: '/app/inventory/mobile/warehouse', translationKey: 'sidebar.operations.inventory_sub.mobile_warehouse' },
          // Costing extras
          { path: '/app/inventory/costs/methods', translationKey: 'sidebar.operations.inventory_sub.costs_methods' },
          { path: '/app/inventory/costs/close', translationKey: 'sidebar.operations.inventory_sub.costs_close' },
          { path: '/app/inventory/costs/revaluations', translationKey: 'sidebar.operations.inventory_sub.costs_revaluations' },
          // (Optional legacy dashboard for compatibility)
          { path: '/app/inventory/dashboard', translationKey: 'sidebar.operations.inventory_sub.dashboard' },
        ],
      },
      // Manufacturing
      {
        translationKey: 'sidebar.operations.manufacturing',
        icon: 'precision_manufacturing',
        isExpanded: false,
        subItems: [
          { path: '/app/manufacturing/master-data', translationKey: 'sidebar.operations.manufacturing_sub.master_data' },
          { path: '/app/manufacturing/orders', translationKey: 'sidebar.operations.manufacturing_sub.orders' },
          { path: '/app/manufacturing/mrp', translationKey: 'sidebar.operations.manufacturing_sub.mrp' },
          { path: '/app/manufacturing/shop-floor', translationKey: 'sidebar.operations.manufacturing_sub.shop_floor' },
          { path: '/app/manufacturing/costing', translationKey: 'sidebar.operations.manufacturing_sub.costing' },
          { path: '/app/manufacturing/wip', translationKey: 'sidebar.operations.manufacturing_sub.wip' },
        ],
      },
      // Deliveries
      {
        translationKey: 'sidebar.operations.deliveries',
        icon: 'local_shipping',
        isExpanded: false,
        subItems: [
          { path: '/app/delivery-notes', translationKey: 'sidebar.operations.deliveries_sub.list' },
          { path: '/app/delivery-notes/new', translationKey: 'sidebar.operations.deliveries_sub.new' },
          { path: '/app/delivery-notes/:id', translationKey: 'sidebar.operations.deliveries_sub.detail' },
        ],
      },
    ],
  },

  // 11) Projects & Cost Centers (PSA)
  {
    groupTranslationKey: 'sidebar.groups.psa',
    items: [
      {
        translationKey: 'sidebar.psa.projects',
        icon: 'work',
        isExpanded: false,
        subItems: [
          { path: '/app/projects', translationKey: 'sidebar.psa.projects_sub.list' },
          { path: '/app/projects/timesheets', translationKey: 'sidebar.psa.projects_sub.timesheets' },
          { path: '/app/projects/milestones-wip', translationKey: 'sidebar.psa.projects_sub.milestones_wip' },
          { path: '/app/projects/billing', translationKey: 'sidebar.psa.projects_sub.billing' },
          { path: '/app/projects/wbs', translationKey: 'sidebar.psa.projects_sub.wbs' },
          { path: '/app/projects/budgeting', translationKey: 'sidebar.psa.projects_sub.budgeting' },
          { path: '/app/projects/resources', translationKey: 'sidebar.psa.projects_sub.resources' },
          { path: '/app/projects/capitalization', translationKey: 'sidebar.psa.projects_sub.capitalization' },
        ],
      },
      { path: '/app/cost-centers', translationKey: 'sidebar.psa.cost_centers', icon: 'balance' },
      { path: '/app/cost-allocation', translationKey: 'sidebar.psa.cost_allocation', icon: 'pie_chart' },
    ],
  },

  // 12) HR / Payroll
  {
    groupTranslationKey: 'sidebar.groups.hr',
    items: [
      { path: '/app/payroll/dashboard', translationKey: 'sidebar.hr.dashboard', icon: 'dashboard' },
      { path: '/app/payroll/process', translationKey: 'sidebar.hr.process', icon: 'play_circle' },
      { path: '/app/employees', translationKey: 'sidebar.hr.employees', icon: 'group' },
      { path: '/app/payroll/incidents', translationKey: 'sidebar.hr.incidents', icon: 'report' },
      { path: '/app/payroll/absences', translationKey: 'sidebar.hr.absences', icon: 'event_busy' },
      { path: '/app/payroll/loans', translationKey: 'sidebar.hr.loans', icon: 'account_balance_wallet' },
      { path: '/app/payroll/severance', translationKey: 'sidebar.hr.severance', icon: 'assignment_return' },
      { path: '/app/payroll/reports', translationKey: 'sidebar.hr.reports', icon: 'assessment' },
      { path: '/app/payroll/self-service', translationKey: 'sidebar.hr.self_service', icon: 'smartphone' },
    ],
  },

  // 13) Reports (Financial & BI)
  {
    groupTranslationKey: 'sidebar.groups.reports',
    items: [
      {
        translationKey: 'sidebar.reports.reporting',
        icon: 'assessment',
        isExpanded: false,
        subItems: [
          { path: '/app/reports/financial-statements', translationKey: 'sidebar.reports.reporting_sub.financial_statements' },
          { path: '/app/reports/profitability', translationKey: 'sidebar.reports.reporting_sub.profitability' },
          { path: '/app/reports/comparatives', translationKey: 'sidebar.reports.reporting_sub.comparatives' },
          { path: '/app/reports/tax', translationKey: 'sidebar.reports.reporting_sub.tax' },
          { path: '/app/reports/ar-aging', translationKey: 'sidebar.reports.reporting_sub.ar_aging' },
          { path: '/app/reports/ap-aging', translationKey: 'sidebar.reports.reporting_sub.ap_aging' },
          { path: '/app/reports/consolidated', translationKey: 'sidebar.reports.reporting_sub.consolidated' },
          { path: '/app/reports/treasury', translationKey: 'sidebar.reports.reporting_sub.treasury' },
          { path: '/app/reports/inventory', translationKey: 'sidebar.reports.reporting_sub.inventory' },
          { path: '/app/reports/assets', translationKey: 'sidebar.reports.reporting_sub.assets' },
          { path: '/app/reports/audit', translationKey: 'sidebar.reports.reporting_sub.audit' },
          { path: '/app/reports/closing', translationKey: 'sidebar.reports.reporting_sub.closing' },
          { path: '/app/reports/xbrl', translationKey: 'sidebar.reports.reporting_sub.xbrl' },
          { path: '/app/costs/analytics', translationKey: 'sidebar.reports.reporting_sub.costs_analytics' },
        ],
      },
      {
        translationKey: 'sidebar.reports.bi',
        icon: 'monitoring',
        isExpanded: false,
        subItems: [
          { path: '/app/bi/dashboards', translationKey: 'sidebar.reports.bi_sub.dashboards' },
          { path: '/app/bi/kpis', translationKey: 'sidebar.reports.bi_sub.kpis' },
        ],
      },
    ]
  },

  // 14) Tax & Compliance
  {
    groupTranslationKey: 'sidebar.groups.tax',
    items: [
      {
        translationKey: 'sidebar.tax.tax',
        icon: 'gavel',
        isExpanded: false,
        subItems: [
          { path: '/app/tax/summary', translationKey: 'sidebar.tax.sub.summary' },
          { path: '/app/tax/calendar', translationKey: 'sidebar.tax.sub.calendar' },
          { path: '/app/tax/filings', translationKey: 'sidebar.tax.sub.filings' },
          { path: '/app/tax/localizations', translationKey: 'sidebar.tax.sub.localizations' },
          { path: '/app/tax/certificates', translationKey: 'sidebar.tax.sub.certificates' },
          { path: '/app/tax/withholdings', translationKey: 'sidebar.tax.sub.withholdings' },
          { path: '/app/tax/e-invoicing', translationKey: 'sidebar.tax.sub.e_invoicing' },
          { path: '/app/tax/e-invoicing/:country', translationKey: 'sidebar.tax.sub.e_invoicing_country' },
          { path: '/app/tax/deferred', translationKey: 'sidebar.tax.sub.deferred' },
          { path: '/app/tax/reconciliation', translationKey: 'sidebar.tax.sub.reconciliation' },
          // Advanced
          { path: '/app/tax/determination-engine', translationKey: 'sidebar.tax.sub.determination_engine' },
          { path: '/app/tax/transfer-pricing', translationKey: 'sidebar.tax.sub.transfer_pricing' },
          { path: '/app/tax/cbcr', translationKey: 'sidebar.tax.sub.cbcr' },
          { path: '/app/tax/saft', translationKey: 'sidebar.tax.sub.saft' },
          { path: '/app/tax/localizations/:country', translationKey: 'sidebar.tax.sub.localizations_country' },
        ],
      },
    ],
  },

  // 15) Intelligence & Planning
  {
    groupTranslationKey: 'sidebar.groups.intelligence',
    items: [
      {
        translationKey: 'sidebar.intelligence.analytics',
        icon: 'insights',
        isExpanded: false,
        subItems: [
          { path: '/app/intelligence/dashboard', translationKey: 'sidebar.intelligence.sub.dashboard' },
          { path: '/app/intelligence/what-if', translationKey: 'sidebar.intelligence.sub.what_if' },
          { path: '/app/intelligence/kpis', translationKey: 'sidebar.intelligence.sub.kpis' },
          { path: '/app/intelligence/process-mining', translationKey: 'sidebar.intelligence.sub.process_mining' },
          { path: '/app/intelligence/semantic', translationKey: 'sidebar.intelligence.sub.semantic' },
          { path: '/app/budgets/models', translationKey: 'sidebar.intelligence.sub.budget_models' },
          { path: '/app/budgets/execution', translationKey: 'sidebar.intelligence.sub.budget_execution' },
          { path: '/app/forecasting/rolling', translationKey: 'sidebar.intelligence.sub.rolling_forecast' },
        ],
      },
    ],
  },

  // 16) Platform & Integrations
  {
    groupTranslationKey: 'sidebar.groups.platform',
    items: [
      { path: '/app/settings/integrations', translationKey: 'sidebar.platform.integrations', icon: 'hub' },
      {
        translationKey: 'sidebar.platform.api',
        icon: 'api',
        isExpanded: false,
        subItems: [
          { path: '/app/api/credentials', translationKey: 'sidebar.platform.api_sub.credentials' },
          { path: '/app/api/webhooks', translationKey: 'sidebar.platform.api_sub.webhooks' },
          { path: '/app/api/rate-limits', translationKey: 'sidebar.platform.api_sub.rate_limits' },
          { path: '/app/api/audit', translationKey: 'sidebar.platform.api_sub.audit' },
        ]
      },
      {
        translationKey: 'sidebar.platform.integrations_area',
        icon: 'sync_alt',
        isExpanded: false,
        subItems: [
          { path: '/app/integrations/edi', translationKey: 'sidebar.platform.integrations_sub.edi' },
          { path: '/app/integrations/monitoring', translationKey: 'sidebar.platform.integrations_sub.monitoring' },
          { path: '/app/integrations/reprocessing', translationKey: 'sidebar.platform.integrations_sub.reprocessing' },
        ]
      },
      {
        translationKey: 'sidebar.platform.automation',
        icon: 'automation',
        isExpanded: false,
        subItems: [
          { path: '/app/automation/ocr', translationKey: 'sidebar.platform.automation_sub.ocr' },
          { path: '/app/automation/workflows', translationKey: 'sidebar.platform.automation_sub.workflows' },
        ]
      },
      {
        translationKey: 'sidebar.platform.operations',
        icon: 'terminal',
        isExpanded: false,
        subItems: [
          { path: '/app/operations/jobs', translationKey: 'sidebar.platform.operations_sub.jobs' },
          { path: '/app/operations/logs', translationKey: 'sidebar.platform.operations_sub.logs' },
          { path: '/app/operations/archive', translationKey: 'sidebar.platform.operations_sub.archive' },
          { path: '/app/operations/transports', translationKey: 'sidebar.platform.operations_sub.transports' },
          { path: '/app/operations/environments', translationKey: 'sidebar.platform.operations_sub.environments' },
          { path: '/app/operations/apm', translationKey: 'sidebar.platform.operations_sub.apm' },
          { path: '/app/operations/feature-flags', translationKey: 'sidebar.platform.operations_sub.feature_flags' },
          { path: '/app/operations/capacity', translationKey: 'sidebar.platform.operations_sub.capacity' },
        ]
      },
      { path: '/app/data/warehouse', translationKey: 'sidebar.platform.data_warehouse', icon: 'warehouse' },
      { path: '/app/marketplace/connectors', translationKey: 'sidebar.platform.marketplace_connectors', icon: 'apps' },
    ],
  },

  // 17) Settings (General)
  {
    groupTranslationKey: 'sidebar.groups.configuration',
    items: [
      { path: '/app/settings/system', translationKey: 'sidebar.configuration.system', icon: 'tune' },
      { path: '/app/settings/accounting-accounts', translationKey: 'sidebar.configuration.accounting_accounts', icon: 'assignment' },
      { path: '/app/settings/permissions', translationKey: 'sidebar.configuration.permissions', icon: 'admin_panel_settings' },
      { path: '/app/settings/alerts', translationKey: 'sidebar.configuration.alerts', icon: 'add_alert' },
      { path: '/app/settings/email-templates', translationKey: 'sidebar.configuration.email_templates', icon: 'mail' },
      { path: '/app/settings/digital-signatures', translationKey: 'sidebar.configuration.digital_signatures', icon: 'draw' },
    ],
  },

  // 18) Users, Security & Governance
  {
    groupTranslationKey: 'sidebar.groups.security',
    items: [
      { path: '/app/users', translationKey: 'sidebar.security.users', icon: 'group' },
      { path: '/app/users/permissions', translationKey: 'sidebar.security.user_permissions', icon: 'vpn_key' },
      { path: '/app/security/sso-mfa', translationKey: 'sidebar.security.sso_mfa', icon: 'enhanced_encryption' },
      { path: '/app/security/sod', translationKey: 'sidebar.security.sod', icon: 'grid_view' },
      { path: '/app/security/policies', translationKey: 'sidebar.security.policies', icon: 'policy' },
      { path: '/app/security/dsar', translationKey: 'sidebar.security.dsar', icon: 'privacy_tip' },
      { path: '/app/security/third-party-screening', translationKey: 'sidebar.security.third_party_screening', icon: 'fact_check' },
      { path: '/app/audit', translationKey: 'sidebar.security.audit', icon: 'search' },
    ],
  },

  // 19) Portals
  {
    groupTranslationKey: 'sidebar.groups.portals',
    items: [
      { path: '/app/portals/customers', translationKey: 'sidebar.portals.customers', icon: 'person_outline' },
      { path: '/app/portals/suppliers', translationKey: 'sidebar.portals.suppliers', icon: 'local_shipping' },
      { path: '/app/portals/employees', translationKey: 'sidebar.portals.employees', icon: 'badge' },
    ],
  },

  // 20) Support & Help
  {
    groupTranslationKey: 'sidebar.groups.support',
    items: [
      { path: '/app/help', translationKey: 'sidebar.support.help', icon: 'help' },
      { path: '/app/support', translationKey: 'sidebar.support.support', icon: 'support_agent' },
      { path: '/app/support/status', translationKey: 'sidebar.support.status', icon: 'insights' },
    ],
  },

  // 21) Revenue Recognition
  {
    groupTranslationKey: 'sidebar.groups.revenue',
    items: [
      { path: '/app/revenue/performance-obligations', translationKey: 'sidebar.revenue.performance_obligations', icon: 'library_books' },
      { path: '/app/revenue/contracts', translationKey: 'sidebar.revenue.contracts', icon: 'receipt' },
      { path: '/app/revenue/schedules', translationKey: 'sidebar.revenue.schedules', icon: 'schedule' },
      { path: '/app/revenue/deferrals', translationKey: 'sidebar.revenue.deferrals', icon: 'pause_circle' },
      { path: '/app/revenue/reports', translationKey: 'sidebar.revenue.reports', icon: 'assessment' },
    ],
  },

  // 22) Expenses (T&E) & Cards
  {
    groupTranslationKey: 'sidebar.groups.expenses',
    items: [
      { path: '/app/expenses/reports', translationKey: 'sidebar.expenses.reports', icon: 'summarize' },
      { path: '/app/expenses/cards', translationKey: 'sidebar.expenses.cards', icon: 'credit_card' },
      { path: '/app/expenses/approvals', translationKey: 'sidebar.expenses.approvals', icon: 'rule' },
    ],
  },

  // 23) Organization / Multi-entity
  {
    groupTranslationKey: 'sidebar.groups.organization',
    items: [
      { path: '/app/organization/companies', translationKey: 'sidebar.organization.companies', icon: 'domain' },
    ],
  },

  // 25) Logistics / TMS & 3PL
  {
    groupTranslationKey: 'sidebar.groups.logistics',
    items: [
      { path: '/app/logistics/tms', translationKey: 'sidebar.logistics.tms', icon: 'local_shipping' },
      { path: '/app/logistics/3pl', translationKey: 'sidebar.logistics.3pl', icon: 'inventory' },
    ],
  },

  // 26) GRC
  {
    groupTranslationKey: 'sidebar.groups.grc',
    items: [
      { path: '/app/grc/risks', translationKey: 'sidebar.grc.risks', icon: 'warning' },
      { path: '/app/grc/controls', translationKey: 'sidebar.grc.controls', icon: 'tune' },
      { path: '/app/grc/certifications', translationKey: 'sidebar.grc.certifications', icon: 'verified' },
    ],
  },

  // 27) ESG
  {
    groupTranslationKey: 'sidebar.groups.esg',
    items: [
      { path: '/app/esg/data', translationKey: 'sidebar.esg.data', icon: 'bar_chart' },
      { path: '/app/esg/reports', translationKey: 'sidebar.esg.reports', icon: 'analytics' },
      { path: '/app/esg/audit', translationKey: 'sidebar.esg.audit', icon: 'search' },
    ],
  },

  // 28) Data & Data Governance
  {
    groupTranslationKey: 'sidebar.groups.data',
    items: [
      { path: '/app/data/catalog', translationKey: 'sidebar.data.catalog', icon: 'menu_book' },
      { path: '/app/data/lineage', translationKey: 'sidebar.data.lineage', icon: 'timeline' },
      { path: '/app/data/masking-sandbox', translationKey: 'sidebar.data.masking_sandbox', icon: 'mask' },
    ],
  },

  // 29) Mobile / PWA
  {
    groupTranslationKey: 'sidebar.groups.mobile',
    items: [
      { path: '/app/mobile/approvals', translationKey: 'sidebar.mobile.approvals', icon: 'rule' },
      { path: '/app/mobile/expenses', translationKey: 'sidebar.mobile.expenses', icon: 'paid' },
    ],
  },
];
