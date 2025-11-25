We were debugging an issue with the irr caluclations in the product irr caluclation page where irrs were calculating inocrrectly, we introduced some debugging and realised soething is wrong  with deactivating and reactivating funds with how irrs are being caluclated after deactivating and reactivating teh funds

i have done some testing and it seemed that when I reactivate a fund using the
      reactivate button in the monthly activities table the portfolio IRR is
      recalculated but the fund being reactivated is not included in the calculation,
      i have attached the  bakend logs for context 