# Fees and collections (Batch 14 / Phase 10, part 1)

Routes: /{slug}/dashboard/fees (invoices), /generate, /structures, /invoices/{id}, /student/{id}, /receipt/{paymentId}, /reports
Mutations: fees/actions.js (Server Actions). No client-supplied tenant, campus, amount totals or statuses are trusted.

Money
- Stored as INTEGER MINOR UNITS (paisa). Inputs are parsed from strings (no floats). Currency comes from tenant settings
  (PKR default). Invoice lines/discounts/totals are snapshots, so later fee-structure edits never change issued invoices.

Data (tenants/{id}/...)
- feeCategories, feeStructures/{campus}_{session}_{class} (lines: category, amount, MONTHLY|TERM|ANNUAL|ONE_TIME)
- invoices/{studentId}_{frequency}_{period}: deterministic id => regenerating never double-bills (existing ones are skipped)
- feeConcessions (FIXED or PERCENT), feePayments, counters/invoiceNumber, counters/receiptNumber

Rules enforced on the server
- Billed != collected. Invoice paidTotal/balance/status are recomputed inside the transaction from CONFIRMED payments only.
- Cash recorded by a PAYMENTS_COLLECT user is confirmed immediately (receipt number issued).
  Bank transfer, JazzCash, Easypaisa and card entries are only RECORDS (PENDING_VERIFICATION) until a FEES_MANAGE user verifies them;
  the verifier must be a different person than the recorder. A reference number is mandatory for non-cash, and the same
  method+reference cannot be recorded twice. No provider API is called: these are manual records, not integrations.
- Payments cannot exceed what is still due (pending payments are counted, so two clerks cannot over-collect).
- No edits/deletes of financial records: payments are REVERSED or REJECTED with a reason (kept, receipt flagged), invoices are
  CANCELLED with a reason, only if no confirmed/pending payment exists. Every step writes an audit entry.
- Concessions are applied at generation time (capped at the invoice subtotal) and recorded on the invoice.
- Generation: ACTIVE session, class structure required, <= 400 students per run, invoice numbers allocated in the same transaction.
- Permissions: view FEES_READ; generate/structures/verify/reverse/cancel/concessions FEES_MANAGE; record payments PAYMENTS_COLLECT;
  reports FINANCE_READ. Campus access is checked on every record. Categories need org-wide scope.

Reports (fees/reports) show Billed, Collected, Awaiting verification, Outstanding now and Overdue per campus with the definitions on
screen, plus overdue balances by student. They are computed from real records (range queries filtered in memory).

Indexes: firestore.indexes.json is REPLACED again (adds invoices by campus/status/invoiceNumber). Deploy:
firebase deploy --only firestore:indexes

Not yet: late fees, advance/over-payments and credit balances, refunds, transport/library fees auto-billing, sibling discount rules,
fee vouchers (PDF), expenses/payroll/cash book/daily closing (rest of Phase 10), online payment gateways, parent fee view (portal),
payment/overdue notifications (Phase 14), CSV export, pre-aggregated totals for very large schools, tests (double-generate,
concurrent payments, verifier = recorder, reversal then re-pay, concession cap, cross-campus access).
