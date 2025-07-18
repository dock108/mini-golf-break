#!/usr/bin/env node

/**
 * Script to merge coverage reports from different test types
 * Combines Jest (unit/integration) and Playwright (UAT) coverage
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COVERAGE_DIR = path.join(__dirname, '..', 'coverage');
const JEST_COVERAGE = path.join(COVERAGE_DIR, 'jest');
const UAT_COVERAGE = path.join(COVERAGE_DIR, 'uat');
const MERGED_COVERAGE = path.join(COVERAGE_DIR, 'merged');

// Ensure coverage directories exist
function ensureDirectories() {
  [COVERAGE_DIR, JEST_COVERAGE, UAT_COVERAGE, MERGED_COVERAGE].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Move Jest coverage to its own directory
function moveJestCoverage() {
  console.log('📦 Moving Jest coverage reports...');
  
  const lcovPath = path.join(COVERAGE_DIR, 'lcov.info');
  const jsonPath = path.join(COVERAGE_DIR, 'coverage-final.json');
  
  if (fs.existsSync(lcovPath)) {
    fs.renameSync(lcovPath, path.join(JEST_COVERAGE, 'lcov.info'));
  }
  
  if (fs.existsSync(jsonPath)) {
    fs.renameSync(jsonPath, path.join(JEST_COVERAGE, 'coverage-final.json'));
  }
  
  // Move HTML report
  const htmlDir = path.join(COVERAGE_DIR, 'lcov-report');
  const jestHtmlDir = path.join(JEST_COVERAGE, 'lcov-report');
  if (fs.existsSync(htmlDir)) {
    fs.renameSync(htmlDir, jestHtmlDir);
  }
}

// Check if NYC is installed
function checkNyc() {
  try {
    execSync('npx nyc --version', { stdio: 'ignore' });
    return true;
  } catch {
    console.error('❌ NYC not found. Please install it:');
    console.error('   npm install --save-dev nyc');
    return false;
  }
}

// Merge coverage reports
function mergeCoverage() {
  console.log('🔄 Merging coverage reports...');
  
  const coverageFiles = [];
  
  // Find all coverage JSON files
  const jestCoverage = path.join(JEST_COVERAGE, 'coverage-final.json');
  if (fs.existsSync(jestCoverage)) {
    coverageFiles.push(jestCoverage);
  }
  
  // UAT coverage would be here if Playwright coverage is set up
  const uatCoverage = path.join(UAT_COVERAGE, 'coverage-final.json');
  if (fs.existsSync(uatCoverage)) {
    coverageFiles.push(uatCoverage);
  }
  
  if (coverageFiles.length === 0) {
    console.error('❌ No coverage files found to merge');
    return false;
  }
  
  if (coverageFiles.length === 1) {
    console.log('ℹ️  Only one coverage file found, copying to merged directory');
    fs.copyFileSync(coverageFiles[0], path.join(MERGED_COVERAGE, 'coverage-final.json'));
    return true;
  }
  
  // Use NYC to merge coverage
  const nycCommand = `npx nyc merge ${COVERAGE_DIR} ${MERGED_COVERAGE}/coverage-final.json`;
  
  try {
    execSync(nycCommand, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('❌ Failed to merge coverage:', error.message);
    return false;
  }
}

// Generate merged report
function generateReport() {
  console.log('📊 Generating merged coverage report...');

  // Use execFileSync to safely pass arguments without shell interpretation
  const execFileSync = require('child_process').execFileSync;
  const args = [
    'nyc',
    'report',
    '--reporter=html',
    '--reporter=text',
    '--reporter=lcov',
    `--report-dir=${MERGED_COVERAGE}`,
    `--temp-dir=${MERGED_COVERAGE}`
  ];

  try {
    execFileSync('npx', args, { stdio: 'inherit' });
    console.log('✅ Merged coverage report generated at:', MERGED_COVERAGE);
    return true;
  } catch (error) {
    console.error('❌ Failed to generate report:', error.message);
    return false;
  }
}

// Generate coverage summary
function generateSummary() {
  const summaryPath = path.join(MERGED_COVERAGE, 'coverage-summary.txt');
  const timestamp = new Date().toISOString();
  
  let summary = `Coverage Summary Report
Generated: ${timestamp}

Test Types Included:
`;

  // Check which test types have coverage
  if (fs.existsSync(path.join(JEST_COVERAGE, 'coverage-final.json'))) {
    summary += '✅ Unit Tests (Jest)\n';
    summary += '✅ Integration Tests (Jest)\n';
  }
  
  if (fs.existsSync(path.join(UAT_COVERAGE, 'coverage-final.json'))) {
    summary += '✅ UAT Tests (Playwright)\n';
  }
  
  summary += '\nView detailed reports:\n';
  summary += `- Merged Report: ${path.join(MERGED_COVERAGE, 'index.html')}\n`;
  summary += `- Jest Report: ${path.join(JEST_COVERAGE, 'lcov-report', 'index.html')}\n`;
  
  fs.writeFileSync(summaryPath, summary);
  console.log('\n📄 Summary written to:', summaryPath);
}

// Main execution
async function main() {
  console.log('🚀 Starting coverage merge process...\n');
  
  if (!checkNyc()) {
    process.exit(1);
  }
  
  ensureDirectories();
  moveJestCoverage();
  
  if (mergeCoverage() && generateReport()) {
    generateSummary();
    console.log('\n✅ Coverage merge completed successfully!');
    console.log(`📂 Open ${path.join(MERGED_COVERAGE, 'index.html')} to view the report`);
  } else {
    console.error('\n❌ Coverage merge failed');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});