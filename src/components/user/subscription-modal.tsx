'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { createClient } from '@/utils/supabase/client-wrapper';
import { useSubscription } from '@/hooks/use-subscription';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, TrendingUp, Clock, Shield, Sparkles, Check, Crown, BarChart3, Building2 } from 'lucide-react';
import { track } from '@vercel/analytics';
import { EnterpriseContactModal } from '@/components/enterprise/enterprise-contact-modal';

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ open, onClose }: SubscriptionModalProps) {
  const user = useAuthStore((state) => state.user);
  const subscription = useSubscription();
  const [loading, setLoading] = useState(false);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);

  // Load JotForm script
  useEffect(() => {
    if (open && !subscription.isPaid) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jotfor.ms/s/umd/latest/for-form-embed-handler.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        if (typeof window !== 'undefined' && (window as any).jotformEmbedHandler) {
          (window as any).jotformEmbedHandler("iframe[id='JotFormIFrame-253271179308156']", "https://form.jotform.com/");
        }
      };

      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [open, subscription.isPaid]);

  const handleEnterpriseClick = () => {
    track('Enterprise CTA Clicked', { source: 'subscription_modal' });
    onClose(); // Close subscription modal
    // Use a small delay to prevent both modals from closing
    setTimeout(() => {
      setShowEnterpriseModal(true);
    }, 100);
  };

  const handleUpgrade = async (planType: string) => {
    // Track plan selection
    track('Plan Selected', {
      plan: planType,
      source: 'subscription_modal'
    });

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      // Create Polar checkout session
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ plan: planType })
      });

      if (response.ok) {
        const { checkoutUrl } = await response.json();

        // Track checkout started
        track('Checkout Started', {
          plan: planType,
          source: 'subscription_modal'
        });

        window.location.href = checkoutUrl;
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // If user has an active subscription, show current plan info
  if (subscription.isPaid) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="!max-w-2xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader className="space-y-3 pb-6">
            <DialogTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100 text-center">
              Your Subscription
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Plan Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 dark:bg-blue-700 rounded-lg">
                    {subscription.tier === 'unlimited' ? (
                      <Crown className="h-6 w-6 text-white" />
                    ) : (
                      <Zap className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {subscription.tier === 'unlimited' ? 'Pro Unlimited' : 'Pay-As-You-Go'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Status: <span className="font-semibold text-green-600 dark:text-green-400">Active</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-gray-300">Unlimited queries</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-gray-300">Full tool access</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-gray-300">Download reports</span>
                </div>
                {subscription.tier === 'unlimited' && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-gray-700 dark:text-gray-300">Priority support</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-gray-700 dark:text-gray-300">Early access to features</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Manage Subscription Button */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => window.open('https://polar.sh/dashboard', '_blank')}
                className="w-full"
                variant="outline"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Manage Subscription on Polar
              </Button>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                View billing history, update payment method, or cancel subscription
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show contact form for free users
  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-3xl sm:!max-w-3xl md:!max-w-3xl lg:!max-w-3xl !w-[95vw] sm:!w-[90vw] md:!w-[85vw] lg:!w-[800px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100 text-center">
            Contact Ecoheart Today
          </DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-2xl mx-auto">
            We help communities foster and develop technology for a purpose - focusing on smart cities and ethical data usage
          </p>
        </DialogHeader>

        <div className="w-full">
          {/* JotForm Embed */}
          <iframe
            id="JotFormIFrame-253271179308156"
            title="Quick Contact Form"
            onLoad={(e) => {
              const iframe = e.target as HTMLIFrameElement;
              if (iframe.contentWindow) {
                window.parent.scrollTo(0, 0);
              }
            }}
            allow="geolocation; microphone; camera; fullscreen; payment"
            src="https://form.jotform.com/253271179308156"
            style={{
              minWidth: '100%',
              maxWidth: '100%',
              height: '539px',
              border: 'none'
            }}
            scrolling="no"
          />
        </div>
      </DialogContent>
    </Dialog>

    {/* Enterprise modal rendered outside to prevent state loss */}
    <EnterpriseContactModal
      open={showEnterpriseModal}
      onClose={() => setShowEnterpriseModal(false)}
    />
    </>
  );
}