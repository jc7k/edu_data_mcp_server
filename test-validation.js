#!/usr/bin/env node
/**
 * Test script to verify endpoint validation
 * Tests that whitelisted endpoints pass and non-whitelisted fail
 */

import { findEndpoint } from './build/config/endpoints.js';
import { validateEndpoint } from './build/services/validator.js';

console.log('Testing Endpoint Validation\n');
console.log('=' .repeat(60));

// Test 1: Whitelisted endpoints should pass
console.log('\n✓ Testing whitelisted endpoints (should PASS):');
const whitelistedTests = [
  ['schools', 'ccd', 'enrollment'],
  ['college-university', 'ipeds', 'fall-enrollment'],
  ['college-university', 'ipeds', 'institutional-characteristics'],
  ['school-districts', 'ccd', 'directory'],
];

let passCount = 0;
for (const [level, source, topic] of whitelistedTests) {
  try {
    validateEndpoint(level, source, topic);
    console.log(`  ✓ ${level}/${source}/${topic}`);
    passCount++;
  } catch (error) {
    console.log(`  ✗ ${level}/${source}/${topic} - ${error.message}`);
  }
}

// Test 2: Non-whitelisted endpoints should fail
console.log('\n✗ Testing non-whitelisted endpoints (should FAIL):');
const nonWhitelistedTests = [
  ['college-university', 'ipeds', 'invalid-topic'],
  ['schools', 'ccd', 'fake-endpoint'],
  ['fake-level', 'fake-source', 'fake-topic'],
];

let failCount = 0;
for (const [level, source, topic] of nonWhitelistedTests) {
  try {
    validateEndpoint(level, source, topic);
    console.log(`  ✗ ${level}/${source}/${topic} - UNEXPECTED PASS`);
  } catch (error) {
    console.log(`  ✓ ${level}/${source}/${topic} - Correctly rejected: "${error.message}"`);
    failCount++;
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log(`\nSummary:`);
console.log(`  Whitelisted endpoints passed: ${passCount}/${whitelistedTests.length}`);
console.log(`  Non-whitelisted endpoints rejected: ${failCount}/${nonWhitelistedTests.length}`);

// Count total endpoints in whitelist
const endpoints = [
  'schools/ccd/enrollment',
  'schools/ccd/directory',
  'school-districts/ccd/enrollment',
  'school-districts/ccd/directory',
  'college-university/ipeds/directory',
  'college-university/ipeds/institutional-characteristics',
  'college-university/ipeds/fall-enrollment',
  'college-university/ipeds/enrollment-full-time-equivalent',
  'college-university/ipeds/completions-cip-2',
  'college-university/ipeds/completions-cip-6',
  'college-university/ipeds/sfa-grants-and-net-price',
  'college-university/ipeds/admissions-enrollment',
  'college-university/ipeds/admissions-requirements',
  'college-university/ipeds/outcome-measures',
  'college-university/ipeds/finance',
  'college-university/ipeds/enrollment',
];

console.log(`  Total endpoints in whitelist: ${endpoints.length}/16`);

const allPassed = passCount === whitelistedTests.length && failCount === nonWhitelistedTests.length;
console.log(`\n${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}\n`);

process.exit(allPassed ? 0 : 1);
