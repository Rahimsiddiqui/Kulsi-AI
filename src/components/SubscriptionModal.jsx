import React from 'react';
import { Check, Star, Zap, Shield, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SubscriptionModal = ({ isOpen, onClose, currentPlan, onUpgrade }) => {
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Essential tools for personal note-taking.',
      features: ['Up to 50 notes', 'Basic formatting', 'Standard support', 'Local storage'],
      icon: Star,
      color: 'bg-gray-100 text-gray-600'
    },
    {
      id: 'basic',
      name: 'Basic',
      price: '$4.99',
      period: 'per month',
      description: 'More power for students and thinkers.',
      features: ['Unlimited notes', 'Cloud Sync', 'Advanced AI (50/day)', 'Priority Support'],
      icon: Zap,
      color: 'bg-blue-100 text-blue-600',
      recommended: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$9.99',
      period: 'per month',
      description: 'The ultimate productivity powerhouse.',
      features: ['Unlimited AI', 'Collaboration', 'Version History', 'API Access', 'Custom Themes'],
      icon: Shield,
      color: 'bg-indigo-100 text-indigo-600',
      recommended: true
    }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={onClose} 
        />
        <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-10 flex flex-col"
        >
          <div className="p-6 md:p-8 flex-shrink-0">
             <div className="flex justify-between items-start mb-2">
                 <div>
                    <h2 className="text-3xl font-bold text-gray-900">Upgrade your workspace</h2>
                    <p className="text-gray-500 mt-2">Unlock the full potential of Kulsi AI.</p>
                 </div>
                 <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                     <X className="w-6 h-6 text-gray-500" />
                 </button>
             </div>
          </div>

          <div className="p-6 md:p-8 pt-0 grid md:grid-cols-3 gap-6 flex-1 overflow-visible">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`relative rounded-2xl p-6 border-2 transition-all duration-200 flex flex-col ${
                    currentPlan === plan.id 
                    ? 'border-indigo-600 bg-indigo-50/30' 
                    : plan.recommended 
                        ? 'border-indigo-100 shadow-xl scale-105 bg-white z-10' 
                        : 'border-gray-100 hover:border-indigo-100 bg-white'
                }`}
              >
                {plan.recommended && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow-lg">
                        Most Popular
                    </div>
                )}
                
                <div className={`w-12 h-12 rounded-xl ${plan.color} flex items-center justify-center mb-4`}>
                    <plan.icon className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <div className="flex items-baseline mt-2 mb-4">
                    <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 text-sm ml-1">/{plan.period}</span>
                </div>
                <p className="text-sm text-gray-500 mb-6 min-h-[40px]">{plan.description}</p>

                <div className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feat, i) => (
                        <div key={i} className="flex items-center text-sm text-gray-700">
                            <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            {feat}
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => {
                        if (currentPlan !== plan.id) {
                            onUpgrade(plan.id);
                            onClose();
                        }
                    }}
                    disabled={currentPlan === plan.id}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all transform active:scale-95 ${
                        currentPlan === plan.id
                        ? 'bg-gray-100 text-gray-400 cursor-default'
                        : plan.recommended
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                            : 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50'
                    }`}
                >
                    {currentPlan === plan.id ? 'Current Plan' : 'Upgrade'}
                </button>
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl text-center text-sm text-gray-500">
             Secure payment powered by Stripe. You can cancel anytime.
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SubscriptionModal;