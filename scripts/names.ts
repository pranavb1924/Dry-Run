// Made-up cardholder names. The state publishes real names; Dry Run shows
// these instead, so no real name ever leaves the importer.

const FIRST = [
  'Aaron', 'Abigail', 'Adam', 'Aisha', 'Alan', 'Alejandro', 'Alice', 'Amanda', 'Amber', 'Amy',
  'Andrea', 'Andrew', 'Angela', 'Anna', 'Anthony', 'Ashley', 'Austin', 'Benjamin', 'Brandon', 'Brenda',
  'Brian', 'Caleb', 'Carlos', 'Carol', 'Catherine', 'Charles', 'Chloe', 'Christina', 'Christopher', 'Cynthia',
  'Daniel', 'David', 'Deborah', 'Denise', 'Diana', 'Donna', 'Dylan', 'Elena', 'Elijah', 'Elizabeth',
  'Emily', 'Emma', 'Eric', 'Ethan', 'Gabriel', 'Grace', 'Gregory', 'Hannah', 'Heather', 'Henry',
  'Isabella', 'Jacob', 'James', 'Jamal', 'Janet', 'Jason', 'Javier', 'Jennifer', 'Jessica', 'John',
  'Jonathan', 'Jordan', 'Jose', 'Joseph', 'Joshua', 'Julia', 'Justin', 'Karen', 'Katherine', 'Kayla',
  'Kevin', 'Kimberly', 'Laura', 'Lauren', 'Leah', 'Linda', 'Lucas', 'Luis', 'Madison', 'Maria',
  'Mark', 'Matthew', 'Megan', 'Melissa', 'Michael', 'Michelle', 'Mei', 'Nathan', 'Nicole', 'Noah',
  'Olivia', 'Omar', 'Patricia', 'Paul', 'Priya', 'Rachel', 'Rebecca', 'Robert', 'Ryan', 'Samantha',
  'Samuel', 'Sarah', 'Scott', 'Sophia', 'Stephanie', 'Steven', 'Susan', 'Thomas', 'Tiffany', 'Timothy',
  'Tyler', 'Victoria', 'William', 'Yusuf', 'Zachary',
];

const LAST = [
  'Adams', 'Allen', 'Alvarez', 'Anderson', 'Bailey', 'Baker', 'Bennett', 'Brooks', 'Brown', 'Campbell',
  'Carter', 'Castillo', 'Chavez', 'Chen', 'Clark', 'Collins', 'Cook', 'Cooper', 'Cox', 'Cruz',
  'Davis', 'Diaz', 'Edwards', 'Evans', 'Flores', 'Foster', 'Garcia', 'Gomez', 'Gonzalez', 'Gray',
  'Green', 'Gutierrez', 'Hall', 'Harris', 'Hernandez', 'Hill', 'Howard', 'Hughes', 'Jackson', 'James',
  'Jimenez', 'Johnson', 'Jones', 'Kelly', 'Kim', 'King', 'Lee', 'Lewis', 'Long', 'Lopez',
  'Martin', 'Martinez', 'Mendoza', 'Miller', 'Mitchell', 'Moore', 'Morales', 'Morgan', 'Morris', 'Murphy',
  'Myers', 'Nelson', 'Nguyen', 'Ortiz', 'Parker', 'Patel', 'Perez', 'Peterson', 'Phillips', 'Price',
  'Ramirez', 'Ramos', 'Reed', 'Reyes', 'Richardson', 'Rivera', 'Roberts', 'Robinson', 'Rodriguez', 'Rogers',
  'Ross', 'Ruiz', 'Sanchez', 'Sanders', 'Scott', 'Shah', 'Singh', 'Smith', 'Stewart', 'Taylor',
  'Thomas', 'Thompson', 'Torres', 'Turner', 'Walker', 'Wang', 'Ward', 'Watson', 'White', 'Williams',
  'Wilson', 'Wood', 'Wright', 'Young',
];

/**
 * Gives each real cardholder a distinct made-up name, the same ones on every
 * run. A made-up name is never given to a real person with the same last
 * name and first initial.
 */
export function fakeNames(people: readonly { readonly lastName: string; readonly firstInitial: string }[]): string[] {
  const pool = shuffled(FIRST.flatMap((first) => LAST.map((last) => `${first} ${last}`)));
  const result: string[] = [];
  const skipped: string[] = [];
  let next = 0;

  for (const person of people) {
    const reuse = skipped.findIndex((name) => !resembles(name, person));
    if (reuse !== -1) {
      result.push(skipped.splice(reuse, 1)[0] ?? '');
      continue;
    }
    for (;;) {
      const name = pool[next++];
      if (name === undefined) {
        throw new Error(`Only ${pool.length} made-up names for ${people.length} cardholders`);
      }
      if (resembles(name, person)) {
        skipped.push(name);
      } else {
        result.push(name);
        break;
      }
    }
  }
  return result;
}

function resembles(name: string, person: { readonly lastName: string; readonly firstInitial: string }): boolean {
  const [first = '', last = ''] = name.toUpperCase().split(' ');
  return last === person.lastName.toUpperCase() && first[0] === person.firstInitial.toUpperCase();
}

/** Shuffles a copy with a fixed seed, so the order looks random but never changes. */
function shuffled(names: readonly string[]): string[] {
  const result = [...names];
  let seed = 2026;
  const random = (): number => {
    // mulberry32, a small, well-known seeded random number generator.
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = result[i] ?? '';
    result[i] = result[j] ?? '';
    result[j] = swap;
  }
  return result;
}
