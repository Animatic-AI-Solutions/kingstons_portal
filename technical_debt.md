# Terms

## Client Group: 
- Just a client e.g The Kingston Family
- can also be a business or trust
- was prevously refactored from 'Client' so there may be lingering mentions

## Products:
- Client groups own products (e.g an ISA or a Pension)
- Products own one portfolio
- May be referred to as 'holding' or 'account' but we want to be consistent with 'product'

## Providers:
- A company which looks after the product
- Is assigned to products

## Portfolio:
-  The set of funds for the product (each fund that they are invested)
- Effectively a wrapper or the funds inside a product. This way we can name them and have tenplates they can reuse.
- May be referred to as 'holding' or 'account', these are old labels.

## Funds:
- Think of it as a stock of which you hahve some money invested into. Funds can have valuations (whcih tgell you the cash valyue of the fund at a given date)
- Can own transactions (may be referrred to as 'activity') which are investments or withdrawla or fund switches

## 'Product Owners':
- People associated to a product
- Down the line will be relabeled to 'Person'

## Portfolio templates:
- Blueprint portfolios which can be plugged in when creating a product, this just gives a commonly used portfolio a name and saves time creating new products

## Phase 2:
- This is used in many places to indicate documentation or compponents for the next phase for the system which is mainly adding lots more data for clients
- Some of this functinoality is implemented already and not explicitly labled phase 2

## Things for Danny to look out for (major known technical debt):
- There is maybe 40% coverage for tests, some are broken and the rest need to be built. The question is how much coverage actually is there and which files/functionality dont have tests? There may be an npm tool to help us with this (or some other library)?

- There are still naming inconsistencies across files, database functions/views/tables/indexes, variables, and function names. We could use grep to scan for known ones to replace them. Look out for the old terms 'holding' which is a portfolio fund (becaseu it is an instance of a fund belonging to a portfolio), 'account' which is a portfolio or product, and 'activities' which are transactions.

- IRR calculation functinoality is functional but very messy. Expect there to be minimum DRY, complex to follow, and poor naming/inconsistent for functions. The key files are irr_cascade_service.py inside backend services and the portfolio_funds route. The latar, in particular, is extreamly verbose and messy. Other files support the functionality such a the portfolio_valuations.py and fund_valuations.py routes.

- There may be hardcoded database urls/passwords, env variables, and mock implimentations (which AI loves writting).

- There are many unused imports and SOME components which are exported but never imported. I already know some files are never used or have been deprecated in favour of working ones. Some code may also have been commented out while debugging and never removed.

- Be careful not to trust comments too wholey as many are outdated and never updated after refactors or debugging.

- Some files severely violate file size constraints. I am aiming for below 500 line file sizes ubiquitously, however this is a constant battle. Lots of funtions can probably be tranferred to service files or make up whole new servies.

- Some inline sql statements dont have readible formats

- The dedicated database client is not always used where sql is written to postgres directly

- global CSS (tailwind) is often overidden and underutilised

- some functions are hundreds of lines long. Can be split into utility functions in service files.

- Empty init files (API)

- Should not fallback to connect to the phase 1 database
