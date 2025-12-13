export function generateAssignments(guests: string[]): Record<string, string> {
  if (guests.length < 2) {
    throw new Error('At least 2 guests required');
  }
  
  const shuffled = [...guests];
  
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Ensure no one gets themselves
  for (let i = 0; i < shuffled.length; i++) {
    if (shuffled[i] === guests[i]) {
      if (i === shuffled.length - 1) {
        // Swap with previous
        [shuffled[i], shuffled[i - 1]] = [shuffled[i - 1], shuffled[i]];
      } else {
        // Swap with next
        [shuffled[i], shuffled[i + 1]] = [shuffled[i + 1], shuffled[i]];
      }
    }
  }
  
  const assignments: Record<string, string> = {};
  guests.forEach((guest, index) => {
    assignments[guest] = shuffled[index];
  });
  
  return assignments;
}
