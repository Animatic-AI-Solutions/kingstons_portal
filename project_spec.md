v1


We'll focus on:

* **Readability:** Larger fonts, high contrast (avoiding problematic grey text).
* **Clarity:** Clear labels, logical layouts, unambiguous actions.
* **Simplicity:** Intuitive navigation, minimizing unnecessary complexity.
* **Efficiency:** Supporting advisor workflows effectively.

Here is the revised specification with UX/UI considerations integrated:

---

**Frontend Application Specification (Revised with UX/UI Focus)**

**Overall Vision:** Provide wealth management advisors/administrators with tools to manage client information, accounts, and investments (placed via external providers). Track investment performance using IRR and provider data. Preserve historical records accurately. Offer insightful company-wide analytics. **Prioritize clarity, readability, and ease of navigation for experienced users, potentially aged 50+.**

**General UX/UI Principles:**

* **Font Size:** Use a larger base font size throughout the application (e.g., minimum 16px for body text) to ensure easy reading. Headings should be significantly larger.
* **Contrast:** Employ high contrast text, primarily near-black or dark blue text on light backgrounds (e.g., white or very light grey). **Strictly avoid light grey text on light backgrounds for any important information or labels.** Aim for WCAG AA or AAA contrast ratios.
* **Layout & Spacing:** Use ample white space. Ensure clear visual separation between elements and sections using spacing, borders, or subtle background differences. Avoid overly dense layouts.
* **Interactivity:** Buttons, links, and form fields should have large clickable areas. Provide clear visual feedback on hover and click states. Use clear, universally understood icons alongside text labels for key actions.
* **Consistency:** Maintain consistent layout patterns, button placement, terminology, and visual styling across all pages.

**1. Dashboard / Homepage**

* **Purpose:** Provide a high-level overview and quick access to key areas.
* **Content:**
  * Company-Wide Total FUM / Company-Wide IRR: Display these key figures **prominently** with  **large, high-contrast font** . IRR calculation happens in the backend; consider noting the period covered (e.g., "IRR (All Time)").
  * Quick Stats: Use clear labels and easily readable numbers.
  * Navigation Menu/Links: Implement as a **clear, persistent top navigation bar or sidebar** with unambiguous labels (Clients, Accounts, Definitions, Reporting). Ensure navigation text meets size and contrast requirements.

**2. Client Management Section**

* **2.1. Client List Page (`/clients`)**
  * **Display:** A clear table or list layout. Ensure sufficient padding within rows/cells for readability. Consider subtle alternating row colours only if high contrast is maintained.
  * **Columns:** Client Name, Advisor, Relationship, Status, Total Client FUM. **Text must be high contrast.**
  * **Features:**
    * Search/Filter/Sort Controls: Clearly labelled buttons and input fields. Use dropdowns for filters where appropriate (e.g., Status). Ensure controls are easy to click/tap.
  * **Actions:**
    * `+ Add Client` button: Prominently displayed, clearly labelled with text and potentially an icon.
* **2.2. Add Client Workflow**
  * **Step 1: Client Details:**
    * **Clear Form Layout:** Labels positioned clearly next to or above input fields. Adequate spacing between fields.
    * **Inputs:** Name (`text`), Relationship (`dropdown` with large, readable 'R', 'S', 'T' options), Advisor (`text`). Status clearly indicated (defaults 'active').
    * **Action:** `Save Client` button: Clear, prominent, consistent placement (e.g., bottom right).
* **2.3. Client Detail Page (`/clients/{clientId}`)**
  * **Display Header:** Use large font for Client Name. Key figures (Total FUM, Status) clearly visible.
  * **Actions Header:** Buttons (`Edit Client Details`, `Deactivate Client`, `+ Add Account`) should be clearly grouped and labelled. Use icons alongside text for clarity.
  * **Tabs:** Clearly labelled tabs ('Info', 'Accounts'). Ensure the active tab is visually distinct.
    * **Info Tab:** Display data clearly using label-value pairs with good spacing. Editing mode should clearly delineate input fields.
    * **Accounts Tab:** Table layout similar to Client List page (readable rows, high contrast text). Account IRR should use high-contrast colour (e.g., dark green/dark red) **and** potentially an icon (▲/▼) – do not rely on colour alone.
* **2.4. Add Account Workflow** (Initiated from Client Detail Page)
  * **Step 1: Account Setup:**
    * **Clear Form Layout:** Guide user through selections.
    * **Inputs:** Provider/Product selection using large, readable dropdowns/searchable lists. Account Name clearly labelled input. Date picker should be easy to use.
    * **Weighting Field:** Provide clear helper text explaining its meaning (% of initial investment). Use clear numeric input control.
    * **Action:** `Save Account` button: Clear and consistent.

**3. Account Management Section**

* **3.1. Account List Page (`/accounts`)**
  * **Display:** Similar table layout principles as Client List (readability, contrast).
  * **Features:** Group by Client toggle should be obvious. Search/Sort/Filter controls clear and easy to use.
* **3.2. Account Detail Page (`/accounts/{accountId}`)**
  * **Display Header:** Similar to Client Detail header - prominent key info.
  * **Actions Header:** Clear, grouped buttons.
  * **Tabs:** Clear 'Info', 'Holdings', 'Activity Log' tabs.
    * **Holdings Tab:** Table needs high readability. Units/Market Value clearly formatted numbers. Portfolio name clearly displayed if linked. Close Holding action clearly associated with each row (e.g., button at end of row).
    * **Activity Log Tab:** Potentially long table. Ensure high readability. Consider clear date formatting. Use icons + text for Activity Type if helpful. Filtering controls should be prominent and easy to use.
* **3.3. Add Holding Workflow** (Initiated from Account Detail Page)
  * **Step 1: Select Investment:**
    * Clear UI for selecting one or multiple funds from a list. List should be searchable/filterable and show key fund info clearly.
  * **Step 2: Confirm & Activate:**
    * Clear display of selected funds. Easy-to-use date picker for Start Date. Optional association with Model Portfolio should be clear.
    * Action: `Save Holding(s)` button: Clear.
* **3.4. Record Activity Workflow** (Initiated from Account Detail Page)
  * **Input Form:**
    * **Logical Grouping:** Group related fields (e.g., transaction details, valuation details).
    * **Clear Labels & Controls:** Ensure dropdowns (Holding, Activity Type) are easy to read and use. Date/time picker intuitive. Numeric inputs clearly formatted.
    * **Highlight Key Fields:** Clearly indicate fields needed for specific types (e.g., "Market Value required for Valuation").
  * **Action:** `Save Activity` button: Clear. Provide clear success/error messages.

**4. Definitions / Admin Section (`/definitions`)**

* **Purpose:** Manage core data entities.
* **Page Structure:** Use **clear Tabs at the top of the page** (Providers, Products, Funds, Portfolios). Active tab must be visually distinct.
* **General:** Use clear table layouts for lists. Add/Edit forms follow clarity principles above.
* **Sub-Views (Manage Allowed Funds / Portfolio Composition):** These complex interactions need careful design. Use clear list builders or editable tables. Ensure buttons for Add/Remove/Save are obvious. Provide clear visual feedback on changes. Validation messages (e.g., portfolio weights sum) must be prominent and easy to understand.

**5. Reporting / Analytics Section (`/reporting`)**

* **Purpose:** Provide performance overviews.
* **Display Header:** Key figures (Company FUM/IRR) very large and high contrast. Date range selector should be intuitive.
* **Tabs/Sections:** Clear tabs for different report views.
  * **Tables:** Prioritize readability (spacing, contrast, font size). Consider default column sets, allowing users to show/hide columns if tables become too wide. IRR columns use high-contrast colours + icons (▲/▼).
* **Performance Note:** If calculations take time, display a clear loading indicator.
