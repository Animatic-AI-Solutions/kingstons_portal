const { validateName } = require('./src/hooks/useRelationshipValidation');

// Test the validation function directly
console.log('Testing validateName with empty string:');
console.log('Result:', validateName(''));
console.log('Expected: "Name is required"');
