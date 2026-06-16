import { Module } from '@nestjs/common';
import { SecurityScannerService } from './scanner.service';
import { SqlInjectionScanner } from './sql-injection.scanner';
import { XssScanner } from './xss.scanner';
import { AuthScanner } from './auth.scanner';
import { HeaderScanner } from './header.scanner';
import { JwtScanner } from './jwt.scanner';
import { ApiSecurityScanner } from './api-security.scanner';
import { OwaspZapScanner } from './owasp-zap.scanner';
import { DependencyScanner } from './dependency.scanner';

@Module({
  providers: [
    SecurityScannerService,
    SqlInjectionScanner,
    XssScanner,
    AuthScanner,
    HeaderScanner,
    JwtScanner,
    ApiSecurityScanner,
    OwaspZapScanner,
    DependencyScanner,
  ],
  exports: [SecurityScannerService],
})
export class ScannerModule {}