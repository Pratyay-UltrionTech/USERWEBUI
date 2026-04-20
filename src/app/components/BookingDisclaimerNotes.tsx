/** Shared booking notices for date/time and summary steps. */
export function BookingDisclaimerNotes() {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/90 px-4 py-3 text-sm text-gray-700 shadow-sm">
      <ul className="list-disc space-y-1.5 pl-5 marker:text-gray-400">
        <li>Express wash approx 25 mins / 45 mins peak time</li>
        <li>Same day booking may be subject to longer wait times</li>
        <li>
          Heavily soiled vehicles, dog hair, bug removal — star reserves the right to charge an additional fee
        </li>
      </ul>
    </div>
  );
}
