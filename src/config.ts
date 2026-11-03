/** A dynamic QR changes this often. */
export const QR_WINDOW_MS = 10_000
/** A dynamic QR stays valid for this many windows after it is shown (about 60 s)... */
export const QR_BACK = 6
/** ...and this many windows ahead, for clocks that run slightly fast. */
export const QR_AHEAD = 1
/** A static QR works from this long before start until this long after end. */
export const STATIC_SLACK_MS = 30 * 60_000

/** Students pass within this radius of the QR screen, plus each side's GPS accuracy up to ACC_CAP_M. */
export const RADIUS_M = 150
export const ACC_CAP_M = 100

/** Quick-pick hours. Any whole number 1 to 99 can be typed. */
export const HOUR_CHIPS = [1, 5, 6, 9, 18]

/** Free cancellation until this many days before start. */
export const CANCEL_DAYS = 2
/** The roster closes on its own this long after the activity ends. */
export const AUTO_CLOSE_H = 24
/** Supervisors send the roster within this many days after the end. */
export const SUBMIT_DAYS = 30
/** Lost credits per semester before a student can no longer register. */
export const STRIKE_LIMIT = 3
/** Centre target: activities per activity year. */
export const KPI_ACTIVITIES = 100
/** "Coming soon" means starting within this many days. */
export const SOON_DAYS = 3
