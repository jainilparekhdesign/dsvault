// Checklist structure follows designsystemchecklist.com (sections and topics).
// All wording here is our own. Items with `auto` are verified by the app;
// the rest are ticked by hand.

export type AutoCheck =
  | 'brand-written'
  | 'guidelines-written'
  | 'palette'
  | 'semantic-colors'
  | 'dark-theme'
  | 'contrast-text'
  | 'contrast-non-text'
  | 'color-blind-safe'
  | 'spacing-scale'
  | 'breakpoints'
  | 'type-scale'
  | 'type-readable'
  | 'line-height'
  | 'shadows'
  | 'z-index'
  | 'easings'
  | 'durations'
  | 'reduced-motion'
  | 'component';

export type ChecklistItem = {
  key: string;
  title: string;
  detail: string;
  auto?: AutoCheck;
  /** For auto items: the brand book section it reads, if any. */
  brandKey?: string;
};
export type ChecklistTopic = { key: string; title: string; items: ChecklistItem[] };
export type ChecklistSection = { key: string; title: string; topics: ChecklistTopic[] };

const item = (key: string, title: string, detail: string, extra: Partial<ChecklistItem> = {}): ChecklistItem => ({ key, title, detail, ...extra });

export const COMPONENTS = [
  'Accordion', 'Alert', 'Avatar', 'Badge', 'Button', 'Breadcrumbs', 'Calendar', 'Card', 'Carousel', 'Checkbox',
  'Divider', 'Dropdown', 'Icon', 'Image', 'Link', 'List', 'Loading indicator', 'Modal', 'Pagination', 'Progress bar',
  'Radio', 'Select', 'Skeleton', 'Switch', 'Tabs', 'Text area', 'Text field', 'Toast', 'Tooltip',
] as const;

const componentSlug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export const CHECKLIST: ChecklistSection[] = [
  {
    key: 'language',
    title: 'Design language',
    topics: [
      {
        key: 'brand',
        title: 'Brand',
        items: [
          item('language.brand.vision', 'Vision', 'A short statement of what the product is for and who it serves.', { auto: 'brand-written', brandKey: 'vision' }),
          item('language.brand.principles', 'Design principles', 'A handful of principles that help settle design decisions.', { auto: 'brand-written', brandKey: 'principles' }),
          item('language.brand.voice', 'Tone of voice', 'How the product sounds, with do and don’t examples.', { auto: 'brand-written', brandKey: 'voice' }),
          item('language.brand.terminology', 'Terminology', 'The words the product uses, and the ones it avoids.', { auto: 'brand-written', brandKey: 'terminology' }),
          item('language.brand.assets', 'Brand assets', 'Logos, marks and imagery, with where to get them.', { auto: 'brand-written', brandKey: 'assets' }),
        ],
      },
      {
        key: 'guidelines',
        title: 'Guidelines',
        items: [
          item('language.guidelines.accessibility', 'Accessibility', 'The standard you meet (for example WCAG 2.2 AA) and how you test it.', { auto: 'guidelines-written', brandKey: 'accessibility' }),
          item('language.guidelines.writing', 'Writing', 'Casing, punctuation, numbers and dates.', { auto: 'guidelines-written', brandKey: 'writing' }),
          item('language.guidelines.microcopy', 'Microcopy', 'Patterns for buttons, errors, empty states and confirmations.', { auto: 'guidelines-written', brandKey: 'microcopy' }),
          item('language.guidelines.terminology', 'Shared vocabulary', 'Names for components and patterns that design and code both use.'),
          item('language.guidelines.i18n', 'Internationalisation', 'How layouts handle longer text, other scripts and right-to-left.', { auto: 'guidelines-written', brandKey: 'i18n' }),
        ],
      },
    ],
  },
  {
    key: 'foundations',
    title: 'Foundations',
    topics: [
      {
        key: 'color',
        title: 'Color',
        items: [
          item('foundations.color.palette', 'Core palette', 'At least a background, a text color and a brand color.', { auto: 'palette' }),
          item('foundations.color.semantic', 'Semantic colors', 'Colors named by purpose, including success, warning and error.', { auto: 'semantic-colors' }),
          item('foundations.color.dark', 'Dark mode', 'Every color has a considered dark value.', { auto: 'dark-theme' }),
          item('foundations.color.contrast', 'Text contrast', 'Every declared text pair passes WCAG 2.2 AA in every theme.', { auto: 'contrast-text' }),
          item('foundations.color.non-text', 'Non-text contrast', 'Borders, focus rings and icons reach 3:1 against their background.', { auto: 'contrast-non-text' }),
          item('foundations.color.cvd', 'Color-blind safety', 'Status colors differ in lightness, not only in hue.', { auto: 'color-blind-safe' }),
          item('foundations.color.guidelines', 'Color guidelines', 'When to use each color, and what never to combine.', { auto: 'guidelines-written', brandKey: 'color' }),
        ],
      },
      {
        key: 'layout',
        title: 'Layout',
        items: [
          item('foundations.layout.units', 'Units', 'A base unit that all spacing derives from.'),
          item('foundations.layout.grid', 'Grid', 'Columns, gutters and margins for each screen size.'),
          item('foundations.layout.breakpoints', 'Breakpoints', 'Named widths where the layout changes.', { auto: 'breakpoints' }),
          item('foundations.layout.spacing', 'Spacing scale', 'A fixed set of spacing steps.', { auto: 'spacing-scale' }),
        ],
      },
      {
        key: 'typography',
        title: 'Typography',
        items: [
          item('foundations.type.scale', 'Type scale', 'Named styles from display to caption.', { auto: 'type-scale' }),
          item('foundations.type.responsive', 'Responsive type', 'How sizes change between small and large screens.'),
          item('foundations.type.grid', 'Relation to the grid', 'Line heights that sit on the spacing unit.'),
          item('foundations.type.readability', 'Readability', 'No body text under 12px.', { auto: 'type-readable' }),
          item('foundations.type.line-height', 'Line height', 'Running text has a line height of at least 1.2×.', { auto: 'line-height' }),
          item('foundations.type.performance', 'Font performance', 'Few weights, subset files and a sensible fallback stack.'),
          item('foundations.type.guidelines', 'Type guidelines', 'Which style to use where.', { auto: 'guidelines-written', brandKey: 'type' }),
        ],
      },
      {
        key: 'elevation',
        title: 'Elevation',
        items: [
          item('foundations.elevation.shadows', 'Shadows or borders', 'A defined way to show depth: shadow tokens, or a stated rule to use borders.', { auto: 'shadows' }),
          item('foundations.elevation.surfaces', 'Surface colors', 'Background colors for raised layers.'),
          item('foundations.elevation.z-index', 'Z-index scale', 'Named layers for dropdowns, overlays and toasts.', { auto: 'z-index' }),
        ],
      },
      {
        key: 'motion',
        title: 'Motion',
        items: [
          item('foundations.motion.easing', 'Easing', 'Named easing curves.', { auto: 'easings' }),
          item('foundations.motion.duration', 'Duration', 'Named durations for small and large changes.', { auto: 'durations' }),
          item('foundations.motion.reduced', 'Reduced motion', 'Every duration has a reduced-motion value.', { auto: 'reduced-motion' }),
          item('foundations.motion.guidelines', 'Motion guidelines', 'What moves, and why.', { auto: 'guidelines-written', brandKey: 'motion' }),
        ],
      },
      {
        key: 'iconography',
        title: 'Iconography',
        items: [
          item('foundations.icons.accessibility', 'Accessible icons', 'Icons that carry meaning have text labels.'),
          item('foundations.icons.style', 'Style', 'Stroke, corners and fill rules.'),
          item('foundations.icons.naming', 'Naming', 'A naming pattern for the icon set.'),
          item('foundations.icons.grid', 'Icon grid', 'Sizes that fit the layout grid.'),
          item('foundations.icons.keywords', 'Keywords', 'Search keywords for each icon.'),
          item('foundations.icons.reserved', 'Reserved icons', 'Icons kept for one meaning only.'),
          item('foundations.icons.guidelines', 'Icon guidelines', 'When to use an icon, and when not to.', { auto: 'guidelines-written', brandKey: 'iconography' }),
        ],
      },
    ],
  },
  {
    key: 'components',
    title: 'Components',
    topics: [
      {
        key: 'library',
        title: 'Component library',
        items: COMPONENTS.map((c) => item(`components.${componentSlug(c)}`, c, 'Has a live preview with no axe issues in either theme, and every keyboard, screen-reader and component check ticked.', { auto: 'component', brandKey: c })),
      },
    ],
  },
  {
    key: 'maintenance',
    title: 'Maintenance',
    topics: [
      {
        key: 'documentation',
        title: 'Documentation',
        items: [
          item('maintenance.docs.principles', 'Principles page', 'The design principles, published where the team finds them.'),
          item('maintenance.docs.start', 'Getting started', 'How designers and developers start using the system.'),
          item('maintenance.docs.design', 'Design best practices', 'How to use the library in the design tool.'),
          item('maintenance.docs.dev', 'Development best practices', 'How to install, import and extend components.'),
          item('maintenance.docs.anatomy', 'Component anatomy', 'Each component’s parts, labelled.'),
          item('maintenance.docs.props', 'Properties', 'Each component’s props, with defaults.'),
          item('maintenance.docs.composition', 'Composition examples', 'Components combined into real patterns.'),
          item('maintenance.docs.sandbox', 'Sandbox', 'A live place to try components.'),
          item('maintenance.docs.support', 'Browser and OS support', 'Which browsers and systems are supported.'),
          item('maintenance.docs.releases', 'Release cycle', 'How often releases happen, and how versions are numbered.'),
        ],
      },
      {
        key: 'local',
        title: 'Local libraries',
        items: [
          item('maintenance.local.when', 'When to build locally', 'When a team should build its own components.'),
          item('maintenance.local.horizontal', 'Horizontal libraries', 'Shared pieces used across products.'),
          item('maintenance.local.vertical', 'Vertical libraries', 'Pieces owned by one product area.'),
          item('maintenance.local.expectations', 'Expectations', 'What local libraries must meet to stay compatible.'),
          item('maintenance.local.alignment', 'Release alignment', 'How local releases follow the core system.'),
        ],
      },
      {
        key: 'process',
        title: 'Team process',
        items: [
          item('maintenance.process.decisions', 'Decision log', 'A record of decisions and why they were made.'),
          item('maintenance.process.roadmap', 'Roadmap', 'What is planned next.'),
          item('maintenance.process.stakeholders', 'Stakeholder map', 'Who depends on the system and who decides.'),
          item('maintenance.process.analytics', 'Analytics', 'How adoption is measured.'),
          item('maintenance.process.sla', 'Service levels', 'Response times for bugs and requests.'),
        ],
      },
      {
        key: 'community',
        title: 'Community',
        items: [
          item('maintenance.community.channels', 'Support channels', 'Where people ask questions.'),
          item('maintenance.community.templates', 'Templates', 'Templates for bug reports and requests.'),
          item('maintenance.community.updates', 'Regular updates', 'Release notes and news on a steady rhythm.'),
          item('maintenance.community.hours', 'Open hours', 'Regular time to get help in person.'),
        ],
      },
      {
        key: 'contribution',
        title: 'Contribution',
        items: [
          item('maintenance.contrib.rules', 'House rules', 'The standards every contribution must meet.'),
          item('maintenance.contrib.guide', 'Contribution guide', 'Step-by-step instructions for contributing.'),
          item('maintenance.contrib.proposal', 'Proposal template', 'A template for proposing new features.'),
          item('maintenance.contrib.engagement', 'Engagement', 'How contributors are credited and kept involved.'),
        ],
      },
    ],
  },
];

export const ALL_ITEMS: ChecklistItem[] = CHECKLIST.flatMap((s) => s.topics.flatMap((t) => t.items));
