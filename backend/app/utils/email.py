"""
Email Utilities

This module provides email-related functionality for authentication:
- Password reset email sending
- Email verification

For integration with an email service provider, modify the send_email function.
"""

import logging
import os
from datetime import datetime, timedelta
import uuid

# Configure logging
logger = logging.getLogger(__name__)

async def send_password_reset_email(email: str, token: str) -> bool:
    """
    Send a password reset email with a reset link
    
    Args:
        email: The recipient's email address
        token: The password reset token
        
    Returns:
        bool: True if email is sent successfully
        
    Note: Currently logs the email instead of sending.
    For production, integrate with an email service.
    """
    # Get the frontend URL from environment or use default
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    reset_url = f"{frontend_url}/reset-password?token={token}"
    
    # Log the email info - in production, you'd send an actual email
    logger.info(f"Password reset email would be sent to: {email}")
    
    # TODO: Implement actual email sending for production
    # Example with a service like SendGrid:
    # from sendgrid import SendGridAPIClient
    # from sendgrid.helpers.mail import Mail
    # message = Mail(from_email='noreply@example.com', to_emails=email, 
    #                subject='Password Reset', 
    #                plain_text_content=f'Reset your password: {reset_url}')
    # sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
    # response = sg.send(message)
    # return response.status_code == 202
    
    return True

def generate_reset_token() -> str:
    """
    Generate a unique token for password reset
    
    Returns:
        str: A unique token
    """
    return str(uuid.uuid4()) 