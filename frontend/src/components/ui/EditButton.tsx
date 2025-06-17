import React, { forwardRef } from 'react';
import ActionButton, { ActionButtonProps } from './ActionButton';

export interface EditButtonProps extends Omit<ActionButtonProps, 'variant'> {
  // Inherits all ActionButton props except variant (which is fixed to 'edit')
}

const EditButton = forwardRef<HTMLButtonElement, EditButtonProps>((props, ref) => {
  return <ActionButton ref={ref} variant="edit" {...props} />;
});

EditButton.displayName = 'EditButton';

export default EditButton; 