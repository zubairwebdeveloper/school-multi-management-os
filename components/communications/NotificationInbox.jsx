import InboxControls from "./InboxControls";

/** Server component: renders plain text only (whitespace preserved), never HTML. */
export default function NotificationInbox({ slug, inbox }) {
  return (
    <div className="space-y-4">
      <InboxControls slug={slug} hasUnread={inbox.items.some((i) => i.unread)} emailEnabled={inbox.emailEnabled} />
      {inbox.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">No notifications yet.</p>
      ) : (
        <ul className="space-y-3">
          {inbox.items.map((n) => (
            <li key={n.id} className={`rounded-xl border p-4 ${n.unread ? "border-blue-300 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"}`}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold">{n.unread && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-600" aria-label="Unread" />}{n.title}</h2>
                <span className="shrink-0 text-xs text-slate-500">{n.when}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
