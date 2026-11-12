/** A dynamic QR changes every 10 or 15 seconds, the supervisor picks. Tokens without an interval mean 10. */
export const QR_INTERVALS = [10, 15]
export const QR_INTERVAL_DEFAULT = 10
/** A dynamic QR stays valid for about this long after it is shown, whatever the interval. */
export const QR_LIFETIME_S = 60
/** ...and this many windows ahead, for clocks that run slightly fast. */
export const QR_AHEAD = 1
/** Length of one QR window in ms. */
export const qrWindowMs = (interval = QR_INTERVAL_DEFAULT) => interval * 1000
/** How many windows back a dynamic QR is still accepted (6 for 10 s, 4 for 15 s). */
export const qrBackWindows = (interval = QR_INTERVAL_DEFAULT) => Math.ceil(QR_LIFETIME_S / interval)
/** A static QR works from this long before start until this long after end. */
export const STATIC_SLACK_MS = 30 * 60_000

/** Students pass within the activity's radius of the QR screen, plus each side's GPS accuracy up to ACC_CAP_M. */
export const RADIUS_OPTIONS = [150, 200, 300]
export const RADIUS_DEFAULT = 150
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
/** Seat bar turns yellow past this share of the seats, red past the second. */
export const SEAT_YELLOW = 0.7
export const SEAT_RED = 0.9
/** Private messages to a supervisor disappear from the screen this many days after the activity ends. */
export const DM_HIDE_DAYS = 5
/**
 * Private messages and the activity chat room on the student side. Off until supervisors have a screen to read and answer them
 * (SPEC 6.4): a message nobody can open is worse than no button. Turn on together with the supervisor inbox.
 */
export const MESSAGES_ON: boolean = false
