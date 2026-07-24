import { userInfo } from 'node:os';

/** Curated demo spots near Best Buy HQ (Richfield, MN). */
export const DEMO_SANDWICHES = [
  {
    name: 'Ike\'s Love & Sandwiches',
    item: 'Menage a Trois', // replaced at runtime with "The <Username>"
    price: '$14.49',
    eta: '25–35 min',
    distance: '2.1 mi',
    url: 'https://www.doordash.com/search/store/Ike%27s%20Love%20%26%20Sandwiches',
    description:
      'A Dutch-crunch legend built for you: stacked meats, melted cheese, and Ike\'s secret sauce. Privilege never tasted so carb-loaded.',
    personalized: true,
  },
  {
    name: 'Potbelly Sandwich Shop',
    item: 'A Wreck',
    price: '$11.29',
    eta: '20–30 min',
    distance: '1.4 mi',
    url: 'https://www.doordash.com/search/store/Potbelly',
    description:
      'Salami, roast beef, turkey, ham, and swiss — a five-meat pileup on a warm, toasty roll. Chaos, but make it lunch.',
  },
  {
    name: 'Jersey Mike\'s',
    item: 'Mike\'s Way Club',
    price: '$12.75',
    eta: '22–32 min',
    distance: '1.8 mi',
    url: 'https://www.doordash.com/search/store/Jersey%20Mike%27s',
    description:
      'Turkey, ham, and provolone, sliced fresh and dunked Mike\'s Way — onions, lettuce, tomatoes, oil, vinegar, spices.',
  },
  {
    name: 'Jimmy John\'s',
    item: 'Bootlegger Club',
    price: '$10.99',
    eta: '18–28 min',
    distance: '0.9 mi',
    url: 'https://www.doordash.com/search/store/Jimmy%20John%27s',
    description:
      'Roast beef, turkey, and swiss on French bread. Freaky fast energy for when sudo can\'t wait.',
  },
  {
    name: 'Which Wich',
    item: 'The Wicked',
    price: '$12.49',
    eta: '24–34 min',
    distance: '2.4 mi',
    url: 'https://www.doordash.com/search/store/Which%20Wich',
    description:
      'Turkey, ham, salami, and cheddar with a kick. Custom-built on a soft wheat roll — wicked by name, lunch by nature.',
  },
  {
    name: 'Subway',
    item: 'Italian B.M.T.',
    price: '$9.49',
    eta: '15–25 min',
    distance: '0.6 mi',
    url: 'https://www.doordash.com/search/store/Subway',
    description:
      'Genoa salami, spicy pepperoni, and black forest ham. The classic footlong protocol — reliable, familiar, everywhere.',
  },
  {
    name: 'Firehouse Subs',
    item: 'Hook & Ladder',
    price: '$11.79',
    eta: '20–30 min',
    distance: '1.7 mi',
    url: 'https://www.doordash.com/search/store/Firehouse%20Subs',
    description:
      'Smoked turkey breast, Virginia honey ham, and melted swiss on a toasted sub. Steamed, stacked, firefighter-approved.',
  },
  {
    name: 'Cousin Willy\'s',
    item: 'Italian Stallion',
    price: '$13.25',
    eta: '28–38 min',
    distance: '3.2 mi',
    url: 'https://www.doordash.com/search/store/Cousin%20Willy%27s',
    description:
      'A Twin Cities Italian heavyweight: cured meats, provolone, and house giardiniera. Bring your appetite and a napkin.',
  },
  {
    name: 'Cubby\'s',
    item: 'The Cubano',
    price: '$12.95',
    eta: '30–40 min',
    distance: '4.1 mi',
    url: 'https://www.doordash.com/search/store/Cubby%27s',
    description:
      'Mojo pork, ham, swiss, pickles, and mustard pressed until crispy. Havana energy, Midwest delivery radius.',
  },
  {
    name: 'Mastel\'s Sandwich Shop',
    item: 'Turkey Avocado',
    price: '$11.50',
    eta: '32–42 min',
    distance: '5.0 mi',
    url: 'https://www.doordash.com/search/store/Mastel%27s',
    description:
      'Roasted turkey, creamy avocado, and crisp veggies on fresh bread. Clean, green, and quietly excellent.',
  },
  {
    name: 'Emily\'s Lebanese Deli',
    item: 'Chicken Shawarma Wrap',
    price: '$13.99',
    eta: '35–45 min',
    distance: '6.2 mi',
    url: 'https://www.doordash.com/search/store/Emily%27s%20Lebanese%20Deli',
    description:
      'Spiced shawarma chicken, garlic sauce, pickles, and warm flatbread. Minneapolis institution energy in every bite.',
  },
  {
    name: 'Gandhi Mahal',
    item: 'Tikka Wrap',
    price: '$14.25',
    eta: '40–50 min',
    distance: '7.1 mi',
    url: 'https://www.doordash.com/search/store/Gandhi%20Mahal',
    description:
      'Tandoori-spiced chicken tikka tucked in a wrap with cooling chutney. Curry-house comfort, sandwich format.',
  },
  {
    name: 'The Bad Waitress',
    item: 'Patty Melt',
    price: '$15.50',
    eta: '38–48 min',
    distance: '6.8 mi',
    url: 'https://www.doordash.com/search/store/The%20Bad%20Waitress',
    description:
      'Smashburger, caramelized onions, and swiss on griddled rye. Diner decadence with a side of attitude.',
  },
  {
    name: 'Revival',
    item: 'Hot Chicken Sandwich',
    price: '$16.00',
    eta: '35–45 min',
    distance: '5.5 mi',
    url: 'https://www.doordash.com/search/store/Revival',
    description:
      'Nashville-hot fried chicken, pickles, and soft bread. Heat level: escalate carefully.',
  },
  {
    name: 'The Crooked Pint',
    item: 'Pub Club',
    price: '$13.75',
    eta: '25–35 min',
    distance: '2.9 mi',
    url: 'https://www.doordash.com/search/store/The%20Crooked%20Pint',
    description:
      'Triple-decker turkey, bacon, and cheddar. Pub fare that doesn\'t require leaving your terminal.',
  },
  {
    name: 'Davanni\'s Pizza & Hot Hoagies',
    item: 'Pepperoni Hot Hoagie',
    price: '$12.29',
    eta: '22–32 min',
    distance: '1.5 mi',
    url: 'https://www.doordash.com/search/store/Davanni%27s',
    description:
      'Melty pepperoni and mozzarella in a toasted Minnesota hot hoagie. Pizza\'s cousin who lifts.',
  },
  {
    name: 'Cossetta\'s',
    item: 'Italian Sub',
    price: '$14.95',
    eta: '40–50 min',
    distance: '8.0 mi',
    url: 'https://www.doordash.com/search/store/Cossetta',
    description:
      'Old-school Italian meats and cheeses from a St. Paul landmark. Worth the ETA for the deli cred alone.',
  },
  {
    name: 'Cecil\'s Deli',
    item: 'Corned Beef on Rye',
    price: '$15.25',
    eta: '30–40 min',
    distance: '4.6 mi',
    url: 'https://www.doordash.com/search/store/Cecil%27s%20Deli',
    description:
      'Hand-sliced corned beef piled high on rye. Classic deli architecture — no fancy forks required.',
  },
  {
    name: 'Punch Pizza',
    item: 'Meatball Sub',
    price: '$12.50',
    eta: '26–36 min',
    distance: '2.2 mi',
    url: 'https://www.doordash.com/search/store/Punch%20Pizza',
    description:
      'House meatballs, marinara, and mozzarella in a toasted roll. Neapolitan spirit, submarine form factor.',
  },
  {
    name: 'Blue Door Pub',
    item: 'Juicy Blucy',
    price: '$14.75',
    eta: '34–44 min',
    distance: '5.8 mi',
    url: 'https://www.doordash.com/search/store/Blue%20Door%20Pub',
    description:
      'Minnesota\'s cheese-stuffed juicy lucy in sandwich glory. Order once, regret nothing, maybe need a nap.',
  },
];

/** Title-case a username: `david_vatz` → `David Vatz`, `vatz` → `Vatz`. */
export function titleCaseUsername(raw) {
  const base = String(raw || '')
    .trim()
    .replace(/^.*[/\\]/, ''); // drop path-like prefixes
  if (!base) return 'You';
  return base
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function currentUsername() {
  try {
    const fromOs = userInfo()?.username;
    if (fromOs) return fromOs;
  } catch {
    // ignore
  }
  return (
    process.env.SUDO_USER ||
    process.env.USER ||
    process.env.LOGNAME ||
    process.env.USERNAME ||
    'you'
  );
}

function personalizedName() {
  return `The ${titleCaseUsername(currentUsername())}`;
}

function withPersonalizedItem(entry) {
  if (!entry?.personalized) return { ...entry };
  const who = titleCaseUsername(currentUsername());
  return {
    ...entry,
    item: personalizedName(),
    description: `A Dutch-crunch legend built for ${who}: stacked meats, melted cheese, and Ike's secret sauce. Privilege never tasted so carb-loaded.`,
  };
}

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Pick up to `count` sandwiches. Always includes the personalized
 * "The <Username>" entry when present in the pool.
 */
export function pickRandomSandwiches(count = 5, pool = DEMO_SANDWICHES) {
  const n = Math.min(count, pool.length);
  const featured = pool.find((s) => s.personalized);
  const rest = pool.filter((s) => !s.personalized);

  if (!featured) {
    return shuffle(pool).slice(0, n).map((s) => ({ ...s }));
  }

  const others = shuffle(rest).slice(0, Math.max(0, n - 1));
  return shuffle([withPersonalizedItem(featured), ...others.map((s) => ({ ...s }))]);
}
