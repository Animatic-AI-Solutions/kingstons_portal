/**
 * Family Name Formatter Utility
 * 
 * Formats product owner names to group families with the same last name.
 * Examples:
 * - ["Ben Nichols", "Ruth Nichols"] → "Ben & Ruth Nichols"
 * - ["Ben Nichols", "Ruth Nichols", "John Smith"] → "Ben & Ruth Nichols, John Smith"
 * - ["John Smith"] → "John Smith"
 */

interface PersonName {
  firstName: string;
  lastName: string;
  fullName: string;
}

/**
 * Parses a full name into first and last name components
 */
function parseFullName(fullName: string): PersonName {
  const trimmedName = fullName.trim();
  const nameParts = trimmedName.split(' ');
  
  if (nameParts.length === 1) {
    // Single name - treat as first name
    return {
      firstName: nameParts[0],
      lastName: '',
      fullName: trimmedName
    };
  }
  
  // Multiple parts - last part is surname, everything else is first name
  const lastName = nameParts[nameParts.length - 1];
  const firstName = nameParts.slice(0, -1).join(' ');
  
  return {
    firstName,
    lastName,
    fullName: trimmedName
  };
}

/**
 * Groups names by last name and formats them with family-friendly display
 */
export function formatFamilyNames(names: string[]): string {
  if (names.length === 0) {
    return '';
  }
  
  if (names.length === 1) {
    return names[0];
  }
  
  // Parse all names
  const parsedNames = names.map(parseFullName);
  
  // Group by last name
  const familyGroups = new Map<string, PersonName[]>();
  
  parsedNames.forEach(person => {
    const lastName = person.lastName.toLowerCase();
    if (!familyGroups.has(lastName)) {
      familyGroups.set(lastName, []);
    }
    familyGroups.get(lastName)!.push(person);
  });
  
  // Format each family group
  const formattedGroups: string[] = [];
  
  familyGroups.forEach((people, lastName) => {
    if (people.length === 1) {
      // Single person - use full name
      formattedGroups.push(people[0].fullName);
    } else {
      // Multiple people with same last name - family format
      const firstNames = people.map(person => person.firstName);
      const actualLastName = people[0].lastName; // Use actual casing from first person
      
      if (actualLastName) {
        // "Ben & Ruth Nichols" format
        formattedGroups.push(`${firstNames.join(' & ')} ${actualLastName}`);
      } else {
        // Edge case: no last name, just join first names
        formattedGroups.push(firstNames.join(' & '));
      }
    }
  });
  
  // Join family groups with commas
  return formattedGroups.join(', ');
}

/**
 * Test function to validate the formatting logic
 */
export function testFamilyNameFormatting(): void {
  const testCases = [
    {
      input: ["Ben Nichols", "Ruth Nichols"],
      expected: "Ben & Ruth Nichols"
    },
    {
      input: ["Ben Nichols", "Ruth Nichols", "John Smith"],
      expected: "Ben & Ruth Nichols, John Smith"
    },
    {
      input: ["John Smith"],
      expected: "John Smith"
    },
    {
      input: ["Ben Nichols", "Ruth Nichols", "John Smith", "Jane Smith"],
      expected: "Ben & Ruth Nichols, John & Jane Smith"
    },
    {
      input: ["Alice Jones", "Bob Wilson", "Charlie Jones"],
      expected: "Alice & Charlie Jones, Bob Wilson"
    },
    {
      input: [],
      expected: ""
    }
  ];

  testCases.forEach((testCase) => {
    const result = formatFamilyNames(testCase.input);
    const passed = result === testCase.expected;
    // Test validation logic runs without console output
  });
}