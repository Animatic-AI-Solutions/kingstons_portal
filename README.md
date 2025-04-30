# Wealth Management System API

This is the backend API for the Wealth Management System. It provides endpoints for managing clients, products, funds, and analytics.

## Prerequisites

- Python 3.8 or higher
- Supabase account with appropriate tables set up

## Installation

1. Clone the repository
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy the `.env.example` file to `.env` and update it with your Supabase credentials:

```bash
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here
SUPABASE_SECRET=your_supabase_service_role_key_here
```

## Running the API

Start the API server with:

```bash
python main.py
```

By default, the API will run on http://0.0.0.0:8000. You can configure the host and port in the `.env` file.

## API Documentation

Once running, you can access the interactive API documentation at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

For details on API URL structure and contribution guidelines, please see [CONTRIBUTING.md](CONTRIBUTING.md).

## API Endpoints

The API provides the following endpoints:

### Authentication
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Log in a user
- `POST /api/auth/logout` - Log out a user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/verify-reset-token` - Verify password reset token
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user profile

### Clients
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create a new client
- `GET /api/clients/{client_id}` - Get a specific client
- `PATCH /api/clients/{client_id}` - Update a specific client
- `DELETE /api/clients/{client_id}` - Delete a specific client

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create a new product
- `GET /api/products/{product_id}` - Get a specific product
- `PATCH /api/products/{product_id}` - Update a specific product
- `DELETE /api/products/{product_id}` - Delete a specific product

### Funds Under Management
- `GET /api/funds_under_management` - Get all funds
- `POST /api/funds_under_management` - Create a new fund
- `GET /api/funds_under_management/{fund_id}` - Get a specific fund
- `PATCH /api/funds_under_management/{fund_id}` - Update a specific fund
- `DELETE /api/funds_under_management/{fund_id}` - Delete a specific fund

### Client-Product Associations
- `GET /api/client_products` - Get all client-product associations
- `POST /api/client_products` - Create a new client-product association
- `DELETE /api/client_products/{client_id}/{product_id}` - Delete a specific client-product association

### Providers
- `GET /api/providers` - Get all providers
- `POST /api/providers` - Create a new provider
- `GET /api/providers/{provider_id}` - Get a specific provider
- `PATCH /api/providers/{provider_id}` - Update a specific provider
- `DELETE /api/providers/{provider_id}` - Delete a specific provider

### Portfolios
- `GET /api/portfolios` - Get all portfolios
- `POST /api/portfolios` - Create a new portfolio
- `GET /api/portfolios/{portfolio_id}` - Get a specific portfolio
- `PATCH /api/portfolios/{portfolio_id}` - Update a specific portfolio
- `DELETE /api/portfolios/{portfolio_id}` - Delete a specific portfolio

### Analytics
- `GET /api/analytics/product_client_counts` - Get a table of client counts per product by relationship