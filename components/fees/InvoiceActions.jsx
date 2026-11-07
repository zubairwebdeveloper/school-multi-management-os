"use client";
import { useState } from "react";
import Link from "next/link";
import { ActionForm, ConfirmButton, card, ghostBtn } from "@/components/academics/shared";
import { PAYMENT_METHODS } from "@/lib/validations/fees";
import { cancelInvoice, recordPayment, rejectPayment, reversePayment, verifyPayment } from "@/app/(workspace)/[tenantSlug]/dashboard/fees/actions";

const tone = { CONFIRMED: "bg-emerald-100 text-emerald-700", PENDING_VERIFICATION: "bg-amber-100 text-amber-700", REJECTED: "bg-slate-200 text-slate-600", REVERSED: "bg-red-100 text-red-700" };
const label = { CONFIRMED: "Confirmed", PENDING_VERIFICATION: "Awaiting verification", REJECTED: "Rejected", REVERSED: "Reversed" };

function PaymentRow({ slug, p, canManage, me }) {
  const [mode, setMode] = useState(null);
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <span className="font-medium">{p.amountText}</span> · {p.methodLabel} · {p.receivedDate}{p.reference ? ` · ref ${p.reference}` : ""}<br />
          <span className="text-slate-500">Recorded by {p.recordedByEmail}{p.receiptNo ? ` · ${p.receiptNo}` : ""}{p.statusReason ? ` · ${p.statusReason}` : ""}</span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone[p.status]}`}>{label[p.status]}</span>
          {p.receiptNo && <Link href={`/${slug}/dashboard/fees/receipt/${p.id}`} className="text-blue-600 hover:underline">Receipt</Link>}
          {canManage && p.status === "PENDING_VERIFICATION" && (
            p.recordedBy === me
              ? <span className="text-xs text-slate-500">Another person must verify</span>
              : <>
                  <ConfirmButton confirm="Confirm this payment was received?" run={() => verifyPayment(slug, p.id)}>Verify</ConfirmButton>
                  <button className={ghostBtn} onClick={() => setMode(mode === "reject" ? null : "reject")}>Reject</button>
                </>
          )}
          {canManage && p.status === "CONFIRMED" && <button className={ghostBtn} onClick={() => setMode(mode === "reverse" ? null : "reverse")}>Reverse</button>}
        </span>
      </div>
      {mode && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <ActionForm cols={1} fields={[{ name: "reason", label: mode === "reject" ? "Reason for rejecting" : "Reason for reversing (kept on record)" }]} submitLabel={mode === "reject" ? "Reject payment" : "Reverse payment"}
            onSubmit={(v) => (mode === "reject" ? rejectPayment(slug, p.id, v) : reversePayment(slug, p.id, v))} onDone={() => setMode(null)} onCancel={() => setMode(null)} />
        </div>
      )}
    </li>
  );
}

export default function InvoiceActions({ slug, invoice, payments, canCollect, canManage, me, today }) {
  const [cancelling, setCancelling] = useState(false);
  const open = ["UNPAID", "PARTIAL"].includes(invoice.status);
  return (
    <div className="space-y-6">
      <section className={card}>
        <h2 className="mb-2 text-base font-semibold">Payments</h2>
        {payments.length === 0 ? <p className="text-sm text-slate-500">No payments recorded.</p> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">{payments.map((p) => <PaymentRow key={p.id} slug={slug} p={p} canManage={canManage} me={me} />)}</ul>
        )}
      </section>

      {canCollect && open && (
        <section className={card}>
          <h2 className="mb-1 text-base font-semibold">Record a payment</h2>
          <p className="mb-3 text-xs text-slate-500">Cash is confirmed immediately and a receipt is issued. Bank, JazzCash, Easypaisa and card entries are only records until another person verifies them.</p>
          <ActionForm
            fields={[
              { name: "amount", label: "Amount", placeholder: invoice.balanceInput, default: invoice.balanceInput },
              { name: "method", label: "Method", options: PAYMENT_METHODS, default: "CASH" },
              { name: "receivedDate", label: "Date received", type: "date", default: today },
              { name: "reference", label: "Reference / transaction no. (required except cash)" },
              { name: "note", label: "Note (optional)", wide: true },
            ]}
            submitLabel="Record payment"
            onSubmit={(v) => recordPayment(slug, { ...v, invoiceId: invoice.id })}
          />
        </section>
      )}

      {canManage && invoice.status !== "CANCELLED" && (
        <section className={card}>
          <button className={ghostBtn} onClick={() => setCancelling((v) => !v)}>Cancel invoice</button>
          {cancelling && (
            <div className="mt-3">
              <ActionForm cols={1} fields={[{ name: "reason", label: "Reason (kept on record)" }]} submitLabel="Cancel invoice"
                onSubmit={(v) => cancelInvoice(slug, invoice.id, v)} onDone={() => setCancelling(false)} onCancel={() => setCancelling(false)} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
