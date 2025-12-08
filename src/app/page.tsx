'use client';

import { ChatInterface } from '@/components/chat-interface';
import { RateLimitDialog } from '@/components/rate-limit-dialog';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomBar from '@/components/bottom-bar';
import Image from 'next/image';
import { track } from '@vercel/analytics';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { OlympiaInfoModal } from '@/components/olympia-info-modal';
import { useQueryClient } from '@tanstack/react-query';
import { useRateLimit } from '@/lib/hooks/use-rate-limit';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthModal } from '@/components/auth/auth-modal';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { Sidebar } from '@/components/sidebar';
import { SignupPrompt } from '@/components/signup-prompt';
import { EnterpriseBanner } from '@/components/enterprise/enterprise-banner';

function HomeContent() {
  const { user, loading } = useAuthStore();
  const queryClient = useQueryClient();
  const { allowed, remaining, resetTime, increment } = useRateLimit();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasMessages, setHasMessages] = useState(false);
  const [isHoveringTitle, setIsHoveringTitle] = useState(false);
  const [autoTiltTriggered, setAutoTiltTriggered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showRateLimitDialog, setShowRateLimitDialog] = useState(false);
  const [rateLimitResetTime, setRateLimitResetTime] = useState(new Date());
  
  // Get chatId from URL params
  const chatIdParam = searchParams.get('chatId');
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(chatIdParam || undefined);
  const [chatKey, setChatKey] = useState(0); // Force remount key
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Handle rate limit errors from chat interface
  const handleRateLimitError = useCallback((resetTime: string) => {
    setRateLimitResetTime(new Date(resetTime));
    setShowRateLimitDialog(true);
  }, []);

  const handleMessagesChange = useCallback((hasMessages: boolean) => {
    setHasMessages(hasMessages);

    // Track message count for non-logged-in users
    // Only show signup prompt in production
    if (!user && hasMessages && process.env.NODE_ENV === 'production') {
      const newCount = messageCount + 1;
      setMessageCount(newCount);

      // Show signup prompt after 1 message
      if (newCount === 1) {
        setTimeout(() => {
          setShowSignupPrompt(true);
        }, 2000); // Show after 2 seconds
      }
    }
  }, [user, messageCount]);

  const handleSignUpSuccess = useCallback((message: string) => {
    setNotification({ type: 'success', message });
  }, []);

  // Sync currentSessionId with URL param on mount and URL changes
  useEffect(() => {
    const chatIdFromUrl = searchParams.get('chatId');
    // Always sync from URL to state (URL is source of truth)
    setCurrentSessionId(chatIdFromUrl || undefined);
  }, [searchParams]); // Only watch searchParams, not currentSessionId to avoid loops

  // Handle URL messages from auth callbacks
  useEffect(() => {
    const message = searchParams.get('message');
    const error = searchParams.get('error');

    if (message === 'email_updated') {
      setNotification({ type: 'success', message: 'Email address successfully updated!' });
      router.replace('/'); // Remove URL params
    } else if (message === 'email_link_expired') {
      setNotification({ type: 'error', message: 'Email confirmation link has expired. Please request a new email change.' });
      router.replace('/'); // Remove URL params
    } else if (error === 'auth_failed') {
      setNotification({ type: 'error', message: 'Authentication failed. Please try again.' });
      router.replace('/'); // Remove URL params
    }

    // Handle checkout success
    const checkoutSuccess = searchParams.get('checkout');
    const checkoutPlan = searchParams.get('plan');
    const customerSessionToken = searchParams.get('customer_session_token');

    if (checkoutSuccess === 'success' && checkoutPlan && customerSessionToken && user) {
      
      // Call our checkout success API
      const processCheckout = async () => {
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          const response = await fetch('/api/checkout/success', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
              customerSessionToken,
              plan: checkoutPlan
            })
          });

          const result = await response.json();

          if (response.ok) {
            setNotification({ 
              type: 'success', 
              message: `Successfully upgraded to ${checkoutPlan} plan! You can now use the service.` 
            });
            // Refresh auth state to update subscription tier
            window.location.reload();
          } else {
            setNotification({ 
              type: 'error', 
              message: `Failed to complete upgrade: ${result.error || 'Unknown error'}` 
            });
          }
        } catch (error) {
          setNotification({ 
            type: 'error', 
            message: 'Failed to process checkout. Please contact support.' 
          });
        }
      };

      processCheckout();
      router.replace('/'); // Remove checkout params from URL
    }

    // Auto-hide notifications after 5 seconds
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router, notification, user]);

  // Detect mobile device for touch interactions
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle title click on mobile
  const handleTitleClick = useCallback(() => {
    if (isMobile) {
      track('Title Click', {
        trigger: 'mobile_touch'
      });
      setIsHoveringTitle(true);
      // Keep it tilted for 3 seconds then close
      setTimeout(() => {
        setIsHoveringTitle(false);
      }, 3000);
    }
  }, [isMobile]);

  
  // Auto-trigger tilt animation after 2 seconds
  useEffect(() => {
    if (!hasMessages && !autoTiltTriggered) {
      const timer = setTimeout(() => {
        track('Title Hover', {
          trigger: 'auto_tilt'
        });
        setIsHoveringTitle(true);
        setAutoTiltTriggered(true);
        
        // Keep it tilted for 2 seconds then close
        setTimeout(() => {
          setIsHoveringTitle(false);
        }, 2000);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [hasMessages, autoTiltTriggered]);

  const updateUrlWithSession = useCallback((sessionId: string | null) => {
    const url = new URL(window.location.href);
    if (sessionId) {
      url.searchParams.set('chatId', sessionId);
    } else {
      url.searchParams.delete('chatId');
      url.searchParams.delete('q'); // Also clear query parameter for clean new chat
    }
    // Use replace to avoid creating browser history entries
    window.history.replaceState(null, '', url.toString());
  }, []);

  const handleSessionSelect = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    updateUrlWithSession(sessionId);
  }, [updateUrlWithSession]);

  const handleNewChat = useCallback(() => {
    // Increment key to force ChatInterface remount
    setChatKey(prev => prev + 1);

    // Clear the local state
    setCurrentSessionId(undefined);

    // Update URL (which will trigger useEffect to sync state)
    updateUrlWithSession(null);
  }, [updateUrlWithSession]);

  const handleSessionCreated = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    updateUrlWithSession(sessionId);
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  }, [queryClient, updateUrlWithSession]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5] dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-100 via-gray-200 to-slate-300 dark:from-slate-700 dark:via-gray-700 dark:to-slate-600 flex animate-gradient-shift'>
      {/* Enterprise Banner */}
      <EnterpriseBanner />

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
              notification.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {notification.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {notification.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Sidebar
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        hasMessages={hasMessages}
      />

      {/* Main Content Area - Add left padding on desktop for sidebar */}
      <div className="flex-1 flex flex-col pt-0 md:pl-24 w-full overflow-x-hidden">
        {/* Header - Animate out when messages appear */}
        <AnimatePresence mode="wait">
            {!hasMessages && (
              <motion.div 
                className="pt-4 md:pt-8 pb-2 px-4 sm:px-6 w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
              {/* Hero Section - Stacked on mobile, side-by-side on desktop */}
              <div className="w-full max-w-4xl mx-auto flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-6 items-center mt-14 md:mt-0">
                {/* Logo */}
                <motion.div 
                  className="relative flex justify-center md:justify-end w-full"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
                  onHoverStart={() => {
                    if (!isMobile) {
                      track('Title Hover', {
                        trigger: 'user_hover'
                      });
                      setIsHoveringTitle(true);
                    }
                  }}
                  onHoverEnd={() => {
                    if (!isMobile) {
                      setIsHoveringTitle(false);
                    }
                  }}
                  onClick={handleTitleClick}
                >
                  <motion.div
                    className={`relative z-10 ${
                      isMobile ? 'cursor-pointer' : 'cursor-default'
                    }`}
                    style={{ transformOrigin: '15% 100%' }}
                    animate={{
                      rotateZ: isHoveringTitle ? -8 : 0,
                    }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <Image
                      src="/eco/eco-logo-trans.png"
                      alt="Ecoheart"
                      width={400}
                      height={160}
                      className="h-16 sm:h-32 w-auto max-w-[240px] sm:max-w-none dark:hidden"
                      priority
                    />
                    <Image
                      src="/eco/eco-logo.png"
                      alt="Ecoheart"
                      width={400}
                      height={160}
                      className="h-16 sm:h-32 w-auto max-w-[240px] sm:max-w-none hidden dark:block"
                      priority
                    />
                  </motion.div>
                </motion.div>

                {/* Text & Button */}
                <motion.div
                  className="flex flex-col items-center md:items-start text-center md:text-left gap-1.5 md:gap-3 w-full px-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                >
                  <h1 className="text-gray-800 dark:text-gray-200 text-sm sm:text-xl font-semibold">
                    City of Olympia AI Researcher
                  </h1>
                  
                  <motion.button
                    onClick={() => setIsInfoModalOpen(true)}
                    className="px-3 py-1.5 sm:py-2 rounded-lg bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white transition-colors flex items-center gap-2 text-xs sm:text-sm font-medium shadow-md"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label="Learn more about this AI"
                  >
                    <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>About & Indexed Documents</span>
                  </motion.button>

                  <p className="text-amber-600 dark:text-amber-500 text-[9px] sm:text-xs font-medium flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full animate-pulse flex-shrink-0"></span>
                    <span>Proof of Concept - Not for Production Use</span>
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Chat Interface */}
        <motion.div 
          className="flex-1 px-0 sm:px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
            <ChatInterface 
              key={chatKey}
              sessionId={currentSessionId}
              onMessagesChange={handleMessagesChange} 
              onRateLimitError={handleRateLimitError}
              onSessionCreated={handleSessionCreated}
              onNewChat={handleNewChat}
              rateLimitProps={{
                allowed,
                remaining,
                resetTime,
                increment
              }}
            />
          </Suspense>
        </motion.div>
        
        <BottomBar />
      </div>
      
      {/* Rate Limit Dialog */}
      <RateLimitDialog
        open={showRateLimitDialog}
        onOpenChange={setShowRateLimitDialog}
        resetTime={rateLimitResetTime}
        onShowAuth={() => setShowAuthModal(true)}
      />

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSignUpSuccess={handleSignUpSuccess}
      />

      {/* Signup Prompt for non-logged-in users */}
      {!user && (
        <SignupPrompt
          open={showSignupPrompt}
          onClose={() => setShowSignupPrompt(false)}
          onSignUp={() => {
            setShowSignupPrompt(false);
            setShowAuthModal(true);
          }}
          messageCount={messageCount}
        />
      )}

      {/* Info Modal */}
      <OlympiaInfoModal 
        isOpen={isInfoModalOpen} 
        onClose={() => setIsInfoModalOpen(false)} 
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5] dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}