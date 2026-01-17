import arcjet, { tokenBucket, validateEmail } from '@arcjet/node';
import { config } from './environment';

// Registration protection
export const ajRegister = arcjet({
  key: config.arcjet.key,
  characteristics: ['ip.src'],
  rules: [
    tokenBucket({
      mode: 'LIVE',
      refillRate: 3,
      interval: 900, // 15 minutes in seconds
      capacity: 3,
    }),
  ],
});

// Login protection
export const ajLogin = arcjet({
  key: config.arcjet.key,
  characteristics: ['ip.src'],
  rules: [
    tokenBucket({
      mode: 'LIVE',
      refillRate: 5,
      interval: 900,
      capacity: 5,
    }),
  ],
});

// Token refresh protection
export const ajRefresh = arcjet({
  key: config.arcjet.key,
  characteristics: ['ip.src'],
  rules: [
    tokenBucket({
      mode: 'LIVE',
      refillRate: 10,
      interval: 900,
      capacity: 10,
    }),
  ],
});

// Email validation
export const ajEmailValidation = arcjet({
  key: config.arcjet.key,
  rules: [
    validateEmail({
      mode: 'LIVE',
      deny: ['DISPOSABLE', 'INVALID', 'NO_MX_RECORDS'],
    }),
  ],
});
