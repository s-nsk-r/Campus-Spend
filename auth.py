"""
Authentication, TOTP Multi-Factor Authentication (MFA), and RBAC Module
BACSE344 DA3 - Question 2(b)
Implements:
  - TOTP MFA (Google / Microsoft Authenticator compatible via RFC 6238)
  - Role-Based Access Control (RBAC) protecting sensitive Update & Delete endpoints
  - Cryptographic token generation & validation
"""

import os
import hmac
import hashlib
import base64
import json
import time
from typing import Optional, Dict, Any
import pyotp
import qrcode
from fastapi import Header, HTTPException, Depends, status
from sqlalchemy.orm import Session
from database import get_db
import models

# Secret key for HMAC signing of session tokens
AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "campus-spend-vit-secret-key-25BCE5808-c1-slot")

def create_access_token(username: str, role: str, expires_in_sec: int = 3600) -> str:
    """Generates a tamper-proof HMAC-SHA256 signed bearer token carrying identity and role."""
    payload = {
        "sub": username,
        "role": role,
        "exp": int(time.time()) + expires_in_sec,
        "iat": int(time.time())
    }
    raw_json = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(raw_json).decode('utf-8').rstrip('=')
    
    # Sign payload
    signature = hmac.new(AUTH_SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')
    
    return f"{payload_b64}.{sig_b64}"

def verify_access_token(token: str) -> Dict[str, Any]:
    """Validates token signature and expiration, returning decoded payload."""
    try:
        parts = token.split('.')
        if len(parts) != 2:
            raise ValueError("Malformed token structure")
        payload_b64, sig_b64 = parts
        
        # Verify signature
        expected_sig = hmac.new(AUTH_SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
        actual_sig = base64.urlsafe_b64decode(sig_b64 + '=' * (-len(sig_b64) % 4))
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError("Invalid cryptographic token signature")
        
        # Decode payload
        raw_json = base64.urlsafe_b64decode(payload_b64 + '=' * (-len(payload_b64) % 4))
        payload = json.loads(raw_json.decode('utf-8'))
        
        if time.time() > payload.get("exp", 0):
            raise ValueError("Token has expired")
            
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> models.User:
    """FastAPI Dependency: Authenticates bearer token and retrieves user entity from DB."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: No Bearer token provided in Authorization header.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Format must be: 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"}
        )
        
    raw_token = authorization.split(" ", 1)[1].strip()
    payload = verify_access_token(raw_token)
    username = payload.get("sub")
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"User account '{username}' referenced by token does not exist.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user

def require_role(required_role: str):
    """
    Role-Based Access Control (RBAC) Dependency Factory.
    Enforces that the authenticated user possesses the required role (e.g., 'admin').
    Rejects unauthorized roles with HTTP 403 Forbidden.
    """
    def role_checker(current_user: models.User = Depends(get_current_user)) -> models.User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Insufficient permissions. Endpoint requires role '{required_role}', but your active role is '{current_user.role}'."
            )
        return current_user
    return role_checker

# ==========================================
# TOTP Multi-Factor Authentication Utilities
# ==========================================
def generate_totp_secret() -> str:
    """Generates an RFC 6238 compliant base32 TOTP secret key (160-bit entropy)."""
    return pyotp.random_base32()

def get_totp_provisioning_uri(username: str, secret: str) -> str:
    """Constructs the standard otpauth URI scanned by Google & Microsoft Authenticator."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(
        name=f"{username}@vitstudent.ac.in",
        issuer_name="CampusSpend-VIT"
    )

def verify_totp_code(secret: str, code: str) -> bool:
    """Verifies a 6-digit time-based one-time password with a 30s clock-drift tolerance window."""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)
