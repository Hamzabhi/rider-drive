export interface Transitions {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  timing: {
    ease: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
    bounce: string;
  };
}

export const defaultTransitions: Transitions = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
  timing: {
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};

export function generateTransitionCss(transitions: Transitions): string {
  return `
--duration-fast: ${transitions.duration.fast};
--duration-normal: ${transitions.duration.normal};
--duration-slow: ${transitions.duration.slow};
--timing-ease: ${transitions.timing.ease};
--timing-ease-in: ${transitions.timing.easeIn};
--timing-ease-out: ${transitions.timing.easeOut};
--timing-ease-in-out: ${transitions.timing.easeInOut};
--timing-bounce: ${transitions.timing.bounce};
  `.trim();
}
