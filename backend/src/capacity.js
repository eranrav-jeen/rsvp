// Shared capacity logic for the 120-cap (configurable via event_settings).
//
// A confirmed attendee counts as (1 + plus_ones) seats. We serialize concurrent
// RSVP submissions by taking a row lock on the single event_settings row, so two
// simultaneous "yes" submissions can't both slip past the cap.

// Reads max_attendees + currently-confirmed seat count, holding a lock on the
// settings row until the surrounding transaction commits. `excludeInviteeId`
// lets us recompute capacity for an existing invitee without double-counting
// their current confirmed seats.
export async function lockAndCount(client, { excludeInviteeId = null } = {}) {
  const settings = await client.query(
    'SELECT id, max_attendees, approval_required FROM event_settings ORDER BY id LIMIT 1 FOR UPDATE'
  );
  const maxAttendees = settings.rows[0] ? settings.rows[0].max_attendees : 120;
  const approvalRequired = settings.rows[0] ? settings.rows[0].approval_required : false;

  const params = [];
  // Speakers count as approved attendees too.
  let where = "status IN ('confirmed','speaker')";
  if (excludeInviteeId != null) {
    params.push(excludeInviteeId);
    where += ` AND id <> $${params.length}`;
  }
  const countRes = await client.query(
    `SELECT COALESCE(SUM(plus_ones + 1), 0)::int AS confirmed_seats FROM invitees WHERE ${where}`,
    params
  );
  return {
    maxAttendees,
    approvalRequired,
    confirmedSeats: countRes.rows[0].confirmed_seats,
  };
}

// Given current confirmed seats and a requested party size, decide the outcome.
export function decideStatus({ attending, requestedSeats, confirmedSeats, maxAttendees }) {
  if (!attending) return 'declined';
  if (confirmedSeats + requestedSeats <= maxAttendees) return 'confirmed';
  return 'waitlist';
}
