import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const landingSource = readFileSync(path.join(process.cwd(), 'src/pages/LandingPage.tsx'), 'utf8');
const stylesheetSource = readFileSync(path.join(process.cwd(), 'src/index.css'), 'utf8');
const indexSource = readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
const appSource = readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
const authSource = readFileSync(path.join(process.cwd(), 'src/pages/AuthPage.tsx'), 'utf8');
const topBarSource = readFileSync(path.join(process.cwd(), 'src/components/layout/TopBar.tsx'), 'utf8');

test('landing page keeps the existing authentication callbacks and adds the product narrative sections', () => {
  assert.match(landingSource, /onNavigateToAuth: \(\) => void/);
  assert.match(landingSource, /onNavigateToApp: \(\) => void/);
  assert.match(landingSource, /onClick=\{primaryAction\}/);
  assert.match(landingSource, /id="hero-primary-cta"/);
  assert.match(landingSource, /id="capabilities"/);
  assert.match(landingSource, /id="why-orbit"/);
  assert.match(landingSource, /id="workflow"/);
  assert.match(landingSource, /id="security"/);
  assert.match(landingSource, /id="resources"/);
  assert.match(landingSource, /Source traceability/);
  assert.match(landingSource, /Digital Twin infrastructure impact/);
  assert.match(landingSource, /deterministic scenarios/);
});

test('landing navigation stays anchor-based and does not add routes or fabricated metrics', () => {
  assert.match(landingSource, /href: '#why-orbit'/);
  assert.match(landingSource, /href: '#capabilities'/);
  assert.match(landingSource, /href: '#workflow'/);
  assert.match(landingSource, /href: '#security'/);
  assert.doesNotMatch(landingSource, /98%|150\+|24\/7|customers|certified|uptime/);
  assert.doesNotMatch(landingSource, /window\.history|navigate\('\/\w/);
});

test('How ORBIT works uses one non-wrapping desktop flow with in-flow connectors', () => {
  const workflowSection = landingSource.slice(landingSource.indexOf('<section id="workflow"'), landingSource.indexOf('<section id="security"'));

  assert.match(workflowSection, /lg:flex-row/);
  assert.match(workflowSection, /lg:flex-nowrap/);
  assert.match(workflowSection, /lg:items-stretch/);
  assert.match(workflowSection, /<ArrowRight className="hidden h-4 w-4 lg:block"/);
  assert.match(workflowSection, /<ArrowDown className="h-4 w-4 lg:hidden"/);
  assert.doesNotMatch(workflowSection, /lg:grid-cols|lg:grid|absolute|grid-row|grid-column|nth-child|lg:gap-0/);
});

test('ORBIT uses one permanent dark theme with no user-facing theme switch', () => {
  assert.doesNotMatch(`${landingSource}${appSource}${authSource}${topBarSource}`, /ThemeProvider|ThemeToggle|Switch to light mode|Switch to dark mode/);
  assert.doesNotMatch(stylesheetSource, /html\.light|prefers-color-scheme:dark|--bg-primary: #eef1f3/);
  assert.match(stylesheetSource, /color-scheme: dark/);
  assert.match(stylesheetSource, /@custom-variant dark/);
  assert.match(indexSource, /<html lang="en" class="dark">/);
  assert.match(stylesheetSource, /prefers-reduced-motion: no-preference/);
  assert.match(stylesheetSource, /landing-network-grid/);
});

test('ORBIT favicon is wired to the static application shell', () => {
  assert.match(indexSource, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg" \/>/);
  assert.match(readFileSync(path.join(process.cwd(), 'public/favicon.svg'), 'utf8'), /<title>ORBIT<\/title>/);
});
