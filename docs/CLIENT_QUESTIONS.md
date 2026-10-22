# L. Client Clarification Checklist

Prioritised. Answers are recorded with their date. Confirmed items are carried into REQUIREMENTS / BUSINESS_RULES / MENU.

## Answers received — 15 Oct 2026 (relayed by the project lead)

| # | Question | Answer (as given) | Status / interpretation |
|---|---|---|---|
| Q1 | Which POS? | "Not decided as of now, keep it an open question" | **Open.** The POS hasn't been chosen yet. Build the order board (P3) as the MVP path. The POS adapter is added when one is chosen. Payment provider decision stays open |
| Q2 | Who pays for delivery? | "Customer, delivery costs will be included" | **Confirmed:** the customer pays the delivery fee, and it's added to their total. *Interpretation `[Assumption]`:* the Uber Direct quote is passed through as quoted (inc GST), shown before payment. See follow-ups F1–F2 |
| Q3 | Uber Direct account? | "Yes they use Uber Direct" | **Confirmed:** an existing account. See F3 for API access |
| Q4 | Website prices? | Menu board supplied | **Confirmed:** website prices = in-store menu board prices → [MENU.md](MENU.md) |
| Q5 | Full menu | Menu board supplied | **Mostly answered.** Combo choices, descriptions and extras rules are still open (MENU.md "Open menu questions") |
| Q6 | Legal entity / ABN | — | **Open** |
| Q7 | Prep time, capacity, cut-off, order ahead | "Can't order for another day. Yes stop each night unless store owner specify to keep it open. Owner should have options to open and close orders" | **Confirmed:** same-day orders only. Online ordering stops automatically at the nightly cut-off. The owner can **open or close online ordering manually at any time** and can keep it open past the cut-off. Prep time, capacity and later-today scheduling are still open (F4–F6) |
| Q8 | Auto-accept or staff accept? | "Staff should accept each one" | **Confirmed:** manual acceptance by staff. See F7–F8 |
| Q9 | Photo usage permission | "Yes, owners provided us with these images" | **Accepted as client-supplied.** Recommend a one-line written confirmation from the owner that they hold the rights for web use (F9) |
| Q10 | Allergens / dietary | "Will confirm later" | **Deferred.** Must be supplied before the menu goes live (launch blocker, not a design blocker) |

## Follow-up questions raised by the answers

| # | Question | Why it matters | Priority |
|---|---|---|---|
| F1 | Delivery fee: pass on the exact Uber quote (varies by distance), or round it / add a small handling amount? | Uber charges ~A$10 + A$1.10/km ex GST. The customer sees this before paying | Blocking for delivery |
| F2 | **Minimum order value for delivery**, and a maximum distance? (A 3 km delivery is ~A$14.60, more than a A$8.49 combo) | Prevents very small delivery orders that customers may abandon or complain about | Blocking for delivery |
| F3 | Is the Uber Direct account used through the **dashboard** only, or is API access (Developer tab: Customer ID, Client ID/Secret) available? Can the owner add us as a developer/admin user? Never send the secrets by chat or email. | Needed to connect the website to Uber Direct | Blocking for delivery |
| F4 | Typical **prep time** for an order (e.g. 10 min chai/snacks, 15 min sandwiches/Maggi)? | Sets the ready times shown to customers and the Uber pickup time | Blocking for ordering |
| F5 | **Nightly online cut-off:** how many minutes before closing should online orders stop (e.g. 30 min before 10pm / 1am)? | The default for the automatic close | Blocking for ordering |
| F6 | "Can't order for another day": should customers be able to choose a **later time today** (e.g. order at 2pm for 6pm), or **ASAP only**? | Decides whether time slots exist at all | Blocking for ordering |
| F7 | How long should staff have to **accept** an order before it is automatically declined and the customer's payment released (e.g. 5 minutes)? | Customers shouldn't wait indefinitely. It also keeps delivery quotes valid (Uber quotes expire after 15 min) | Blocking for ordering |
| F8 | What device will staff use to accept orders (counter tablet, phone, the till screen)? Is a sound alert OK in the shop? Is a kitchen docket printer wanted? | Order-screen design and hardware | Important |
| F9 | Short written confirmation from the owner that they own or are licensed to use the May 2026 photos on the website | Copyright protection for you and the owner | Important |
| F10 | When the owner manually keeps ordering open past the cut-off, should it require an end time (e.g. "open until 11:30pm")? (Recommended: yes, so it can't be left open by accident) | Prevents orders after staff go home | Important |
| F11 | Combo choices, sandwich extras, item descriptions (see MENU.md) | Needed to build the menu correctly | Important |

## Still open from the original list

| # | Question | Priority |
|---|---|---|
| Q1 | POS choice (when decided). Also: would you like our recommendation on a POS with good online-ordering support? | Important (no longer blocks launch thanks to the order board) |
| Q6 | Legal entity: Valam Enterprise Pty Ltd, ABN 31 696 781 405? Who signs up for the payment account? | Blocking for payments |
| Q10 | Allergen and dietary information per item | Launch blocker |
| Q11 | Budget range for the build and monthly running costs. Target launch date? | Important |
| Q12 | Who maintains the site after launch? Any technology preference? | Important |
| Q13 | Logo source files (SVG/AI), brand colours/fonts, the menu-board artwork file (the board exists as a design file somewhere) | Important |
| Q14 | Half-day atmosphere photo/video shoot? | Important |
| Q15 | Confirm the hours: Tue closed, Fri–Sat until 1am. Public holiday policy? | Important |
| Q16 | Founders' story for the About page; staff photos permission | Important |
| Q17 | Existing merchant account or preferred payment provider? Public-holiday surcharge in store? | Important |
| Q18 | Customer notifications: email only, or SMS too? | Important |
| Q19 | Google reviews display preference | Important |
| Q20 | What do the 14 one-star reviews say? | Important |
| Q21 | Domain name preference / already owned? | Important |
| Q22 | Customer data retention; accounts at launch? | Important |
| Q23–Q29 | Promotions, catering, merchandise, Instagram embeds, ads/analytics, languages, second location | Later |
