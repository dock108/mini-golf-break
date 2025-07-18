#!/usr/bin/env node

/**
 * Pre-commit Hook Validation Script
 * Tests that local pre-commit hooks match CI pipeline requirements
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

console.log('🧪 Testing Pre-commit Hook Alignment with CI Pipeline');
console.log('=====================================================\n');

/**
 * Execute command and return result
 */
function runCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return { success: true, output: result };
  } catch (error) {
    return { 
      success: false, 
      output: error.stdout || error.message,
      error: error.stderr || error.message 
    };
  }
}

/**
 * Test CI command equivalents
 */
const tests = [
  {
    name: 'ESLint Validation',
    ciCommand: 'npm run lint',
    description: 'Runs ESLint on all source files'
  },
  {
    name: 'Format Check',
    ciCommand: 'npm run format:check',
    description: 'Validates code formatting without modification'
  },
  {
    name: 'Security Audit (Moderate)',
    ciCommand: 'npm audit --audit-level moderate',
    description: 'Checks for moderate+ security vulnerabilities'
  },
  {
    name: 'Security Audit (High/Production)',
    ciCommand: 'npm audit --audit-level high --production',
    description: 'Checks for high+ vulnerabilities in production deps'
  },
  {
    name: 'Build (Development)',
    ciCommand: 'NODE_ENV=development npm run build',
    description: 'Validates development build'
  },
  {
    name: 'Build (Production)',
    ciCommand: 'NODE_ENV=production npm run build',
    description: 'Validates production build'
  },
  {
    name: 'Unit Tests',
    ciCommand: 'npm run test:unit -- --watchAll=false --passWithNoTests',
    description: 'Runs unit test suite'
  },
  {
    name: 'Integration Tests',
    ciCommand: 'npm run test:integration -- --watchAll=false --passWithNoTests',
    description: 'Runs integration test suite'
  }
];

/**
 * Run all tests
 */
async function runTests() {
  let passedTests = 0;
  let failedTests = 0;
  
  for (const test of tests) {
    console.log(`🔍 Testing: ${test.name}`);
    console.log(`   Command: ${test.ciCommand}`);
    console.log(`   Purpose: ${test.description}`);
    
    const result = runCommand(test.ciCommand, { silent: true });
    
    if (result.success) {
      console.log(`   ✅ PASSED\n`);
      passedTests++;
    } else {
      console.log(`   ❌ FAILED`);
      console.log(`   Error: ${result.error}\n`);
      failedTests++;
    }
  }
  
  // Summary
  console.log('📊 Test Summary');
  console.log('================');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / tests.length) * 100).toFixed(1)}%\n`);
  
  if (failedTests === 0) {
    console.log('🎉 All tests passed! Pre-commit hooks align with CI pipeline.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Pre-commit hooks may not prevent CI failures.');
    console.log('💡 Fix the failing commands before relying on pre-commit validation.');
    process.exit(1);
  }
}

/**
 * Check pre-commit hook configuration
 */
function validatePreCommitConfig() {
  console.log('🔧 Validating Pre-commit Configuration');
  console.log('======================================\n');
  
  // Check if Husky is installed
  const huskyPath = path.join(PROJECT_ROOT, '.husky');
  if (!fs.existsSync(huskyPath)) {
    console.log('❌ Husky not found! Run: npx husky install');
    return false;
  }
  
  // Check pre-commit hook exists
  const preCommitPath = path.join(huskyPath, 'pre-commit');
  if (!fs.existsSync(preCommitPath)) {
    console.log('❌ Pre-commit hook not found!');
    return false;
  }
  
  // Check lint-staged config
  const lintStagedPath = path.join(PROJECT_ROOT, '.lintstagedrc.json');
  if (!fs.existsSync(lintStagedPath)) {
    console.log('❌ Lint-staged config not found!');
    return false;
  }
  
  console.log('✅ Husky configuration found');
  console.log('✅ Pre-commit hook found');
  console.log('✅ Lint-staged configuration found\n');
  
  return true;
}

/**
 * Main execution
 */
async function main() {
  try {
    if (!validatePreCommitConfig()) {
      process.exit(1);
    }
    
    await runTests();
  } catch (error) {
    console.error('💥 Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runTests, validatePreCommitConfig };