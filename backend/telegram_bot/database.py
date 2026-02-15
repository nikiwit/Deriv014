"""
Direct Supabase Database Layer (No Flask Dependencies)

This module provides direct database access without using Flask's g context.
"""

import logging
from typing import Optional, Dict, List, Any
from supabase import create_client, Client
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class HRDatabase:
    """Direct Supabase client for HR data queries"""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        """
        Initialize direct Supabase connection.
        
        Args:
            supabase_url: Supabase project URL
            supabase_key: Supabase API key
        """
        # Create Supabase client - use simple initialization
        # The auth options aren't needed for service-role queries
        self.client: Client = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized for Telegram bot")
    
    def get_client(self) -> Client:
        """Get the raw Supabase client"""
        return self.client
    
    def close(self):
        """
        Close the Supabase client gracefully.
        This prevents AttributeError on cleanup.
        """
        try:
            if hasattr(self, 'client') and self.client:
                # Supabase client doesn't have a close method, but we can clean up references
                logger.info("Closing Supabase client")
                self.client = None
        except Exception as e:
            logger.error(f"Error closing Supabase client: {e}")
    
    # --- Authorization Methods ---
    
    def is_user_authorized(self, telegram_chat_id: str) -> tuple[bool, Optional[Dict[str, Any]]]:
        """
        Check if a Telegram chat ID is authorized to use the bot.
        
        Args:
            telegram_chat_id: The Telegram chat ID to check
            
        Returns:
            Tuple of (is_authorized, user_data)
        """
        try:
            # First, get the authorization record
            result = self.client.table("telegram_authorized_users") \
                .select("user_id, telegram_chat_id, is_active") \
                .eq("telegram_chat_id", str(telegram_chat_id)) \
                .eq("is_active", True) \
                .execute()
            
            if result.data and len(result.data) > 0:
                auth_record = result.data[0]
                user_id = auth_record.get("user_id")
                
                # Now get the user details separately to avoid ambiguous join
                user_result = self.client.table("users") \
                    .select("id, email, first_name, last_name, role, department") \
                    .eq("id", user_id) \
                    .execute()
                
                if user_result.data and len(user_result.data) > 0:
                    user_data = user_result.data[0]
                    
                    # Check if user is HR admin
                    if user_data.get("role") == "hr_admin":
                        return True, user_data
                    else:
                        logger.warning(f"User {telegram_chat_id} is authorized but not HR admin")
                        return False, None
            
            logger.warning(f"Telegram chat ID {telegram_chat_id} not authorized")
            return False, None
            
        except Exception as e:
            logger.error(f"Error checking authorization: {e}")
            return False, None
    
    def add_authorized_user(
        self, 
        telegram_chat_id: str, 
        telegram_username: Optional[str],
        user_id: str,
        authorized_by: str
    ) -> bool:
        """
        Add a new authorized user (for setup/admin purposes).
        
        Args:
            telegram_chat_id: Telegram chat ID
            telegram_username: Telegram username (optional)
            user_id: User ID from users table
            authorized_by: User ID who authorized this user
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.client.table("telegram_authorized_users").insert({
                "telegram_chat_id": str(telegram_chat_id),
                "telegram_username": telegram_username,
                "user_id": user_id,
                "authorized_by": authorized_by,
                "authorized_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True
            }).execute()
            
            logger.info(f"Added authorized user: {telegram_chat_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding authorized user: {e}")
            return False
    
    # --- User & Employee Queries ---
    
    def get_all_users(self, role: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all users, optionally filtered by role"""
        try:
            query = self.client.table("users").select("*").order("created_at")
            if role:
                query = query.eq("role", role)
            result = query.execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching users: {e}")
            return []
    
    def get_all_employees(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all employees, optionally filtered by status"""
        try:
            query = self.client.table("employees").select("*").order("created_at")
            if status:
                query = query.eq("status", status)
            result = query.execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching employees: {e}")
            return []
    
    # --- Training Queries ---
    
    def get_training_assignments(
        self, 
        employee_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get training assignments, optionally for a specific employee"""
        try:
            query = self.client.table("training_assignments").select("*")
            if employee_id:
                query = query.eq("employee_id", employee_id)
            result = query.execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching training assignments: {e}")
            return []
    
    # --- Contract Queries ---
    
    def get_contracts(
        self, 
        status: Optional[str] = None,
        employee_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get contracts, optionally filtered by status and/or employee"""
        try:
            query = self.client.table("contracts").select("*")
            if status:
                query = query.eq("status", status)
            if employee_id:
                query = query.eq("employee_id", employee_id)
            result = query.execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching contracts: {e}")
            return []
    
    # --- Onboarding Document Queries ---
    
    def get_onboarding_documents(
        self, 
        employee_id: Optional[str] = None,
        submitted: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """Get onboarding documents, optionally filtered"""
        try:
            query = self.client.table("onboarding_documents").select("*")
            if employee_id:
                query = query.eq("employee_id", employee_id)
            if submitted is not None:
                query = query.eq("submitted", submitted)
            result = query.execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching onboarding documents: {e}")
            return []
