import React from 'react';
import { motion } from 'motion/react';


export function AnimatedStepIndicator({ step, currentStep, onClickStep, disableStepIndicators }) {
  const status = currentStep === step ? 'active' : currentStep < step ? 'inactive' : 'complete';

  const handleClick = () => {
    if (step !== currentStep && !disableStepIndicators) onClickStep(step);
  };

  return (
    <motion.div 
      onClick={handleClick} 
      className="animated-step-indicator" 
      style={disableStepIndicators ? { pointerEvents: 'none', opacity: 0.5 } : {}} 
      animate={status} 
      initial={false}
    >
      <motion.div
        variants={{
          inactive: { scale: 1, backgroundColor: 'rgba(255,255,255,0.08)', color: '#9ca3af' },
          active: { scale: 1.1, backgroundColor: 'var(--primary)', color: '#fff', boxShadow: '0 0 20px rgba(82, 39, 255, 0.6)' },
          complete: { scale: 1, backgroundColor: 'var(--primary)', color: '#fff' }
        }}
        transition={{ duration: 0.3 }}
        className="animated-step-indicator-inner"
      >
        {status === 'complete' ? (
          <CheckIcon className="check-icon" />
        ) : status === 'active' ? (
          <div className="active-dot" />
        ) : (
          <span className="step-number">{step}</span>
        )}
      </motion.div>
    </motion.div>
  );
}

export function AnimatedStepConnector({ isComplete }) {
  const lineVariants = {
    incomplete: { scaleX: 0, backgroundColor: 'rgba(255,255,255,0.1)' },
    complete: { scaleX: 1, backgroundColor: 'var(--primary)' }
  };

  return (
    <div className="animated-step-connector">
      <motion.div
        className="animated-step-connector-inner"
        variants={lineVariants}
        initial={false}
        animate={isComplete ? 'complete' : 'incomplete'}
        transition={{ duration: 0.5 }}
        style={{ transformOrigin: 'left' }}
      />
    </div>
  );
}

function CheckIcon(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: 'tween', ease: 'easeOut', duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
