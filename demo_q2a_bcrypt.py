"""
BACSE344 DA3 - Question 2(a): Salted Password Hashing Demonstration (Bcrypt)
Identifies sensitive data in CampusSpend and demonstrates:
  1. BEFORE: Database records storing vulnerable plain-text passwords
  2. TRANSFORMATION: Generating per-user cryptographic salts and computing bcrypt hashes ($2b$12$)
  3. AFTER: Database records storing secure 60-character salted hashes
  4. VERIFICATION: Successful authentication and rejection of incorrect passwords
"""

import os
import sys
import time
import bcrypt
from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
import models

def run_q2a_demo():
    print("=" * 95)
    print("BACSE344 DA3 - Question 2(a): Sensitive Data Identification & Salted Bcrypt Hashing")
    print("=" * 95)

    # 1. Sensitive Data Identification
    print("\n[PART 1: IDENTIFICATION OF SENSITIVE APPLICATION DATA]")
    print("-" * 95)
    print("In the CampusSpend student expense and financial management ecosystem, sensitive data includes:")
    print(" 1. User Authentication Credentials : User passwords guarding student financial accounts.")
    print(" 2. Personally Identifiable Information: VIT Student Reg No (25BCE5808), full name, institutional email.")
    print(" 3. Sensitive Financial Records     : Monthly allowances, bank/UPI references, hostel mess deposits.")
    print("Risk Mitigation: Passwords must NEVER be stored in plain text. Storing them as salted bcrypt hashes")
    print("ensures that even in the event of an unauthenticated database breach, passwords cannot be reversed")
    print("or cracked using precomputed rainbow tables.")

    # 2. Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    # Clear prior demo data from users table
    db.query(models.User).delete()
    db.commit()

    # Sample user credentials representing campus roles
    sample_users = [
        {"username": "sanskar_25BCE5808", "email": "sanskar@vitstudent.ac.in", "plain_pw": "CampusPass#2026", "role": "student"},
        {"username": "admin_finance",     "email": "finance.admin@vit.ac.in",  "plain_pw": "AdminSecret@VIT99", "role": "admin"},
        {"username": "mess_warden",       "email": "warden.hostel@vit.ac.in",  "plain_pw": "MessAdvance#123",   "role": "admin"},
    ]

    # Insert Plaintext (VULNERABLE BEFORE STATE)
    for u in sample_users:
        user_obj = models.User(
            username=u["username"],
            email=u["email"],
            password_hash=u["plain_pw"], # Deliberate plaintext for BEFORE demonstration
            role=u["role"],
            is_mfa_enabled=False
        )
        db.add(user_obj)
    db.commit()

    # Query and display BEFORE state
    print("\n" + "=" * 95)
    print(">>> DATABASE SCREENSHOT 1 [BEFORE]: Plain-Text Passwords (Vulnerable State)")
    print("=" * 95)
    users_before = db.query(models.User).all()
    print(f"+----+---------------------+-----------------------------+-----------------------+---------+")
    print(f"| ID | {'Username':<19} | {'Email':<27} | {'Password (Plain Text)':<21} | {'Role':<7} |")
    print(f"+----+---------------------+-----------------------------+-----------------------+---------+")
    for u in users_before:
        print(f"| {u.id:<2} | {u.username:<19} | {u.email:<27} | {u.password_hash:<21} | {u.role:<7} |")
    print(f"+----+---------------------+-----------------------------+-----------------------+---------+")
    print(" [!] VULNERABILITY ALERT: Passwords stored as cleartext! Exposed in database dumps and logs.")

    # Apply Salted Bcrypt Hashing
    print("\n" + "=" * 95)
    print(">>> EXECUTING MIGRATION: Salted Bcrypt Hashing (Cost Factor: 12 Rounds)")
    print("=" * 95)
    print("  • Generating unique 128-bit cryptographically secure salt per user (bcrypt.gensalt(12))...")
    print("  • Applying blowfish-based key derivation function (4,096 iterations)...")

    for u in users_before:
        # Generate unique salt and hash
        salt = bcrypt.gensalt(rounds=12)
        hashed_bytes = bcrypt.hashpw(u.password_hash.encode("utf-8"), salt)
        u.password_hash = hashed_bytes.decode("utf-8")

    db.commit()
    print("  ✓ Migration complete: All database passwords converted to salted bcrypt hashes.")

    # Query and display AFTER state
    print("\n" + "=" * 95)
    print(">>> DATABASE SCREENSHOT 2 [AFTER]: Salted Bcrypt Hashes (Secure Production State)")
    print("=" * 95)
    users_after = db.query(models.User).all()
    print(f"+----+---------------------+--------------------------------------------------------------+---------+")
    print(f"| ID | {'Username':<19} | {'Salted Password Hash (bcrypt $2b$12$)':<60} | {'Role':<7} |")
    print(f"+----+---------------------+--------------------------------------------------------------+---------+")
    for u in users_after:
        print(f"| {u.id:<2} | {u.username:<19} | {u.password_hash:<60} | {u.role:<7} |")
    print(f"+----+---------------------+--------------------------------------------------------------+---------+")

    # Anatomy of the hash
    sample_hash = users_after[0].password_hash
    parts = sample_hash.split("$")
    print("\n[CRYPTOGRAPHIC ANATOMY OF BCRYPT HASH]")
    print(f" Sample Hash : {sample_hash}")
    print(f"  • Algorithm Identifier : ${parts[1]}$ (Bcrypt modern 2b specification)")
    print(f"  • Cost Factor (Work)   : ${parts[2]}$ (2^12 = 4,096 key expansion rounds; resistant to GPU brute-force)")
    print(f"  • Salt & Ciphertext    : {parts[3][:22]} (Unique per-user salt) + {parts[3][22:]} (Hash)")

    # Verification test
    print("\n[VERIFICATION OF AUTHENTICATION LOGIC]")
    test_user = users_after[0]
    correct_pw = b"CampusPass#2026"
    wrong_pw = b"WrongPassword#999"

    is_valid = bcrypt.checkpw(correct_pw, test_user.password_hash.encode("utf-8"))
    is_invalid = bcrypt.checkpw(wrong_pw, test_user.password_hash.encode("utf-8"))

    print(f"  • Login with 'CampusPass#2026' : {'✓ SUCCESS (200 OK - Password Authenticated)' if is_valid else 'FAILED'}")
    print(f"  • Login with 'WrongPassword#999': {'✓ REJECTED (401 Unauthorized - Hash Mismatch)' if not is_invalid else 'FAILED'}")

    print("\n" + "=" * 95)
    print("✓ QUESTION 2(a) VERIFIED: Passwords securely hashed with salted bcrypt in database!")
    print("=====================================================================================\n")
    db.close()

if __name__ == "__main__":
    run_q2a_demo()
