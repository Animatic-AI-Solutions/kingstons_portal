import React, { forwardRef } from 'react';
import ActionButton, { ActionButtonProps } from './ActionButton';

export interface LapseButtonProps extends Omit<ActionButtonProps, 'variant'> {
  // Inherits all ActionButton props except variant (which is fixed to 'lapse')
}

const LapseButton = forwardRef<HTMLButtonElement, LapseButtonProps>((props, ref) => {
  return <ActionButton ref={ref} variant="lapse" {...props} />;
});

LapseButton.displayName = 'LapseButton';

export default LapseButton; 