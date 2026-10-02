# Evana Designs landing pages

Static HTML funnel pages (60-Day Tabletop Growth Challenge, Sprint, Best Seller Launch). Deployed on Vercel from the main branch.

## Tracking (Meta Pixel + GA4)

All pages load `tracking.js` in `<head>`. Nothing is sent to Meta or Google until the visitor clicks **Accept cookies**; **Reject** (or Cookie settings → Reject) revokes consent and clears `_fbp`, `_fbc`, `_ga*`, `_gcl_au`.

- Meta Pixel `1174429707476188` and GA4 `G-4N45QD6TMR` (same as evanadesigns.com, with cross-domain linking).
- Add `?debug=1` to any URL to log every event in the console and see it in GA4 → Admin → DebugView.

| Moment | Page | GA4 event | Meta event |
|---|---|---|---|
| Page view | all | `page_view` (auto) | `PageView` |
| Sales page viewed | index, sprint, boost, checklist | `view_item` / `checklist_view` | `ViewContent` |
| Starts the application | index | `form_start` | `StartApplication` (custom) |
| Reaches step 2 / 3 | index | `form_step` | – |
| Application sent | index | `generate_lead` (tier, score) | `Lead` + advanced matching (email, first name, hashed by the pixel) |
| Tier A / Enterprise lead | index | `qualified_lead` | `QualifiedLead` (custom) |
| Opens booking calendar | thank-you, thank-you-priority | `calendar_open` | `CalendarOpen` (custom) |
| Clicks a booking link | any | `book_call_click` | `BookCallClick` (custom) |
| Call booked | booked | `book_appointment` (once per browser) | `Schedule` |
| Clicks buy | boost | `begin_checkout` ($199) | `InitiateCheckout` |
| Plays video | any | `video_start` | `VideoPlay` (custom) |
| Clicks email/phone | any | `contact_click` | `Contact` |

Every Meta event carries an `eventID`, ready for deduplication if the Conversions API is added later.
