# Frontend API Path Update Checklist

Generated: 2025-12-02T11:31:15.566268

## Summary

- Files requiring updates: 10
- Total API calls to update: 47

## Priority Order

Service files are listed first as they impact multiple components.

### `src\components\AddProviderModal.tsx` (1 updates)

- [ ] **Line 107**: `/api/available_providers` -> `/api/available-providers`
  - Context: `const response = await api.post('/api/available_providers', formData);`

### `src\pages\AccountIRRCalculation.tsx` (2 updates)

- [ ] **Line 1101**: `/api/client_products/${accountId}/complete` -> `/api/client-products/${accountId}/complete`
  - Context: `const accountResponse = await api.get(`/api/client_products/${accountId}/complete`);`

- [ ] **Line 1701**: `/api/client_products/${account.id}` -> `/api/client-products/${account.id}`
  - Context: `await api.patch(`/api/client_products/${account.id}`, { notes: account.notes });`

### `src\pages\AccountIRRHistory.tsx` (1 updates)

- [ ] **Line 200**: `/api/client_products/${accountId}/complete` -> `/api/client-products/${accountId}/complete`
  - Context: `const completeProductResponse = await api.get(`/api/client_products/${accountId}/complete`);`

### `src\pages\ClientDetails.tsx` (1 updates)

- [ ] **Line 1550**: `/api/client_products/${productId}` -> `/api/client-products/${productId}`
  - Context: `await api.patch(`/api/client_products/${productId}`, data);`

### `src\pages\CreateClientProducts.tsx` (12 updates)

- [ ] **Line 470**: `/api/client_groups` -> `/api/client-groups`
  - Context: `api.get('/api/client_groups'),`

- [ ] **Line 471**: `/api/available_providers` -> `/api/available-providers`
  - Context: `api.get('/api/available_providers'),`

- [ ] **Line 473**: `/api/available_portfolios` -> `/api/available-portfolios`
  - Context: `api.get('/api/available_portfolios'),`

- [ ] **Line 474**: `/api/product_owners` -> `/api/product-owners`
  - Context: `api.get('/api/product_owners')`

- [ ] **Line 1483**: `/api/portfolios/from_template` -> `/api/portfolios/from-template`
  - Context: `const templateResponse = await api.post('/api/portfolios/from_template', {`

- [ ] **Line 1532**: `/api/portfolio_funds` -> `/api/portfolio-funds`
  - Context: `await api.post('/api/portfolio_funds', fundData);`

- [ ] **Line 1596**: `/api/client_products` -> `/api/client-products`
  - Context: `const clientProductResponse = await api.post('/api/client_products', {`

- [ ] **Line 1620**: `/api/product_owner_products` -> `/api/product-owner-products`
  - Context: `await api.post('/api/product_owner_products', {`

- [ ] **Line 1103**: `/api/available_portfolios/${templateId}/generations` -> `/api/available-portfolios/${templateId}/generations`
  - Context: `const generationsResponse = await api.get(`/api/available_portfolios/${templateId}/generations`);`

- [ ] **Line 1140**: `/api/available_portfolios/${product.portfolio.templateId}?generation_id=${generationId}` -> `/api/available-portfolios/${product.portfolio.templateId}?generation-id=${generationId}`
  - Context: `const response = await api.get(`/api/available_portfolios/${product.portfolio.templateId}?generation`

- [ ] **Line 1558**: `/api/portfolio_funds` -> `/api/portfolio-funds`
  - Context: `const portfolioFundsResponse = await api.get(`/api/portfolio_funds`, {`

- [ ] **Line 1568**: `/api/portfolio_funds/${cashFundEntry.id}` -> `/api/portfolio-funds/${cashFundEntry.id}`
  - Context: `await api.patch(`/api/portfolio_funds/${cashFundEntry.id}`, {`

### `src\pages\ProductDetails.tsx` (1 updates)

- [ ] **Line 188**: `/api/client_products/${productId}/complete` -> `/api/client-products/${productId}/complete`
  - Context: `const response = await api.get(`/api/client_products/${productId}/complete`);`

### `src\pages\ProductOverview.tsx` (17 updates)

- [ ] **Line 441**: `/api/available_portfolios/template-portfolio-generations/active` -> `/api/available-portfolios/template-portfolio-generations/active`
  - Context: `api.get('/api/available_portfolios/template-portfolio-generations/active')`

- [ ] **Line 2084**: `/api/product_owner_products` -> `/api/product-owner-products`
  - Context: `//         await api.post('/api/product_owner_products', {`

- [ ] **Line 462**: `/api/client_products/${accountId}/complete` -> `/api/client-products/${accountId}/complete`
  - Context: `const response = await api.get(`/api/client_products/${accountId}/complete`);`

- [ ] **Line 519**: `/api/available_portfolios/batch/generation-with-funds/${completeData.template_generation_id}` -> `/api/available-portfolios/batch/generation-with-funds/${completeData.template-generation-id}`
  - Context: `const batchResponse = await api.get(`/api/available_portfolios/batch/generation-with-funds/${complet`

- [ ] **Line 729**: `/api/portfolios/${completeData.portfolio_id}/latest-irr` -> `/api/portfolios/${completeData.portfolio-id}/latest-irr`
  - Context: `const irrResponse = await api.get(`/api/portfolios/${completeData.portfolio_id}/latest-irr`);`

- [ ] **Line 1177**: `/api/portfolios/${account.portfolio_id}/calculate-irr` -> `/api/portfolios/${account.portfolio-id}/calculate-irr`
  - Context: `await api.post(`/api/portfolios/${account.portfolio_id}/calculate-irr`);`

- [ ] **Line 1214**: `/api/portfolios/${account.portfolio_id}/calculate-irr` -> `/api/portfolios/${account.portfolio-id}/calculate-irr`
  - Context: `await api.post(`/api/portfolios/${account.portfolio_id}/calculate-irr`);`

- [ ] **Line 1286**: `/api/portfolios/${account.portfolio_id}/calculate-irr` -> `/api/portfolios/${account.portfolio-id}/calculate-irr`
  - Context: `await api.post(`/api/portfolios/${account.portfolio_id}/calculate-irr`);`

- [ ] **Line 1327**: `/api/portfolios/${account.portfolio_id}/calculate-irr` -> `/api/portfolios/${account.portfolio-id}/calculate-irr`
  - Context: `await api.post(`/api/portfolios/${account.portfolio_id}/calculate-irr`);`

- [ ] **Line 1439**: `/api/portfolios/${account.portfolio_id}/calculate-irr` -> `/api/portfolios/${account.portfolio-id}/calculate-irr`
  - Context: `await api.post(`/api/portfolios/${account.portfolio_id}/calculate-irr`);`

- [ ] **Line 1509**: `/api/product_owner_products/product/${accountId}` -> `/api/product-owner-products/product/${accountId}`
  - Context: `await api.delete(`/api/product_owner_products/product/${accountId}`);`

- [ ] **Line 1517**: `/api/client_products/${accountId}` -> `/api/client-products/${accountId}`
  - Context: `await api.delete(`/api/client_products/${accountId}`);`

- [ ] **Line 1995**: `/api/client_products/${accountId}` -> `/api/client-products/${accountId}`
  - Context: `const response = await api.patch(`/api/client_products/${accountId}`, updateData);`

- [ ] **Line 2007**: `/api/portfolios/${account.portfolio_id}/template` -> `/api/portfolios/${account.portfolio-id}/template`
  - Context: `await api.patch(`/api/portfolios/${account.portfolio_id}/template`, templateUpdateData);`

- [ ] **Line 2023**: `/api/client_products/${accountId}/owners` -> `/api/client-products/${accountId}/owners`
  - Context: `await api.patch(`/api/client_products/${accountId}/owners`, ownersUpdateData);`

- [ ] **Line 2062**: `/api/client_products/${accountId}` -> `/api/client-products/${accountId}`
  - Context: `//       await api.patch(`/api/client_products/${accountId}`, updateData);`

- [ ] **Line 2074**: `/api/product_owner_products/${ownerId}/${accountId}` -> `/api/product-owner-products/${ownerId}/${accountId}`
  - Context: `//         await api.delete(`/api/product_owner_products/${ownerId}/${accountId}`);`

### `src\pages\ProductOwnerDetails.tsx` (7 updates)

- [ ] **Line 124**: `/api/client_products_with_owners` -> `/api/client-products-with-owners`
  - Context: `const response = await api.get('/api/client_products_with_owners');`

- [ ] **Line 149**: `/api/product_owner_products` -> `/api/product-owner-products`
  - Context: `api.post('/api/product_owner_products', {`

- [ ] **Line 78**: `/api/product_owners/${numericId}` -> `/api/product-owners/${numericId}`
  - Context: `const response = await api.get(`/api/product_owners/${numericId}`);`

- [ ] **Line 113**: `/api/product_owners/${ownerId}/products` -> `/api/product-owners/${ownerId}/products`
  - Context: `const response = await api.get(`/api/product_owners/${ownerId}/products`);`

- [ ] **Line 188**: `/api/product_owner_products/${productOwner.id}/${productId}` -> `/api/product-owner-products/${productOwner.id}/${productId}`
  - Context: `await api.delete(`/api/product_owner_products/${productOwner.id}/${productId}`);`

- [ ] **Line 263**: `/api/product_owners/${productOwner.id}` -> `/api/product-owners/${productOwner.id}`
  - Context: `const response = await api.patch(`/api/product_owners/${productOwner.id}`, updateData);`

- [ ] **Line 293**: `/api/product_owners/${productOwner.id}` -> `/api/product-owners/${productOwner.id}`
  - Context: `await api.delete(`/api/product_owners/${productOwner.id}`);`

### `src\pages\ProductOwners.tsx` (4 updates)

- [ ] **Line 44**: `/api/product_owners` -> `/api/product-owners`
  - Context: `api.get('/api/product_owners'),`

- [ ] **Line 45**: `/api/client_products` -> `/api/client-products`
  - Context: `api.get('/api/client_products')`

- [ ] **Line 104**: `/api/product_owners` -> `/api/product-owners`
  - Context: `const response = await api.post('/api/product_owners', {`

- [ ] **Line 123**: `/api/product_owner_products` -> `/api/product-owner-products`
  - Context: `return api.post('/api/product_owner_products', {`

### `src\pages\ReportDisplayPage.tsx` (1 updates)

- [ ] **Line 88**: `/api/client_groups/${id}` -> `/api/client-groups/${id}`
  - Context: `const response = await api.get(`/api/client_groups/${id}`);`

