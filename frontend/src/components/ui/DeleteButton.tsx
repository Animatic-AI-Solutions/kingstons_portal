import React, { forwardRef } from 'react';
import ActionButton, { ActionButtonProps } from './ActionButton';

export interface DeleteButtonProps extends Omit<ActionButtonProps, 'variant'> {
  // Inherits all ActionButton props except variant (which is fixed to 'delete')
}

const DeleteButton = forwardRef<HTMLButtonElement, DeleteButtonProps>((props, ref) => {
  return <ActionButton ref={ref} variant="delete" {...props} />;
});

DeleteButton.displayName = 'DeleteButton';

export default DeleteButton; 