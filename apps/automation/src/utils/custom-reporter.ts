import {
  Reporter,
  FullConfig,
  FullResult,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface TestReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
  };
  duration: number;
  suites: SuiteReport[];
}

interface SuiteReport {
  title: string;
  tests: TestCaseReport[];
}

interface TestCaseReport {
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  errors?: string[];
  retries: number;
  browser?: string;
}

class CustomReporter implements Reporter {
  private report: TestReport;
  private startTime!: number;

  constructor() {
    this.report = {
      timestamp: '',
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 },
      duration: 0,
      suites: [],
    };
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.startTime = Date.now();
    this.report.timestamp = new Date().toISOString();
    
    console.log('\n========================================');
    console.log('🚀 Starting Test Execution');
    console.log('========================================');
    console.log(`Workers: ${config.workers}`);
    console.log(`Projects: ${config.projects.length}`);
    console.log(`Total Tests: ${suite.allTests().length}`);
    console.log('========================================\n');
  }

  onTestBegin(test: TestCase, _result: TestResult) {
    const projectName = test.location.file.split('/').pop()?.replace('.spec.ts', '') || 'unknown';
    console.log(`▶ ${projectName}: ${test.title}`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const status = result.status;
    const duration = result.duration;
    
    const suite = this.report.suites.find(s => s.title === test.parent.title);
    if (!suite) {
      this.report.suites.push({ title: test.parent.title, tests: [] });
    }

    const currentSuite = this.report.suites.find(s => s.title === test.parent.title);
    if (currentSuite) {
      currentSuite.tests.push({
        title: test.title,
        status: status === 'passed' ? 'passed' : status === 'skipped' ? 'skipped' : 'failed',
        duration,
        errors: result.errors.map(e => e.message || 'Unknown error'),
        retries: test.results.length > 1 ? test.results.length - 1 : 0,
      });
    }

    this.report.summary.total++;
    if (status === 'passed') this.report.summary.passed++;
    else if (status === 'failed') this.report.summary.failed++;
    else if (status === 'skipped') this.report.summary.skipped++;

    const statusEmoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏭️';
    console.log(`  ${statusEmoji} ${test.title} (${duration}ms)`);

    if (status === 'failed' && result.errors.length > 0) {
      const firstError = result.errors[0]?.message || 'Unknown error';
      console.log(`     Error: ${firstError.substring(0, 100)}`);
    }
  }

  onEnd(_result: FullResult) {
    this.report.duration = Date.now() - this.startTime;

    const passRate = this.report.summary.total > 0 
      ? Math.round((this.report.summary.passed / this.report.summary.total) * 100) 
      : 0;

    console.log('\n========================================');
    console.log('📊 Test Execution Summary');
    console.log('========================================');
    console.log(`Total: ${this.report.summary.total}`);
    console.log(`Passed: ${this.report.summary.passed} ✅`);
    console.log(`Failed: ${this.report.summary.failed} ❌`);
    console.log(`Skipped: ${this.report.summary.skipped} ⏭️`);
    console.log(`Pass Rate: ${passRate}%`);
    console.log(`Duration: ${(this.report.duration / 1000).toFixed(2)}s`);
    console.log('========================================\n');

    this.saveReport();
    this.printSlowestTests();
  }

  private saveReport() {
    const outputDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const reportPath = path.join(outputDir, 'custom-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}`);
  }

  private printSlowestTests() {
    const allTests: { title: string; duration: number }[] = [];
    
    for (const suite of this.report.suites) {
      for (const test of suite.tests) {
        allTests.push({ title: test.title, duration: test.duration });
      }
    }

    allTests.sort((a, b) => b.duration - a.duration);
    const slowest = allTests.slice(0, 5);

    if (slowest.length > 0) {
      console.log('🐢 Top 5 Slowest Tests:');
      slowest.forEach((test, index) => {
        console.log(`  ${index + 1}. ${test.title} (${test.duration}ms)`);
      });
      console.log('');
    }
  }
}

export default CustomReporter;