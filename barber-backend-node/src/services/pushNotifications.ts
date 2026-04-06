import webpush from 'web-push';
import { env } from '../config/env.js';
import { PushSubscription as PushSubscriptionModel } from '../models/PushSubscription.js';
import { logger } from '../utils/logger.js';

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  icon?: string;
  badge?: string;
  appointmentId?: string;
}

interface SendPushResult {
  attempted: number;
  delivered: number;
  removed: number;
  failed: number;
  disabled?: boolean;
}

interface PushSendOutcome {
  delivered: number;
  removed: number;
  failed: number;
  reason: 'delivered' | 'expired' | 'rejected' | 'network';
}

export interface PushDiagnostics {
  configured: boolean;
  subscriptionCount: number;
  userId?: string;
  reasons: string[];
}

let pushConfigured = false;

const isPushEnabled = () => {
  return Boolean(env.vapidPublicKey && env.vapidPrivateKey && env.vapidSubject);
};

const ensureWebPushConfigured = () => {
  if (!isPushEnabled()) {
    return false;
  }

  if (!pushConfigured) {
    webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
    pushConfigured = true;
  }

  return true;
};

export const getPushDiagnostics = async (userId?: string): Promise<PushDiagnostics> => {
  const reasons: string[] = [];

  if (!env.vapidPublicKey) reasons.push('Missing VAPID_PUBLIC_KEY');
  if (!env.vapidPrivateKey) reasons.push('Missing VAPID_PRIVATE_KEY');
  if (!env.vapidSubject) reasons.push('Missing VAPID_SUBJECT');

  const subscriptionCount = userId
    ? await PushSubscriptionModel.countDocuments({ user_id: userId })
    : await PushSubscriptionModel.countDocuments();

  return {
    configured: reasons.length === 0,
    subscriptionCount,
    userId,
    reasons
  };
};

const buildNotificationPayload = (payload: PushPayload) => {
  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? '/icon-192.png',
    badge: payload.badge ?? '/icon-192.png',
    tag: payload.tag ?? 'appointment-notification',
    data: {
      url: payload.url ?? '/dashboard',
      appointmentId: payload.appointmentId
    }
  });
};

const getEndpointHost = (endpoint: string) => {
  try {
    return new URL(endpoint).host;
  } catch {
    return 'invalid-endpoint-url';
  }
};

const getErrorBody = (error: unknown): string | undefined => {
  const maybeError = error as { body?: unknown } | undefined;
  if (!maybeError || maybeError.body === undefined || maybeError.body === null) {
    return undefined;
  }

  if (typeof maybeError.body === 'string') {
    return maybeError.body;
  }

  try {
    return JSON.stringify(maybeError.body);
  } catch {
    return String(maybeError.body);
  }
};

const classifyPushFailure = (statusCode: number): PushSendOutcome['reason'] => {
  if (statusCode === 404 || statusCode === 410) {
    return 'expired';
  }

  if (statusCode >= 400) {
    return 'rejected';
  }

  return 'network';
};

const sendToSubscription = async (subscription: {
  _id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}, payload: string) => {
  const endpointHost = getEndpointHost(subscription.endpoint);

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      },
      payload
    );

    return { delivered: 1, removed: 0, failed: 0, reason: 'delivered' as const };
  } catch (error: any) {
    const statusCode = Number(error?.statusCode ?? 0);
    const headers = error?.headers;
    const body = getErrorBody(error);
    const reason = classifyPushFailure(statusCode);

    if (statusCode === 404 || statusCode === 410) {
      await PushSubscriptionModel.deleteOne({ _id: subscription._id });
      logger.warn('Removed expired push subscription', {
        endpointHost,
        endpoint: subscription.endpoint,
        statusCode,
        body
      }, 'PUSH_NOTIFICATIONS');
      return { delivered: 0, removed: 1, failed: 0, reason };
    }

    logger.error('Failed to send push notification', {
      message: error?.message,
      statusCode,
      endpointHost,
      endpoint: subscription.endpoint,
      headers,
      body,
      reason,
      stack: error?.stack
    }, 'PUSH_NOTIFICATIONS');
    return { delivered: 0, removed: 0, failed: 1, reason };
  }
};

export const sendPushToUser = async (userId: string, payload: PushPayload): Promise<SendPushResult> => {
  logger.info('Starting push delivery attempt', {
    userId,
    title: payload.title,
    tag: payload.tag,
    url: payload.url
  }, 'PUSH_NOTIFICATIONS');

  if (!ensureWebPushConfigured()) {
    logger.warn('Push sending skipped: missing VAPID configuration', undefined, 'PUSH_NOTIFICATIONS');
    return {
      attempted: 0,
      delivered: 0,
      removed: 0,
      failed: 0,
      disabled: true
    };
  }

  const subscriptions = await PushSubscriptionModel.find({ user_id: userId }).lean();
  logger.info('Loaded push subscriptions', {
    userId,
    subscriptionCount: subscriptions.length
  }, 'PUSH_NOTIFICATIONS');

  if (subscriptions.length === 0) {
    logger.warn('No push subscriptions found for user', { userId }, 'PUSH_NOTIFICATIONS');
    return {
      attempted: 0,
      delivered: 0,
      removed: 0,
      failed: 0
    };
  }

  const payloadJson = buildNotificationPayload(payload);
  const results = await Promise.all(
    subscriptions.map((subscription) =>
      sendToSubscription(
        {
          _id: String(subscription._id),
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth
        },
        payloadJson
      )
    )
  );

  const reasonBreakdown = results.reduce(
    (accumulator, result) => {
      if (result.reason === 'expired') accumulator.expired += 1;
      if (result.reason === 'rejected') accumulator.rejected += 1;
      if (result.reason === 'network') accumulator.network += 1;
      return accumulator;
    },
    { expired: 0, rejected: 0, network: 0 }
  );

  const summary = results.reduce(
    (accumulator, result) => {
      accumulator.delivered += result.delivered;
      accumulator.removed += result.removed;
      accumulator.failed += result.failed;
      return accumulator;
    },
    { delivered: 0, removed: 0, failed: 0 }
  );

  const result = {
    attempted: subscriptions.length,
    delivered: summary.delivered,
    removed: summary.removed,
    failed: summary.failed
  };

  logger.info('Push delivery summary', {
    userId,
    attempted: result.attempted,
    delivered: result.delivered,
    removed: result.removed,
    failed: result.failed,
    failureReasons: reasonBreakdown
  }, 'PUSH_NOTIFICATIONS');

  return result;
};

export const sendPushToUsers = async (userIds: string[], payload: PushPayload): Promise<SendPushResult> => {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  const totals: SendPushResult = {
    attempted: 0,
    delivered: 0,
    removed: 0,
    failed: 0
  };

  for (const userId of uniqueUserIds) {
    const result = await sendPushToUser(userId, payload);

    totals.attempted += result.attempted;
    totals.delivered += result.delivered;
    totals.removed += result.removed;
    totals.failed += result.failed;

    if (result.disabled) {
      totals.disabled = true;
      return totals;
    }
  }

  return totals;
};
