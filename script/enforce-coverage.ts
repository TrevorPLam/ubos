// AI-META-BEGIN
// AI-META: Coverage enforcement script
// OWNERSHIP: ci/cd
// ENTRYPOINTS: CI pipeline
// DEPENDENCIES: node
// DANGER: None - CI automation
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: CI pipeline
// AI-META-END

/**
 * Coverage enforcement script.
 * 
 * This script reads coverage reports and enforces minimum coverage thresholds.
 * It's designed to be used in CI pipelines to ensure code quality standards.
 */

import { readFileSync, existsSync } from 'fs';

interface CoverageThresholds {
  backend: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  frontend: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  overall: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

const COVERAGE_THRESHOLDS: CoverageThresholds = {
  backend: {
    statements: 30,    // Minimum 30% statements coverage
    branches: 25,     // Minimum 25% branches coverage
    functions: 25,     // Minimum 25% functions coverage
    lines: 30,        // Minimum 30% lines coverage
  },
  frontend: {
    statements: 8,     // Minimum 8% statements coverage
    branches: 5,      // Minimum 5% branches coverage
    functions: 8,     // Minimum 8% functions coverage
    lines: 8,        // Minimum 8% lines coverage
  },
  overall: {
    statements: 20,    // Minimum 20% overall statements coverage
    branches: 15,     // Minimum 15% overall branches coverage
    functions: 15,     // Minimum 15% overall functions coverage
    lines: 20,        // Minimum 20% overall lines coverage
  },
};

interface CoverageReport {
  total: {
    lines: {
      covered: number;
      total: number;
      percent: number;
    };
    functions: {
      covered: number;
      total: number;
      percent: number;
    };
    branches: {
      covered: number;
      total: number;
      percent: number;
    };
    statements: {
      covered: number;
      total: number;
      percent: number;
    };
  };
}

function parseCoverageReport(filePath: string): CoverageReport | null {
  try {
    if (!existsSync(filePath)) {
      console.error(`Coverage report not found: ${filePath}`);
      return null;
    }

    const content = readFileSync(filePath, 'utf8');
    const coverageMatch = content.match(/"total":\s*{([^}]+)}/);
    
    if (!coverageMatch) {
      console.error(`Invalid coverage report format in: ${filePath}`);
      return null;
    }

    return JSON.parse(coverageMatch[1]);
  } catch (error) {
    console.error(`Error parsing coverage report: ${error}`);
    return null;
  }
}

function checkCoverage(
  coverage: CoverageReport,
  thresholds: CoverageThresholds['backend'] | CoverageThresholds['frontend'] | CoverageThresholds['overall'],
  name: string
): boolean {
  const { statements, branches, functions, lines } = coverage.total;
  let passed = true;

  if (statements.percent < thresholds.statements) {
    console.error(`❌ ${name} statements coverage: ${statements.percent.toFixed(2)}% (required: ${thresholds.statements}%)`);
    passed = false;
  } else {
    console.log(`✅ ${name} statements coverage: ${statements.percent.toFixed(2)}% (required: ${thresholds.statements}%)`);
  }

  if (branches.percent < thresholds.branches) {
    console.error(`❌ ${name} branches coverage: ${branches.percent.toFixed(2)}% (required: ${thresholds.branches}%)`);
    passed = false;
  } else {
    console.log(`✅ ${name} branches coverage: ${branches.percent.toFixed(2)}% (required: ${thresholds.branches}%)`);
  }

  if (functions.percent < thresholds.functions) {
    console.error(`❌ ${name} functions coverage: ${functions.percent.toFixed(2)}% (required: ${thresholds.functions}%)`);
    passed = false;
  } else {
    console.log(`✅ ${name} functions coverage: ${functions.percent.toFixed(2)}% (required: ${thresholds.functions}%)`);
  }

  if (lines.percent < thresholds.lines) {
    console.error(`❌ ${name} lines coverage: ${lines.percent.toFixed(2)}% (required: ${thresholds.lines}%)`);
    passed = false;
  } else {
    console.log(`✅ ${name} lines coverage: ${lines.percent.toFixed(2)}% (required: ${thresholds.lines}%)`);
  }

  return passed;
}

function main() {
  console.log('🔍 Enforcing coverage thresholds...');
  
  const backendReport = parseCoverageReport('coverage/coverage-final.json');
  if (!backendReport) {
    console.error('❌ Failed to parse backend coverage report');
    process.exit(1);
  }

  const backendPassed = checkCoverage(backendReport, COVERAGE_THRESHOLDS.backend, 'Backend');
  
  const frontendReport = parseCoverageReport('coverage/coverage-final.json');
  if (!frontendReport) {
    console.error('❌ Failed to parse frontend coverage report');
    process.exit(1);
  }

  const frontendPassed = checkCoverage(frontendReport, COVERAGE_THRESHOLDS.frontend, 'Frontend');
  
  // Overall coverage check (using the same report since it includes all files)
  const overallPassed = checkCoverage(backendReport, COVERAGE_THRESHOLDS.overall, 'Overall');

  console.log('\n📊 Coverage Summary:');
  console.log(`Backend: ${backendPassed ? '✅' : '❌'} ${backendReport.total.statements.percent.toFixed(2)}% statements`);
  console.log(`Frontend: ${frontendPassed ? '✅' : '❌'} ${frontendReport.total.statements.percent.toFixed(2)}% statements`);
  console.log(`Overall: ${overallPassed ? '✅' : '❌'} ${backendReport.total.statements.percent.toFixed(2)}% statements`);

  if (backendPassed && frontendPassed && overallPassed) {
    console.log('\n🎉 All coverage thresholds met!');
    process.exit(0);
  } else {
    console.log('\n❌ Coverage thresholds not met. Please improve test coverage.');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
