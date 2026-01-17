import { Request, Response, NextFunction } from 'express';
import { ajRegister, ajLogin, ajRefresh } from '../config/arcjet';
import { ResponseUtil } from '../utils/response.util';
import logger from '../config/logger';

type ArcjetRuleType = 'register' | 'login' | 'refresh';

/**
 * Arcjet protection middleware
 */
export const arcjetMiddleware = (ruleType: ArcjetRuleType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let decision;

      // Select the appropriate Arcjet instance based on rule type
      switch (ruleType) {
        case 'register':
          decision = await ajRegister.protect(req, { requested: 1 });
          break;
        case 'login':
          decision = await ajLogin.protect(req, { requested: 1 });
          break;
        case 'refresh':
          decision = await ajRefresh.protect(req, { requested: 1 });
          break;
        default:
          logger.error(`Unknown Arcjet rule type: ${ruleType}`);
          return next();
      }

      // Log decision for debugging
      logger.debug('Arcjet decision:', {
        id: decision.id,
        conclusion: decision.conclusion,
        ruleType,
      });

      // Handle denied requests
      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          logger.warn('Rate limit exceeded:', {
            ip: req.ip,
            ruleType,
          });

          return ResponseUtil.error(
            res,
            'Too many requests. Please try again later.',
            429
          );
        }

        if (decision.reason.isBot()) {
          logger.warn('Bot detected:', {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          });

          return ResponseUtil.error(res, 'Bot detected. Access denied.', 403);
        }

        // Generic denial
        logger.warn('Arcjet denied request:', {
          ip: req.ip,
          conclusion: decision.conclusion,
        });

        return ResponseUtil.error(res, 'Access denied', 403);
      }

      // Request allowed, continue
      next();
    } catch (error) {
      logger.error('Arcjet middleware error:', error);
      // On error, allow request to proceed (fail open)
      next();
    }
  };
};
