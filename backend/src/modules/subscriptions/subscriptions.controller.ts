import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import {
  adminChangeTenantPlan,
  adminGetTenantUpgradePricing,
  checkoutOwnerSubscription,
  getAllSubscriptions,
  getOwnerSubscriptionOverview,
  getSubscriptionStats,
  requestOwnerCustomSubscription,
} from './subscriptions.service';
import { SubscriptionPaymentMethod, SubscriptionPlan } from '../../entities/platform/Subscription';

export const listSubscriptions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, search, plan, fromDate, toDate, period } = req.query;
    const data = await getAllSubscriptions({
      status: status as string,
      search: search as string,
      plan: plan as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
      period: period as 'today' | 'yesterday' | 'last7days' | 'last30days',
    });
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

export const subscriptionStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, plan, fromDate, toDate, period } = req.query;
    const data = await getSubscriptionStats({
      search: search as string,
      plan: plan as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
      period: period as 'today' | 'yesterday' | 'last7days' | 'last30days',
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const ownerSubscriptionCurrent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await getOwnerSubscriptionOverview(req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const ownerSubscriptionCheckout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { plan, paymentMethod, quotedFinalAmount, quotedRemainingCredit } = req.body ?? {};

    if (!plan || !paymentMethod) {
      res.status(400).json({ success: false, message: 'Plan and payment method are required.' });
      return;
    }

    if (![SubscriptionPlan.STANDARD, SubscriptionPlan.PRO].includes(plan)) {
      res.status(400).json({ success: false, message: 'Only Standard and Pro plans can be paid directly.' });
      return;
    }

    if (!Object.values(SubscriptionPaymentMethod).includes(paymentMethod)) {
      res.status(400).json({ success: false, message: 'Invalid payment method.' });
      return;
    }

    const data = await checkoutOwnerSubscription(req.user, { plan, paymentMethod, quotedFinalAmount, quotedRemainingCredit });
    res.status(200).json({ success: true, message: 'Subscription activated successfully.', data });
  } catch (error) {
    next(error);
  }
};

export const ownerCustomSubscriptionRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { message } = req.body ?? {};
    if (!message || !String(message).trim()) {
      res.status(400).json({ success: false, message: 'Custom subscription message is required.' });
      return;
    }

    const data = await requestOwnerCustomSubscription(req.user, String(message));
    res.status(200).json({ success: true, message: 'Custom subscription request sent successfully.', data });
  } catch (error) {
    next(error);
  }
};

export const adminTenantPlanUpdate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tenantId, plan, paymentMethod } = req.body ?? {};
    if (!tenantId || !plan) {
      res.status(400).json({ success: false, message: 'Tenant and plan are required.' });
      return;
    }

    if (![SubscriptionPlan.STANDARD, SubscriptionPlan.PRO].includes(plan)) {
      res.status(400).json({ success: false, message: 'Only Standard and Pro plans are supported.' });
      return;
    }

    const data = await adminChangeTenantPlan(req.user, { tenantId, plan, paymentMethod });
    res.status(200).json({ success: true, message: 'Tenant plan updated successfully.', data });
  } catch (error) {
    next(error);
  }
};

export const adminTenantPlanPricing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tenantId, plan } = req.query ?? {};
    if (!tenantId || !plan) {
      res.status(400).json({ success: false, message: 'Tenant and plan are required.' });
      return;
    }

    if (![SubscriptionPlan.STANDARD, SubscriptionPlan.PRO].includes(plan as SubscriptionPlan)) {
      res.status(400).json({ success: false, message: 'Only Standard and Pro plans are supported.' });
      return;
    }

    const data = await adminGetTenantUpgradePricing({
      tenantId: String(tenantId),
      plan: plan as SubscriptionPlan.STANDARD | SubscriptionPlan.PRO,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
