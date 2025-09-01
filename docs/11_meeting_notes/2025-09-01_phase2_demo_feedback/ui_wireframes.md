# Phase 2 UI Wireframes - Kingston's Portal

**Meeting:** Phase 2 Demo Feedback Session  
**Date:** September 1, 2025  
**Document Version:** 1.0  
**Purpose:** Simple wireframes for Phase 2 interface enhancements

## 1. Enhanced Product Owner Cards (3-Section Layout)

```
┌─────────────────────────────────────────────────────────────────┐
│ PRODUCT OWNER: John Smith                               [Edit] │
├─────────────────────┬───────────────────────────────────────────┤
│ Personal Details    │ Contact Information                       │
│ ─────────────────── │ ─────────────────────────────────────────│
│ Known As: John      │ 📱 Mobile: +44 7123 456789              │
│ Title: Mr           │ 🏠 House Phone: +44 7987 654321         │
│ DOB: 15/03/1975     │ 💼 Work: +44 20 8123 4567               │
│ NI Number: AB123456C│ ✉️ Email: john@example.com               │
├─────────────────────┴───────────────────────────────────────────┤
│ BOTTOM SECTION (Full Width)                                    │
│ ─────────────────────────────────────────────────────────────── │
│ Meeting Information                                             │
│ Next Meeting: 15 Sep     Last Meeting: 01 Aug                  │
│                                                                 │
│ Compliance                                                      │
│ Date Signed T&C: Jan 2024     Fee Agreement: Q2/24             │
│                                                                 │
│ Security Words: Remember childhood pet                          │
│ Notes: Prefers morning appointments, interested in ESG funds   │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **3-section layout**: Personal details (left) + Contact info (right) + Everything else (bottom full-width)
- **Multiple phone types**: Mobile, House Phone, Work with clear labeling (matches database phone_type enum)
- **Meeting dates**: Only month and day (no time recording)
- **Security words & notes**: No additional security restrictions
- **Professional layout**: Maximum information density with clear organization

---

## 2. Information-Dense Tables (Main List Tab) - Maximum Rows

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ INFORMATION ITEMS (127 items)                              [Filter] [Sort] [Export]  │
├──────────────────────────┬─────────────────┬──────────────┬──────────────┬───────────┤
│ Category                 │ Type            │ Owner        │ Last Edited  │ Actions   │
├──────────────────────────┼─────────────────┼──────────────┼──────────────┼───────────┤
│ 📋 Basic Detail          │ Home Address    │ N/A          │ 2 days ago   │[View][Edit]│
├──────────────────────────┼─────────────────┼──────────────┼──────────────┼───────────┤
│ 💰 Income Expenditure    │ Salary          │ John (100%)  │ 1 day ago    │[View][Edit]│
├──────────────────────────┼─────────────────┼──────────────┼──────────────┼───────────┤
│ 🏦 Assets Liabilities    │ Bank Account    │ John (60%),  │ 3 days ago   │[View][Edit]│
│                          │                 │ Mary (40%)   │              │           │
├──────────────────────────┼─────────────────┼──────────────┼──────────────┼───────────┤
│ 🛡️ Protection            │ Home Insurance  │ Joint (John, │ 5 days ago   │[View][Edit]│
│                          │                 │ Mary)        │              │           │
├──────────────────────────┼─────────────────┼──────────────┼──────────────┼───────────┤
│ 🏥 Vulnerability Health  │ Health Concerns │ John (100%)  │ 1 week ago   │[View][Edit]│
├──────────────────────────┼─────────────────┼──────────────┼──────────────┼───────────┤
│ 🏦 Assets Liabilities    │ Investment      │ John (70%),  │ 2 weeks ago  │[View][Edit]│
│                          │                 │ Mary (25%),  │              │           │
│                          │                 │ Other (5%)   │              │           │
├──────────────────────────┼─────────────────┼──────────────┼──────────────┼───────────┤
│ 📋 Basic Detail          │ Employment      │ John Smith   │ 3 weeks ago  │[View][Edit]│
├──────────────────────────┼─────────────────┼──────────────┼──────────────┼───────────┤
│ 🏦 Assets Liabilities    │ Buy-to-Let     │ John Smith   │ 1 month ago  │[View][Edit]│
├──────────────────────────┼─────────────────┼──────────────┼──────────────┼───────────┤
│ 💰 Income Expenditure    │ Rental Income   │ John Smith   │ 1 month ago  │[View][Edit]│
├──────────────────────────┼─────────────────┼──────────────┼──────────────┼───────────┤
│ 📋 Basic Detail          │ Next of Kin     │ John Smith   │ 2 months ago │[View][Edit]│
├──────────────────────────┼─────────────────┼──────────────┼──────────────┼───────────┤
│ 🏦 Assets Liabilities    │ Pension         │ John Smith   │ 3 months ago │[View][Edit]│
├──────────────────────────┼─────────────────┼──────────────┼──────────────┼───────────┤
│ 🛡️ Protection            │ Life Insurance  │ John Smith   │ 4 months ago │[View][Edit]│
├──────────────────────────┴─────────────────┴──────────────┴──────────────┴───────────┤
│ [←] [1] [2] [3] ... [11] [→]                                 Showing 1-12 of 127     │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **Big 5 categories** with emojis AND text (📋 Basic Detail, 💰 Income Expenditure, 🏦 Assets Liabilities, 🛡️ Protection, 🏥 Vulnerability Health)
- **Item types** clearly specified (Address, Bank Account, Phone Number, etc.)
- **Owner column** shows ownership structure: individual percentages, joint ownership, or tenants in common
- **Maximum rows per page** (12+ rows to fit as many as possible)
- **Category + emoji** approach for older users who prefer text with visual aids
- **Complex ownership display** - shows individual (100%), tenants in common (with %), or joint ownership details
- **Clean columnar layout** for efficient information scanning

---

## 3. Separated Objectives & Actions (Columnar Display)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ OBJECTIVES                                    │ ACTIONS                      │
├─────────────────────────────────────────────┼──────────────────────────────┤
│ 🎯 Retirement Planning Review               │ ═══ IN PROGRESS ═══          │
│    Started: 01/08/2025                      │ 📋 Review pension contributions│
│    Last Discussed: 15/08/2025               │    Target: 15/09/2025          │
│    Status: Active                           │    Details: Annual review of..│
│    Description: Comprehensive review of...  │    [+ Expand]                   │
│    [+ Expand]                               │                                 │
│                                             │ 📋 Research BTL mortgage rates  │
│ 🎯 Property Investment Strategy             │    Target: 10/09/2025          │
│    Started: 15/07/2025                      │    Details: Compare rates from│
│    Last Discussed: 20/08/2025               │    [+ Expand]                   │
│    Status: Active                           │                                 │
│    Description: Develop strategy for buy-..│ ═══ COMPLETED ═══            │
│    [+ Expand]                               │ ✅ Update retirement projections│
│                                             │    Completed: 25/08/2025       │
│ 🎯 Tax Planning Optimization                │    Details: Updated 5-year...   │
│    Started: 01/09/2025                      │    [+ Expand]                   │
│    Last Discussed: Never                    │                                 │
│    Status: New                              │ ✅ ISA allowance review        │
│    Description: Optimize tax efficiency... │    Completed: 20/08/2025       │
│    [+ Expand]                               │    Details: Reviewed current...│
│                                             │    [+ Expand]                   │
├─────────────────────────────────────────────┼──────────────────────────────┤
│ [+ Add Objective]                           │ [+ Add Action]                  │
└─────────────────────────────────────────────┴──────────────────────────────┘
```

**Key Features:**
- **Complete separation** of objectives and actions (no linking)
- **In-progress and completed sections** for actions with clear visual separation
- **Expandable descriptions** - truncated details with [+ Expand] option for longer descriptions
- **Objective descriptions** - each objective shows description with expandable option
- **Action titles and details** both shown for user context
- **Status tracking** for both objectives and actions
- **Date information** prominently displayed (target dates for in-progress, completion dates for completed)
- **Independent management** of each list

---

## 4. Global Actions Page (Separate from Client Details) - All Client Actions by Due Date

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ALL CLIENT ACTIONS - ORDERED BY URGENCY                    [Export PDF]    │
├──────────────────────────┬────────────────┬─────────────┬─────────────────┤
│ Action Title             │ Client         │ Due Date    │ Status          │
├──────────────────────────┼────────────────┼─────────────┼─────────────────┤
│ 🔴 Review portfolio risk │ Smith, John    │ 05 Sep 2025 │ OVERDUE (2 days)│
│ 🔴 Update pension contri │ Davis, Mary    │ 06 Sep 2025 │ OVERDUE (1 day) │
│ 🟡 Annual review meeting │ Johnson, Bob   │ 08 Sep 2025 │ DUE TODAY       │
│ 🟡 ISA transfer complete │ Williams, Sue  │ 09 Sep 2025 │ Due Tomorrow    │
│ 🟢 Fee agreement renewal │ Brown, Tom     │ 12 Sep 2025 │ Due in 4 days   │
│ 🟢 Investment rebalance  │ Smith, John    │ 15 Sep 2025 │ Due in 1 week   │
│ 🟢 Tax planning review   │ Davis, Mary    │ 18 Sep 2025 │ Due in 10 days  │
│ 🟢 Property valuation    │ Wilson, Kate   │ 22 Sep 2025 │ Due in 2 weeks  │
│ 🟢 Pension forecast upd  │ Johnson, Bob   │ 25 Sep 2025 │ Due in 17 days  │
│ 🟢 Risk assessment       │ Williams, Sue  │ 30 Sep 2025 │ Due in 3 weeks  │
│ 🟢 Compliance check      │ Brown, Tom     │ 05 Oct 2025 │ Due in 1 month  │
│ 🟢 Portfolio review      │ Wilson, Kate   │ 15 Oct 2025 │ Due in 6 weeks  │
├──────────────────────────┴────────────────┴─────────────┴─────────────────┤
│ [Filter by Client] [Filter by Date Range] [Export Selected] Total: 247     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **Separate page accessible via site sidebar** (NOT one of the 5 tabs inside client details page)
- **All client actions** in one consolidated view across all client groups
- **Due date ordering** with urgency color coding (🔴 Overdue, 🟡 Due Soon, 🟢 Future)
- **Client identification** for each action
- **Status clarity** with days overdue/remaining
- **Easy filtering** by client or date range to focus on specific needs
- **Export functionality** for action planning and client communication

---

## 5. Networth Statement - Asset Types with Product Owner Columns

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ NET WORTH STATEMENT                            [Customize Order] [Export]      │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                 │    John     │    Mary     │    Joint    │ Total │
├─────────────────────────────────┼─────────────┼─────────────┼─────────────┼───────┤
│ ASSETS                          │             │             │             │       │
├─────────────────────────────────┼─────────────┼─────────────┼─────────────┼───────┤
│ 🏦 BANK ACCOUNTS                │             │             │             │       │
│ ├─ Current Account              │  £15,230.00 │   £8,450.00 │  £21,550.00 │£45,230│
│ ├─ Premium Bonds                │  £10,000.00 │  £10,000.00 │         -   │£20,000│
│ └─ Savings Account              │   £5,000.00 │  £12,000.00 │         -   │£17,000│
│                                 │             │             │             │       │
│ 💰 PENSIONS                     │             │             │             │       │
│ ├─ Company Pension              │  £85,000.00 │  £45,000.00 │         -   │£130,000│
│ ├─ SIPP                         │  £67,000.00 │  £22,500.00 │         -   │£89,500│
│ └─ State Pension (Est)          │  £12,000.00 │  £10,000.00 │         -   │£22,000│
│                                 │             │             │             │       │
│ 📈 INVESTMENTS                  │             │             │             │       │
│ ├─ Stocks & Shares ISA          │  £20,000.00 │  £20,000.00 │         -   │£40,000│
│ ├─ General Investment Account    │  £45,800.00 │  £22,000.00 │         -   │£67,800│
│ └─ Investment Bonds             │ £125,000.00 │         -   │         -   │£125,000│
│                                 │             │             │             │       │
│ 🏠 PROPERTY                     │             │             │             │       │
│ ├─ Main Residence               │         -   │         -   │ £425,000.00 │£425,000│
│ ├─ Buy-to-Let Property          │ £285,000.00 │         -   │         -   │£285,000│
│ └─ Holiday Home                 │         -   │         -   │ £180,000.00 │£180,000│
├─────────────────────────────────┼─────────────┼─────────────┼─────────────┼───────┤
│ TOTAL ASSETS                    │ £670,030.00 │ £149,950.00 │ £626,550.00 │£1,446,530│
├─────────────────────────────────┼─────────────┼─────────────┼─────────────┼───────┤
│ LIABILITIES                     │             │             │             │       │
├─────────────────────────────────┼─────────────┼─────────────┼─────────────┼───────┤
│ 🏠 MORTGAGES                    │             │             │             │       │
│ ├─ Main Residence Mortgage      │         -   │         -   │ £185,000.00 │£185,000│
│ ├─ BTL Mortgage                 │  £95,000.00 │         -   │         -   │£95,000│
│ └─ Holiday Home Mortgage        │         -   │         -   │  £75,000.00 │£75,000│
│                                 │             │             │             │       │
│ 💳 OTHER DEBTS                  │             │             │             │       │
│ ├─ Credit Cards                 │   £1,200.00 │     £800.00 │         -   │£2,000 │
│ ├─ Personal Loan                │   £5,000.00 │         -   │         -   │£5,000 │
│ └─ Car Finance                  │         -   │  £12,000.00 │         -   │£12,000│
├─────────────────────────────────┼─────────────┼─────────────┼─────────────┼───────┤
│ TOTAL LIABILITIES               │ £101,200.00 │  £12,800.00 │ £260,000.00 │£374,000│
├─────────────────────────────────┼─────────────┼─────────────┼─────────────┼───────┤
│ NET WORTH                       │ £568,830.00 │ £137,150.00 │ £366,550.00 │£1,072,530│
├─────────────────────────────────┴─────────────┴─────────────┴─────────────┴───────┤
│ COMBINED NET WORTH: £1,072,530.00                                                │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **Hybrid ordering system:** Default asset type grouping (Bank Accounts, Pensions, Investments, Property) with optional liquidity-based view toggle
- **Product owner columns** (John, Mary, Joint) showing individual and shared ownership
- **Customizable category order** and item order within each category (per architectural_changes.md specifications)
- **Clear separation** of Assets and Liabilities in distinct sections
- **Professional formatting** with proper totals and subtotals
- **Combined net worth calculation** at bottom
- **View toggle:** Users can switch between "Asset Type View" and "Liquidity View" as needed

---

## 6. Mobile Responsive Considerations (Not Primary Target)

Since mobile is not in scope, these wireframes assume **desktop-first design** with basic responsive fallbacks:

- **Product Owner Cards**: Stack columns vertically on tablets
- **Dense Tables**: Horizontal scroll with sticky first column
- **Global Actions**: Convert to single column layout
- **Networth**: Collapse to simplified view with expandable sections

---

## Review Questions

1. **Product Owner Cards**: Is the 3-section layout appropriate? Should any fields be moved between sections?

2. **Information Tables**: The wireframes show 12+ rows for scanning efficiency - is this the optimal row count for information density?

3. **Global Actions**: Should the PDF export be more prominent, or is top-right placement sufficient?

4. **Networth Display**: Is the hybrid approach (asset type default + liquidity view toggle) the right balance between user preference and professional wealth management standards?

5. **General Layout**: Do these layouts fit well within the existing 6-tab navigation structure?

6. **Color Coding**: Should priority/status use specific colors, or rely more on icons/shapes for accessibility?

These wireframes provide a foundation for Phase 2 UI development while maintaining consistency with existing Kingston's Portal design patterns.