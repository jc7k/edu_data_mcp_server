#!/usr/bin/env node
/**
 * Validation test for all 16 whitelisted endpoints
 * Verifies the whitelist expansion is complete and validation works correctly
 */

import { validateEndpoint } from './build/services/validator.js';
import { AVAILABLE_ENDPOINTS } from './build/config/endpoints.js';

console.log('Endpoint Validation Test - Whitelist Expansion Verification\n');
console.log('='.repeat(80));

// All 16 expected whitelisted endpoints
const expectedEndpoints = [
  // CCD Endpoints (4)
  { level: 'schools', source: 'ccd', topic: 'enrollment' },
  { level: 'schools', source: 'ccd', topic: 'directory' },
  { level: 'school-districts', source: 'ccd', topic: 'enrollment' },
  { level: 'school-districts', source: 'ccd', topic: 'directory' },
  // IPEDS Endpoints (12)
  { level: 'college-university', source: 'ipeds', topic: 'directory' },
  { level: 'college-university', source: 'ipeds', topic: 'institutional-characteristics' },
  { level: 'college-university', source: 'ipeds', topic: 'fall-enrollment' },
  { level: 'college-university', source: 'ipeds', topic: 'enrollment-full-time-equivalent' },
  { level: 'college-university', source: 'ipeds', topic: 'completions-cip-2' },
  { level: 'college-university', source: 'ipeds', topic: 'completions-cip-6' },
  { level: 'college-university', source: 'ipeds', topic: 'sfa-grants-and-net-price' },
  { level: 'college-university', source: 'ipeds', topic: 'admissions-enrollment' },
  { level: 'college-university', source: 'ipeds', topic: 'admissions-requirements' },
  { level: 'college-university', source: 'ipeds', topic: 'outcome-measures' },
  { level: 'college-university', source: 'ipeds', topic: 'finance' },
  { level: 'college-university', source: 'ipeds', topic: 'enrollment' },
];

console.log('\n📊 Whitelist Statistics:\n');
console.log(`  Expected endpoints in whitelist: ${expectedEndpoints.length}`);
console.log(`  Actual endpoints in AVAILABLE_ENDPOINTS: ${AVAILABLE_ENDPOINTS.length}`);

console.log('\n✅ Testing Whitelisted Endpoints (should all pass):\n');

let passCount = 0;
const failures = [];

expectedEndpoints.forEach((endpoint, index) => {
  const path = `${endpoint.level}/${endpoint.source}/${endpoint.topic}`;
  const num = String(index + 1).padStart(2, '0');

  try {
    validateEndpoint(endpoint.level, endpoint.source, endpoint.topic);
    console.log(`  ${num}. ✓ ${path.padEnd(60)} PASS`);
    passCount++;
  } catch (error) {
    console.log(`  ${num}. ✗ ${path.padEnd(60)} FAIL: ${error.message}`);
    failures.push({ path, error: error.message });
  }
});

console.log('\n❌ Testing Non-Whitelisted Endpoints (should all fail):\n');

const nonWhitelisted = [
  { level: 'college-university', source: 'ipeds', topic: 'invalid-topic' },
  { level: 'schools', source: 'ccd', topic: 'fake-endpoint' },
  { level: 'fake-level', source: 'fake-source', topic: 'fake-topic' },
];

let rejectCount = 0;
const unexpectedPasses = [];

nonWhitelisted.forEach((endpoint, index) => {
  const path = `${endpoint.level}/${endpoint.source}/${endpoint.topic}`;
  const num = String(index + 1).padStart(2, '0');

  try {
    validateEndpoint(endpoint.level, endpoint.source, endpoint.topic);
    console.log(`  ${num}. ✗ ${path.padEnd(60)} UNEXPECTED PASS`);
    unexpectedPasses.push(path);
  } catch (error) {
    console.log(`  ${num}. ✓ ${path.padEnd(60)} CORRECTLY REJECTED`);
    rejectCount++;
  }
});

// Summary
console.log('\n' + '='.repeat(80));
console.log('\n📋 TEST RESULTS:\n');
console.log(`  Whitelist size:                   ${AVAILABLE_ENDPOINTS.length}/16 endpoints`);
console.log(`  Whitelisted endpoints passed:     ${passCount}/${expectedEndpoints.length}`);
console.log(`  Non-whitelisted rejected:         ${rejectCount}/${nonWhitelisted.length}`);
console.log(`  Validation function active:       ${passCount > 0 ? 'YES ✓' : 'NO ✗'}`);

if (failures.length > 0) {
  console.log('\n⚠️  FAILURES:\n');
  failures.forEach(f => console.log(`  - ${f.path}: ${f.error}`));
}

if (unexpectedPasses.length > 0) {
  console.log('\n⚠️  UNEXPECTED PASSES:\n');
  unexpectedPasses.forEach(p => console.log(`  - ${p}`));
}

const success = (
  AVAILABLE_ENDPOINTS.length === 16 &&
  passCount === expectedEndpoints.length &&
  rejectCount === nonWhitelisted.length
);

console.log(`\n${success ? '✅ ALL VALIDATION TESTS PASSED' : '❌ VALIDATION TESTS FAILED'}`);
console.log('\nWhitelist expansion from 4 to 16 endpoints: ' +
  (AVAILABLE_ENDPOINTS.length === 16 ? 'COMPLETE ✓' : 'INCOMPLETE ✗'));
console.log('');

process.exit(success ? 0 : 1);
