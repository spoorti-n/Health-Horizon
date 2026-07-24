import sqlite3
import os

# Get the path to the database
db_path = os.path.join(os.path.dirname(__file__), "database", "outbreaks.db")

def check_database():
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # 1. Total count
        cursor.execute("SELECT COUNT(*) FROM health_signals")
        total_count = cursor.fetchone()[0]
        print(f"Total rows in health_signals: {total_count}")
        print("-" * 40)

        # 2. First 5 rows
        print("First 5 rows:")
        cursor.execute("SELECT * FROM health_signals LIMIT 5")
        rows = cursor.fetchall()
        
        # Get column names
        column_names = [description[0] for description in cursor.description]
        print(column_names)

        for row in rows:
            print(row)

        conn.close()
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    check_database()
