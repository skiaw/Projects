from fastapi import FastAPI, HTTPException, Request
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from passlib.context import CryptContext
from decimal import Decimal, InvalidOperation
import pymysql
import uvicorn
import os

load_dotenv()
app = FastAPI()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PWD")
DB_NAME = os.getenv("DB_NAME")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONT_DIR = os.path.join(BASE_DIR, "../front")

app.mount("/front", StaticFiles(directory=FRONT_DIR), name="front")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_connection():
    return pymysql.connect(
        host="localhost",
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

def ensure_application_message_column(conn, cursor):
    cursor.execute("SHOW COLUMNS FROM applications LIKE 'message'")
    if not cursor.fetchone():
        cursor.execute("ALTER TABLE applications ADD COLUMN message TEXT")
        conn.commit()

def ensure_admin_role_enum(conn, cursor):
    cursor.execute("SHOW COLUMNS FROM people LIKE 'role'")
    column = cursor.fetchone()
    if column:
        column_type = column.get("Type", "")
        if "admin" not in column_type.lower():
            cursor.execute("ALTER TABLE people MODIFY role ENUM('Recruiter','Applicant','Admin')")
            conn.commit()

def initialize_schema():
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        ensure_admin_role_enum(conn, cursor)
        ensure_application_message_column(conn, cursor)
    except Exception as exc:
        print(f"[Startup] schema initialization skipped: {exc}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

initialize_schema()

def get_admin_id_from_request(request: Request) -> int:
    admin_id_header = request.headers.get("X-Admin-Id")
    if not admin_id_header:
        raise HTTPException(status_code=401, detail="Admin credentials required")
    try:
        return int(admin_id_header)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid admin identifier")

def require_admin(cursor, admin_id: int):
    cursor.execute("SELECT role FROM people WHERE person_id = %s", (admin_id,))
    admin = cursor.fetchone()
    if not admin or admin.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

def parse_decimal(value, field_name):
    if value in (None, "", " "):
        return None
    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid value for {field_name}")
    if decimal_value < 0 or decimal_value > Decimal("99999999.99"):
        raise HTTPException(
            status_code=400,
            detail=f"{field_name.replace('_', ' ').capitalize()} must be between 0 and 99 999 999.99"
        )
    return decimal_value

@app.get("/")
def read_root():
    return {"message": "API opérationnelle"}

# --------------------------- ADVERTISEMENTS ---------------------------

@app.get("/advertisements")
def get_all_ads():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM advertisements")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

@app.get("/advertisements/{ad_id}")
def get_advertisement(ad_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM advertisements WHERE ad_id = %s", (ad_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Advertisement not found")
    return row

@app.post("/advertisements")
async def create_advertisement(request: Request):
    data = await request.json()
    required = ["company_id", "title", "description"]
    if not all(k in data for k in required):
        raise HTTPException(status_code=400, detail="Missing required fields")
    salary_min = parse_decimal(data.get("salary_min"), "salary_min")
    salary_max = parse_decimal(data.get("salary_max"), "salary_max")
    if salary_min is not None and salary_max is not None and salary_min > salary_max:
        raise HTTPException(status_code=400, detail="salary_min cannot be greater than salary_max")
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        INSERT INTO advertisements 
        (company_id, title, description, location, salary_min, salary_max, contract_type, date_expiry)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
    """
    values = (
        data["company_id"],
        data["title"],
        data["description"],
        data.get("location"),
        salary_min,
        salary_max,
        data.get("contract_type"),
        data.get("date_expiry")
    )
    cursor.execute(query, values)
    conn.commit()
    new_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return {"message": "Advertisement created", "ad_id": new_id}

# --------------------------- APPLICATIONS ---------------------------

@app.post("/applications")
async def create_application(request: Request):
    data = await request.json()
    required_fields = ["ad_id", "name", "email", "phone", "message"]
    for field in required_fields:
        if field not in data:
            raise HTTPException(status_code=400, detail=f"Missing field: {field}")
    conn = get_connection()
    cursor = conn.cursor()
    ensure_application_message_column(conn, cursor)
    applicant_id = data.get("person_id")
    person = None
    if applicant_id:
        cursor.execute("SELECT person_id, role FROM people WHERE person_id = %s", (applicant_id,))
        person = cursor.fetchone()
        if not person:
            conn.rollback()
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="Invalid applicant identifier")
        if person.get("role") != "Applicant":
            conn.rollback()
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="Only candidate accounts can apply")
    else:
        cursor.execute("SELECT person_id FROM people WHERE email = %s", (data["email"],))
        person = cursor.fetchone()
        if person:
            applicant_id = person["person_id"]
        else:
            cursor.execute("""
                INSERT INTO people (first_name, last_name, email, phone, role)
                VALUES (%s, %s, %s, %s, 'Applicant')
            """, (data["name"].split()[0], data["name"].split()[-1], data["email"], data["phone"]))
            conn.commit()
            applicant_id = cursor.lastrowid
    cursor.execute("""
        SELECT application_id FROM applications
        WHERE ad_id = %s AND applicant_id = %s
    """, (data["ad_id"], applicant_id))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        raise HTTPException(status_code=400, detail="You have already applied to this advertisement.")
    cursor.execute("SELECT ad_id FROM advertisements WHERE ad_id = %s", (data["ad_id"],))
    ad = cursor.fetchone()
    if not ad:
        raise HTTPException(status_code=404, detail="Advertisement not found")
    cursor.execute("""
        INSERT INTO applications (ad_id, applicant_id, recruiter_id, status, message)
        VALUES (%s, %s, NULL, 'Sent', %s)
    """, (data["ad_id"], applicant_id, data.get("message")))
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Application submitted successfully"}

@app.get("/applications/applicant/{applicant_id}")
def get_applications_by_applicant(applicant_id: int):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT a.application_id, ad.title AS job_title, a.status, a.application_date, a.message
            FROM applications a
            JOIN advertisements ad ON a.ad_id = ad.ad_id
            WHERE a.applicant_id = %s
            ORDER BY a.application_date DESC
        """, (applicant_id,))
        rows = cursor.fetchall()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.delete("/applications/{app_id}")
def delete_application(app_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM applications WHERE application_id = %s", (app_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Application deleted successfully"}

# --------------------------- ADMIN ---------------------------

@app.get("/companies")
def get_companies():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM companies")
    companies = cursor.fetchall()
    cursor.close()
    conn.close()
    return companies

@app.get("/admin/overview")
async def admin_overview(request: Request):
    admin_id = get_admin_id_from_request(request)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        require_admin(cursor, admin_id)
        cursor.execute("SELECT COUNT(*) AS total_users FROM people")
        total_users = cursor.fetchone()["total_users"]
        cursor.execute("SELECT COUNT(*) AS total_companies FROM companies")
        total_companies = cursor.fetchone()["total_companies"]
        cursor.execute("SELECT COUNT(*) AS total_ads FROM advertisements")
        total_ads = cursor.fetchone()["total_ads"]
        cursor.execute("SELECT COUNT(*) AS total_applications FROM applications")
        total_applications = cursor.fetchone()["total_applications"]
        return {
            "users": total_users,
            "companies": total_companies,
            "advertisements": total_ads,
            "applications": total_applications
        }
    finally:
        cursor.close()
        conn.close()

@app.get("/admin/users")
async def admin_get_users(request: Request):
    admin_id = get_admin_id_from_request(request)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        require_admin(cursor, admin_id)
        cursor.execute("""
            SELECT person_id, first_name, last_name, email, phone, role, created_at, company_id
            FROM people
            ORDER BY created_at DESC
        """)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

@app.post("/admin/users")
async def admin_create_user(request: Request):
    data = await request.json()
    required_fields = ["first_name", "last_name", "email", "role"]
    for field in required_fields:
        if field not in data or not data[field]:
            raise HTTPException(status_code=400, detail=f"Missing field: {field}")

    if data["role"] not in {"Applicant", "Recruiter", "Admin"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    admin_id = get_admin_id_from_request(request)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        require_admin(cursor, admin_id)
        if data["role"] == "Admin":
            ensure_admin_role_enum(conn, cursor)
        cursor.execute("SELECT person_id FROM people WHERE email = %s", (data["email"],))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed_password = pwd_context.hash(data.get("password") or "changeme123")
        cursor.execute("""
            INSERT INTO people (first_name, last_name, email, phone, role, password, company_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            data["first_name"],
            data["last_name"],
            data["email"],
            data.get("phone"),
            data["role"],
            hashed_password,
            data.get("company_id"),
        ))
        conn.commit()
        new_user_id = cursor.lastrowid
        return {"message": "User created successfully", "person_id": new_user_id}
    finally:
        cursor.close()
        conn.close()

@app.post("/admin/companies")
async def admin_create_company_admin(request: Request):
    admin_id = get_admin_id_from_request(request)
    data = await request.json()
    required_fields = ["name"]
    missing = [field for field in required_fields if not data.get(field)]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing company field(s): {', '.join(missing)}")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        require_admin(cursor, admin_id)
        cursor.execute("""
            INSERT INTO companies (name, industry, size, website, email, phone, address)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get("name"),
            data.get("industry"),
            data.get("size"),
            data.get("website"),
            data.get("email"),
            data.get("phone"),
            data.get("address"),
        ))
        conn.commit()
        company_id = cursor.lastrowid
        return {"message": "Company created successfully", "company_id": company_id}
    finally:
        cursor.close()
        conn.close()

@app.put("/admin/companies/{company_id}")
async def admin_update_company(company_id: int, request: Request):
    admin_id = get_admin_id_from_request(request)
    data = await request.json()
    allowed_fields = ["name", "industry", "size", "website", "email", "phone", "address"]
    updates = {field: data.get(field) for field in allowed_fields if field in data}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields provided for update")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        require_admin(cursor, admin_id)
        cursor.execute("SELECT company_id FROM companies WHERE company_id = %s", (company_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Company not found")
        set_clause = ", ".join(f"{field}=%s" for field in updates)
        values = list(updates.values())
        values.append(company_id)
        cursor.execute(f"UPDATE companies SET {set_clause} WHERE company_id = %s", values)
        conn.commit()
        return {"message": "Company updated successfully"}
    finally:
        cursor.close()
        conn.close()

@app.put("/admin/users/{person_id}")
async def admin_update_user(person_id: int, request: Request):
    data = await request.json()
    allowed_fields = ["first_name", "last_name", "email", "phone", "role", "company_id", "password"]
    updates = {field: data.get(field) for field in allowed_fields if field in data}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields provided for update")

    admin_id = get_admin_id_from_request(request)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        require_admin(cursor, admin_id)
        cursor.execute("SELECT * FROM people WHERE person_id = %s", (person_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        if person_id == admin_id and updates.get("role") and updates["role"] != "Admin":
            raise HTTPException(status_code=400, detail="You cannot change your own role")
        if updates.get("role") == "Admin":
            ensure_admin_role_enum(conn, cursor)
        if "email" in updates:
            cursor.execute("SELECT person_id FROM people WHERE email = %s AND person_id <> %s", (updates["email"], person_id))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Email already registered")
        if "password" in updates:
            updates["password"] = pwd_context.hash(updates["password"])

        set_clause = ", ".join(f"{field}=%s" for field in updates)
        values = list(updates.values())
        values.append(person_id)
        cursor.execute(f"UPDATE people SET {set_clause} WHERE person_id = %s", values)
        conn.commit()
        return {"message": "User updated successfully"}
    finally:
        cursor.close()
        conn.close()

@app.delete("/admin/users/{person_id}")
async def admin_delete_user(person_id: int, request: Request):
    admin_id = get_admin_id_from_request(request)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        require_admin(cursor, admin_id)
        if person_id == admin_id:
            raise HTTPException(status_code=400, detail="You cannot delete your own admin account.")
        cursor.execute("SELECT person_id FROM people WHERE person_id = %s", (person_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
        cursor.execute("DELETE FROM people WHERE person_id = %s", (person_id,))
        conn.commit()
        return {"message": "User deleted successfully"}
    finally:
        cursor.close()
        conn.close()

@app.post("/admin/admins")
async def admin_create_admin(request: Request):
    data = await request.json()
    required_fields = ["email", "password"]
    for field in required_fields:
        if field not in data or not data[field]:
            raise HTTPException(status_code=400, detail=f"Missing field: {field}")

    admin_id = get_admin_id_from_request(request)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        require_admin(cursor, admin_id)
        ensure_admin_role_enum(conn, cursor)
        cursor.execute("SELECT person_id FROM people WHERE email = %s", (data["email"],))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed_password = pwd_context.hash(data["password"])
        cursor.execute("""
            INSERT INTO people (first_name, last_name, email, phone, role, password)
            VALUES (%s, %s, %s, %s, 'Admin', %s)
        """, (
            data.get("first_name", "Admin"),
            data.get("last_name", "User"),
            data["email"],
            data.get("phone"),
            hashed_password,
        ))
        conn.commit()
        new_admin_id = cursor.lastrowid
        return {"message": "Admin account created successfully", "admin_id": new_admin_id}
    finally:
        cursor.close()
        conn.close()

@app.get("/admin/applications")
async def admin_get_applications(request: Request):
    admin_id = get_admin_id_from_request(request)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        require_admin(cursor, admin_id)
        cursor.execute("""
            SELECT 
                a.application_id,
                a.status,
                a.application_date,
                a.message,
                p.first_name,
                p.last_name,
                p.email,
                p.phone,
                ad.ad_id,
                ad.title,
                c.name AS company_name
            FROM applications a
            JOIN people p ON p.person_id = a.applicant_id
            JOIN advertisements ad ON ad.ad_id = a.ad_id
            JOIN companies c ON c.company_id = ad.company_id
            ORDER BY a.application_date DESC
        """)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

@app.delete("/admin/applications/{application_id}")
async def admin_delete_application(application_id: int, request: Request):
    admin_id = get_admin_id_from_request(request)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        require_admin(cursor, admin_id)
        cursor.execute("SELECT application_id FROM applications WHERE application_id = %s", (application_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Application not found")
        cursor.execute("DELETE FROM applications WHERE application_id = %s", (application_id,))
        conn.commit()
        return {"message": "Application deleted successfully"}
    finally:
        cursor.close()
        conn.close()

@app.patch("/admin/applications/{application_id}")
async def admin_update_application(application_id: int, request: Request):
    admin_id = get_admin_id_from_request(request)
    data = await request.json()
    status = data.get("status")
    allowed_statuses = {"Sent", "In review", "Interview", "Rejected", "Hired"}
    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid status value")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        require_admin(cursor, admin_id)
        cursor.execute("SELECT application_id FROM applications WHERE application_id = %s", (application_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Application not found")
        cursor.execute("UPDATE applications SET status = %s WHERE application_id = %s", (status, application_id))
        conn.commit()
        return {"message": "Application updated successfully"}
    finally:
        cursor.close()
        conn.close()

@app.delete("/admin/companies/{company_id}")
async def admin_delete_company(company_id: int, request: Request):
    admin_id = get_admin_id_from_request(request)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        require_admin(cursor, admin_id)
        cursor.execute("SELECT company_id FROM companies WHERE company_id = %s", (company_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Company not found")
        cursor.execute("DELETE FROM companies WHERE company_id = %s", (company_id,))
        conn.commit()
        return {"message": "Company deleted successfully"}
    finally:
        cursor.close()
        conn.close()

@app.delete("/admin/advertisements/{ad_id}")
async def admin_delete_advertisement(ad_id: int, request: Request):
    admin_id = get_admin_id_from_request(request)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        require_admin(cursor, admin_id)
        cursor.execute("SELECT ad_id FROM advertisements WHERE ad_id = %s", (ad_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Advertisement not found")
        cursor.execute("DELETE FROM advertisements WHERE ad_id = %s", (ad_id,))
        conn.commit()
        return {"message": "Advertisement deleted successfully"}
    finally:
        cursor.close()
        conn.close()

@app.post("/admin/advertisements")
async def admin_create_advertisement(request: Request):
    admin_id = get_admin_id_from_request(request)
    data = await request.json()
    required = ["company_id", "title", "description"]
    missing = [field for field in required if not data.get(field)]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing advertisement field(s): {', '.join(missing)}")

    salary_min = parse_decimal(data.get("salary_min"), "salary_min")
    salary_max = parse_decimal(data.get("salary_max"), "salary_max")
    if salary_min is not None and salary_max is not None and salary_min > salary_max:
        raise HTTPException(status_code=400, detail="salary_min cannot be greater than salary_max")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        require_admin(cursor, admin_id)
        cursor.execute("SELECT company_id FROM companies WHERE company_id = %s", (data["company_id"],))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Company not found")
        cursor.execute("""
            INSERT INTO advertisements (company_id, title, description, location, salary_min, salary_max, contract_type, date_expiry)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data["company_id"],
            data["title"],
            data["description"],
            data.get("location"),
            salary_min,
            salary_max,
            data.get("contract_type"),
            data.get("date_expiry"),
        ))
        conn.commit()
        ad_id = cursor.lastrowid
        return {"message": "Advertisement created successfully", "ad_id": ad_id}
    finally:
        cursor.close()
        conn.close()

@app.put("/admin/advertisements/{ad_id}")
async def admin_update_advertisement(ad_id: int, request: Request):
    admin_id = get_admin_id_from_request(request)
    data = await request.json()
    allowed_fields = ["title", "description", "location", "salary_min", "salary_max", "contract_type", "date_expiry", "company_id"]
    updates = {field: data.get(field) for field in allowed_fields if field in data}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields provided for update")

    if "salary_min" in updates:
        updates["salary_min"] = parse_decimal(updates["salary_min"], "salary_min")
    if "salary_max" in updates:
        updates["salary_max"] = parse_decimal(updates["salary_max"], "salary_max")
    if updates.get("salary_min") is not None and updates.get("salary_max") is not None:
        if updates["salary_min"] > updates["salary_max"]:
            raise HTTPException(status_code=400, detail="salary_min cannot be greater than salary_max")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        require_admin(cursor, admin_id)
        cursor.execute("SELECT ad_id FROM advertisements WHERE ad_id = %s", (ad_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Advertisement not found")
        if "company_id" in updates:
            cursor.execute("SELECT company_id FROM companies WHERE company_id = %s", (updates["company_id"],))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Company not found")
        set_clause = ", ".join(f"{field}=%s" for field in updates)
        values = list(updates.values())
        values.append(ad_id)
        cursor.execute(f"UPDATE advertisements SET {set_clause} WHERE ad_id = %s", values)
        conn.commit()
        return {"message": "Advertisement updated successfully"}
    finally:
        cursor.close()
        conn.close()

# --------------------------- AUTH ---------------------------

@app.post("/register")
async def register(request: Request):
    data = await request.json()
    required = ["first_name", "last_name", "email", "password"]
    for f in required:
        if f not in data:
            raise HTTPException(status_code=400, detail=f"Missing field: {f}")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT person_id FROM people WHERE email = %s", (data["email"],))
    existing = cursor.fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = pwd_context.hash(data["password"])

    cursor.execute("""
        INSERT INTO people (first_name, last_name, email, phone, role, password)
        VALUES (%s, %s, %s, %s, 'Applicant', %s)
    """, (data["first_name"], data["last_name"], data["email"], data.get("phone"), hashed_password))
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Account created successfully"}

@app.post("/login")
async def login(request: Request):
    data = await request.json()
    required = ["email", "password"]
    for f in required:
        if f not in data:
            raise HTTPException(status_code=400, detail=f"Missing field: {f}")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM people WHERE email = %s", (data["email"],))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="No account found for this email.")

    stored_password = user.get("password")
    if not stored_password:
        raise HTTPException(status_code=401, detail="Password not set for this account. Please reset your password.")

    if isinstance(stored_password, bytes):
        stored_password = stored_password.decode()

    if isinstance(stored_password, str) and (stored_password.startswith("$2b$") or stored_password.startswith("$2a$")):
        valid_password = pwd_context.verify(data["password"], stored_password)
    else:
        valid_password = stored_password == data["password"]

    if not valid_password:
        raise HTTPException(status_code=401, detail="Incorrect password.")

    user.pop("password", None)
    return {"message": "Login successful", "user": user}

@app.post("/companies")
async def create_company(request: Request):
    payload = await request.json()
    company = payload.get("company") if isinstance(payload, dict) else None
    recruiter = payload.get("recruiter") if isinstance(payload, dict) else None

    if not isinstance(company, dict) or not isinstance(recruiter, dict):
        raise HTTPException(status_code=400, detail="Invalid payload structure")

    required_company_fields = ["name", "industry", "size", "email"]
    missing_company = [field for field in required_company_fields if not company.get(field)]
    if missing_company:
        raise HTTPException(
            status_code=400,
            detail=f"Missing company field(s): {', '.join(missing_company)}"
        )

    required_recruiter_fields = ["first_name", "last_name", "email", "phone", "password"]
    missing_recruiter = [field for field in required_recruiter_fields if not recruiter.get(field)]
    if missing_recruiter:
        raise HTTPException(
            status_code=400,
            detail=f"Missing recruiter field(s): {', '.join(missing_recruiter)}"
        )

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT person_id FROM people WHERE email = %s", (recruiter["email"],))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        cursor.execute("""
            INSERT INTO companies (name, industry, size, website, email, phone, address)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            company.get("name"),
            company.get("industry"),
            company.get("size"),
            company.get("website"),
            company.get("email"),
            company.get("phone"),
            company.get("address"),
        ))
        company_id = cursor.lastrowid

        hashed_password = pwd_context.hash(recruiter["password"])
        cursor.execute("""
            INSERT INTO people (company_id, first_name, last_name, email, phone, role, password)
            VALUES (%s, %s, %s, %s, %s, 'Recruiter', %s)
        """, (
            company_id,
            recruiter.get("first_name"),
            recruiter.get("last_name"),
            recruiter.get("email"),
            recruiter.get("phone"),
            hashed_password,
        ))
        recruiter_id = cursor.lastrowid

        cursor.execute("""
            SELECT person_id, company_id, first_name, last_name, email, phone, role
            FROM people
            WHERE person_id = %s
        """, (recruiter_id,))
        recruiter_record = cursor.fetchone()

        conn.commit()
    except HTTPException as exc:
        conn.rollback()
        raise exc
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        cursor.close()
        conn.close()

    return {
        "message": "Company account created successfully",
        "company_id": company_id,
        "recruiter_id": recruiter_id,
        "recruiter": recruiter_record,
    }

@app.get("/companies/{company_id}")
def get_company(company_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM companies WHERE company_id = %s", (company_id,))
        company = cursor.fetchone()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        return company
    finally:
        cursor.close()
        conn.close()

@app.put("/companies/{company_id}")
async def update_company(company_id: int, request: Request):
    data = await request.json()
    allowed_fields = ["name", "industry", "size", "website", "email", "phone", "address"]
    updates = {field: data.get(field) for field in allowed_fields if field in data}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields provided for update")

    set_clause = ", ".join(f"{field}=%s" for field in updates)
    values = list(updates.values())
    values.append(company_id)

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT company_id FROM companies WHERE company_id = %s", (company_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Company not found")
        cursor.execute(f"UPDATE companies SET {set_clause} WHERE company_id = %s", values)
        conn.commit()
    except HTTPException as exc:
        conn.rollback()
        raise exc
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        cursor.close()
        conn.close()

    return {"message": "Company updated successfully"}

@app.get("/companies/{company_id}/advertisements")
def get_company_advertisements(company_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT ad_id, title, description, location, salary_min, salary_max, contract_type, date_posted, date_expiry
            FROM advertisements
            WHERE company_id = %s
            ORDER BY date_posted DESC
        """, (company_id,))
        rows = cursor.fetchall()
        return rows
    finally:
        cursor.close()
        conn.close()

@app.put("/advertisements/{ad_id}")
async def update_advertisement(ad_id: int, request: Request):
    data = await request.json()
    allowed_fields = [
        "title", "description", "location", "salary_min", "salary_max", "contract_type", "date_expiry"
    ]
    updates = {field: data.get(field) for field in allowed_fields if field in data}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields provided for update")

    if "salary_min" in updates:
        updates["salary_min"] = parse_decimal(updates["salary_min"], "salary_min")
    if "salary_max" in updates:
        updates["salary_max"] = parse_decimal(updates["salary_max"], "salary_max")

    set_clause = ", ".join(f"{field}=%s" for field in updates)
    values = list(updates.values())
    values.append(ad_id)

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT ad_id, salary_min, salary_max FROM advertisements WHERE ad_id = %s", (ad_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Advertisement not found")
        current_min = updates.get("salary_min", existing.get("salary_min"))
        current_max = updates.get("salary_max", existing.get("salary_max"))
        if current_min is not None and current_max is not None and current_min > current_max:
            raise HTTPException(status_code=400, detail="salary_min cannot be greater than salary_max")
        cursor.execute(f"UPDATE advertisements SET {set_clause} WHERE ad_id = %s", values)
        conn.commit()
    except HTTPException as exc:
        conn.rollback()
        raise exc
    finally:
        cursor.close()
        conn.close()

    return {"message": "Advertisement updated successfully"}

@app.delete("/advertisements/{ad_id}")
def delete_advertisement(ad_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT ad_id FROM advertisements WHERE ad_id = %s", (ad_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Advertisement not found")
        cursor.execute("DELETE FROM advertisements WHERE ad_id = %s", (ad_id,))
        conn.commit()
    finally:
        cursor.close()
        conn.close()

    return {"message": "Advertisement deleted successfully"}

@app.get("/advertisements/{ad_id}/candidates")
def get_advertisement_candidates(ad_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                a.application_id,
                a.status,
                a.application_date,
                a.message,
                p.person_id,
                p.first_name,
                p.last_name,
                p.email,
                p.phone,
                cp.location,
                cp.education,
                cp.experience,
                cp.years_experience,
                cp.skills,
                cp.about
            FROM applications a
            JOIN people p ON a.applicant_id = p.person_id
            LEFT JOIN candidate_profiles cp ON cp.person_id = p.person_id
            WHERE a.ad_id = %s
            ORDER BY a.application_date DESC
        """, (ad_id,))
        rows = cursor.fetchall()
        return rows
    finally:
        cursor.close()
        conn.close()


@app.post("/candidates")
async def create_candidate(request: Request):
    data = await request.json()
    required = ["first_name", "last_name", "email", "password"]
    missing = [field for field in required if not data.get(field)]
    if missing:
        missing_fields = ", ".join(missing)
        raise HTTPException(status_code=400, detail=f"Missing required field(s): {missing_fields}")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT person_id FROM people WHERE email = %s", (data["email"],))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed_password = pwd_context.hash(data["password"])
        cursor.execute("""
            INSERT INTO people (first_name, last_name, email, phone, role, password)
            VALUES (%s, %s, %s, %s, 'Applicant', %s)
        """, (
            data["first_name"],
            data["last_name"],
            data["email"],
            data.get("phone"),
            hashed_password,
        ))
        person_id = cursor.lastrowid

        def to_int(value):
            try:
                return int(value) if value not in (None, "") else None
            except (TypeError, ValueError):
                return None

        cursor.execute("""
            INSERT INTO candidate_profiles (person_id, location, experience, education, years_experience, skills, about)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            person_id,
            data.get("location"),
            data.get("experience"),
            data.get("education"),
            to_int(data.get("years_experience")),
            data.get("skills"),
            data.get("about"),
        ))
        conn.commit()
    except HTTPException as exc:
        conn.rollback()
        raise exc
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        cursor.close()
        conn.close()

    return {"message": "Candidate created successfully", "person_id": person_id}

@app.get("/candidates/{person_id}")
async def get_candidate(person_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM people WHERE person_id = %s", (person_id,))
    person = cursor.fetchone()
    cursor.execute("SELECT * FROM candidate_profiles WHERE person_id = %s", (person_id,))
    profile = cursor.fetchone()
    cursor.close()
    conn.close()
    return {"candidate": person, "profile": profile or None}

@app.put("/candidates/{person_id}")
async def update_candidate(person_id: int, request: Request):
    data = await request.json()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE people
        SET first_name=%s, last_name=%s, email=%s, phone=%s
        WHERE person_id=%s
    """, (data.get("first_name"), data.get("last_name"), data.get("email"), data.get("phone"), person_id))
    cursor.execute("""
        UPDATE candidate_profiles
        SET location=%s, education=%s, experience=%s, years_experience=%s, skills=%s, about=%s
        WHERE person_id=%s
    """, (data.get("location"), data.get("education"), data.get("experience"), data.get("years_experience"), data.get("skills"), data.get("about"), person_id))
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Profile updated successfully"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
