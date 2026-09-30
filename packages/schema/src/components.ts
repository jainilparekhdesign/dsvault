import { z } from 'zod';
import { COMPONENTS } from './checklist';

export const componentProp = z.object({
  name: z.string(),
  type: z.string().default('string'),
  default: z.string().default(''),
  description: z.string().default(''),
});

export const component = z.object({
  id: z.string().min(1),
  name: z.string(),
  /** Which checklist component this documents, e.g. "Button"; empty for custom components. */
  kind: z.string().default(''),
  description: z.string().default(''),
  anatomy: z.string().default(''),
  props: z.array(componentProp).default([]),
  variants: z.array(z.string()).default([]),
  states: z.array(z.string()).default([]),
  /** Preview markup, rendered in a sandboxed frame with the system's tokens as CSS variables. */
  html: z.string().default(''),
  css: z.string().default(''),
  /** Usage code shown to developers (any framework). */
  code: z.string().default(''),
  /** Criteria keys ticked by hand (keyboard, screen reader, component-specific). */
  checks: z.record(z.string(), z.boolean()).default({}),
  /** Last automated axe run on the preview: number of violations, per theme. */
  axe: z.object({ light: z.number().nullable(), dark: z.number().nullable(), at: z.string() }).nullable().default(null),
});

export type ComponentProp = z.infer<typeof componentProp>;
export type Component = z.infer<typeof component>;

export type Criterion = { key: string; text: string };

// Every component gets the keyboard and screen-reader basics…
export const BASE_CRITERIA: Criterion[] = [
  { key: 'kbd', text: 'Every interactive part is reachable and usable with the keyboard alone.' },
  { key: 'focus', text: 'Focus is always visible and never trapped by accident.' },
  { key: 'name', text: 'A screen reader announces a clear name, role and state.' },
  { key: 'contrast', text: 'Text and meaningful edges meet contrast in both themes.' },
  { key: 'motion', text: 'Any animation respects reduced motion.' },
];

// …plus criteria specific to what it is. Wording is our own.
export const COMPONENT_CRITERIA: Record<string, Criterion[]> = {
  Accordion: [{ key: 'trigger', text: 'Headers are buttons with aria-expanded and aria-controls.' }, { key: 'multi', text: 'It’s clear whether one or many sections can be open.' }],
  Alert: [{ key: 'live', text: 'Urgent alerts use role="alert"; others use role="status".' }, { key: 'icon', text: 'Severity is shown with an icon or word, not color alone.' }],
  Avatar: [{ key: 'alt', text: 'Images have alt text; initials have an accessible name.' }, { key: 'fallback', text: 'A fallback shows when the image fails.' }],
  Badge: [{ key: 'text', text: 'Meaning is readable as text, not only a colored dot.' }, { key: 'count', text: 'Counts have context for screen readers (for example “3 unread”).' }],
  Button: [{ key: 'target', text: 'The hit area is at least 24 by 24 px; 44 by 44 on touch.' }, { key: 'states', text: 'Hover, focus, pressed, disabled and loading are all designed.' }, { key: 'label', text: 'Icon-only buttons have an accessible label.' }],
  Breadcrumbs: [{ key: 'nav', text: 'Wrapped in a nav with an accessible name.' }, { key: 'current', text: 'The current page has aria-current="page".' }],
  Calendar: [{ key: 'grid', text: 'Days use a grid with arrow-key movement.' }, { key: 'labels', text: 'Each day announces its full date.' }],
  Card: [{ key: 'link', text: 'A whole-card link has one clear target, not nested links.' }, { key: 'heading', text: 'The title is a real heading at the right level.' }],
  Carousel: [{ key: 'pause', text: 'Auto-advance can be paused and stops on focus or hover.' }, { key: 'controls', text: 'Previous and next controls are buttons with labels.' }],
  Checkbox: [{ key: 'label', text: 'Clicking the label toggles the box.' }, { key: 'mixed', text: 'The mixed state is supported where groups need it.' }],
  Divider: [{ key: 'decorative', text: 'Decorative dividers are hidden from screen readers.' }],
  Dropdown: [{ key: 'menu', text: 'Arrow keys move through items; Escape closes and returns focus.' }, { key: 'expanded', text: 'The trigger reports aria-expanded.' }],
  Icon: [{ key: 'hidden', text: 'Decorative icons are aria-hidden.' }, { key: 'meaning', text: 'Meaningful icons have a text alternative.' }],
  Image: [{ key: 'alt', text: 'Alt text describes the purpose; decorative images use empty alt.' }, { key: 'ratio', text: 'Space is reserved so the layout doesn’t jump.' }],
  Link: [{ key: 'text', text: 'Link text makes sense out of context.' }, { key: 'external', text: 'Links opening a new tab say so.' }],
  List: [{ key: 'semantic', text: 'Uses real list markup.' }],
  'Loading indicator': [{ key: 'status', text: 'Announced with role="status" or aria-busy.' }, { key: 'motion', text: 'Spins or pulses slowly, and stops under reduced motion.' }],
  Modal: [{ key: 'trap', text: 'Focus moves in, stays in, and returns to the trigger on close.' }, { key: 'escape', text: 'Escape closes it.' }, { key: 'label', text: 'Has role="dialog", aria-modal and a title.' }],
  Pagination: [{ key: 'nav', text: 'Wrapped in a nav with an accessible name.' }, { key: 'current', text: 'The current page has aria-current.' }],
  'Progress bar': [{ key: 'values', text: 'Exposes aria-valuenow, min and max, or is marked indeterminate.' }],
  Radio: [{ key: 'group', text: 'Grouped in a fieldset with a legend.' }, { key: 'arrows', text: 'Arrow keys move between options.' }],
  Select: [{ key: 'native', text: 'Uses a native select, or fully matches its keyboard behaviour.' }, { key: 'label', text: 'Has a visible label.' }],
  Skeleton: [{ key: 'busy', text: 'The loading region is aria-busy; placeholders are hidden.' }],
  Switch: [{ key: 'role', text: 'Uses role="switch" with aria-checked.' }, { key: 'label', text: 'The label says what turns on, not “on/off”.' }],
  Tabs: [{ key: 'roles', text: 'Uses tablist, tab and tabpanel roles.' }, { key: 'arrows', text: 'Arrow keys move between tabs.' }],
  'Text area': [{ key: 'label', text: 'Has a visible label and error text linked with aria-describedby.' }, { key: 'resize', text: 'Can grow or resize for long text.' }],
  'Text field': [{ key: 'label', text: 'Has a visible label; placeholders never replace it.' }, { key: 'error', text: 'Errors are linked with aria-describedby and aria-invalid.' }, { key: 'autocomplete', text: 'Personal data fields use autocomplete.' }],
  Toast: [{ key: 'live', text: 'Announced through a live region.' }, { key: 'time', text: 'Stays long enough to read, and pauses on hover or focus.' }],
  Tooltip: [{ key: 'hover', text: 'Shows on focus as well as hover, and stays while hovered.' }, { key: 'escape', text: 'Escape dismisses it.' }, { key: 'extra', text: 'Holds extra hints only, never essential content.' }],
};

export function criteriaFor(kind: string): Criterion[] {
  return [...BASE_CRITERIA, ...(COMPONENT_CRITERIA[kind] ?? [])];
}

/** A component counts as done when it has a preview, a clean axe run in both themes, and every criterion ticked. */
export function componentDone(c: Component): boolean {
  const crit = criteriaFor(c.kind);
  return !!c.html.trim() && c.axe?.light === 0 && c.axe?.dark === 0 && crit.every((k) => c.checks[k.key]);
}

export const COMPONENT_KINDS = COMPONENTS;
