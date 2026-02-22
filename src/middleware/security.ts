// Runtime Hub - Security Middleware
// Security Officer: Production-grade security middleware

import { Request, Response, NextFunction } from 'express';

export interface SecurityConfig {
  enableRateLimit: boolean;
  enableInputValidation: boolean;
  enableCors: boolean;
  enableHelmet: boolean;
  maxRequestSize: string;
  trustedOrigins: string[];
}

export class SecurityMiddleware {
  private config: SecurityConfig;
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  // Rate limiting middleware
  rateLimit = (req: Request, res: Response, next: NextFunction) => {
    if (!this.config.enableRateLimit) {
      return next();
    }

    const clientId = this.getClientId(req);
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100;

    const clientData = this.rateLimitMap.get(clientId);

    if (!clientData || now > clientData.resetTime) {
      this.rateLimitMap.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }

    clientData.count++;
    next();
  };

  // Input validation middleware
  inputValidation = (req: Request, res: Response, next: NextFunction) => {
    if (!this.config.enableInputValidation) {
      return next();
    }

    // Validate URL parameters
    if (req.params) {
      for (const [key, value] of Object.entries(req.params)) {
        if (typeof value === 'string' && this.containsMaliciousContent(value)) {
          return res.status(400).json({
            error: 'Invalid input detected',
            parameter: key
          });
        }
      }
    }

    // Validate query parameters
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string' && this.containsMaliciousContent(value)) {
          return res.status(400).json({
            error: 'Invalid input detected',
            parameter: key
          });
        }
      }
    }

    // Validate request body
    if (req.body) {
      const bodyString = JSON.stringify(req.body);
      if (this.containsMaliciousContent(bodyString)) {
        return res.status(400).json({
          error: 'Invalid input detected in request body'
        });
      }
    }

    next();
  };

  // CORS middleware
  cors = (req: Request, res: Response, next: NextFunction) => {
    if (!this.config.enableCors) {
      return next();
    }

    const origin = req.headers.origin;
    
    if (this.config.trustedOrigins.includes(origin || '') || !origin) {
      res.header('Access-Control-Allow-Origin', origin || '*');
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
  };

  // Security headers middleware
  securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
    if (!this.config.enableHelmet) {
      return next();
    }

    // Prevent clickjacking
    res.header('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.header('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.header('X-XSS-Protection', '1; mode=block');
    
    // Force HTTPS
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Content Security Policy
    res.header('Content-Security-Policy', "default-src 'self'");

    next();
  };

  // Request size limiting
  requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];
    const maxSize = this.parseSize(this.config.maxRequestSize);

    if (contentLength && parseInt(contentLength) > maxSize) {
      return res.status(413).json({
        error: 'Request entity too large',
        maxSize: this.config.maxRequestSize
      });
    }

    return next();
  };

  // Helper methods
  private getClientId(req: Request): string {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           (req.connection as any)?.socket?.remoteAddress || 
           'unknown';
  }

  private containsMaliciousContent(input: string): boolean {
    // Check for common attack patterns
    const maliciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // XSS
      /javascript:/gi, // JavaScript protocol
      /on\w+\s*=/gi, // Event handlers
      /union\s+select/gi, // SQL injection
      /drop\s+table/gi, // SQL injection
      /\.\.\//g, // Path traversal
      /\/etc\/passwd/gi, // System file access
      /cmd\.exe/gi, // Windows command
      /powershell/gi, // PowerShell
    ];

    return maliciousPatterns.some(pattern => pattern.test(input));
  }

  private parseSize(size: string): number {
    const units: Record<string, number> = {
      'b': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };

    const match = (size || '').toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
    if (!match) {
      return 1024 * 1024; // Default 1MB
    }

    const [, value, unit] = match;
    if (!unit || !value) return 1024 * 1024;
    
    const unitValue = units[unit];
    if (unitValue === undefined) return 1024 * 1024;
    
    return parseInt(value) * unitValue;
  }

  // Clean up expired rate limit entries
  cleanupRateLimit(): void {
    const now = Date.now();
    for (const [clientId, data] of this.rateLimitMap.entries()) {
      if (now > data.resetTime) {
        this.rateLimitMap.delete(clientId);
      }
    }
  }
}

// Factory function for easy middleware creation
export function createSecurityMiddleware(config: Partial<SecurityConfig> = {}): SecurityMiddleware {
  const defaultConfig: SecurityConfig = {
    enableRateLimit: true,
    enableInputValidation: true,
    enableCors: true,
    enableHelmet: true,
    maxRequestSize: '10mb',
    trustedOrigins: ['http://localhost:3000', 'http://localhost:3001']
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new SecurityMiddleware(finalConfig);
}
