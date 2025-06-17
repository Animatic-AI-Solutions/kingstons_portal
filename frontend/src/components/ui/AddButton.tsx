import React, { forwardRef } from 'react';
import ActionButton, { ActionButtonProps } from './ActionButton';

export interface AddButtonProps extends Omit<ActionButtonProps, 'variant'> {
  // Inherits all ActionButton props except variant (which is fixed to 'add')
}

const AddButton = forwardRef<HTMLButtonElement, AddButtonProps>((props, ref) => {
  return <ActionButton ref={ref} variant="add" {...props} />;
});

AddButton.displayName = 'AddButton';

export default AddButton; 