export const SUBSCRIPTION_CONFIG = {
  plans: {
    free: {
      name: 'Free',
      color: 'blue',
      popular: false,
    },
    basic: {
      name: 'Basic',
      color: 'blue',
      popular: false,
    },
    pro: {
      name: 'Pro',
      color: 'purple',
      popular: true,
    },
    enterprise: {
      name: 'Enterprise',
      color: 'gray',
      popular: false,
    },
  },
  features: {
    deals: 'Deals',
    contacts: 'Contacts',
  },
};

export const getPlanColor = (plan: string) => {
  return SUBSCRIPTION_CONFIG.plans[plan as keyof typeof SUBSCRIPTION_CONFIG.plans]?.color || 'blue';
};

export const isPlanPopular = (plan: string) => {
  return SUBSCRIPTION_CONFIG.plans[plan as keyof typeof SUBSCRIPTION_CONFIG.plans]?.popular || false;
};