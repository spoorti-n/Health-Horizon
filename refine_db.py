import sqlite3
import os
from classifier import extract_disease

# Get the path to the database
db_path = os.path.join(os.path.dirname(__file__), "database", "outbreaks.db")

def refine_database():
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # 1. Fetch all 'Unknown' signals
        cursor.execute("SELECT id, title, description FROM health_signals WHERE detected_disease = 'Unknown'")
        unknown_rows = cursor.fetchall()
        
        if not unknown_rows:
            print("No 'Unknown' disease signals found to refine.")
            conn.close()
            return

        print(f"Found {len(unknown_rows)} 'Unknown' signals. Refing with improved NLP...")

        for row_id, title, description in unknown_rows:
            combined_text = f"{title} {description}"
            new_disease = extract_disease(combined_text)
            
            if new_disease != "Unknown":
                cursor.execute("UPDATE health_signals SET detected_disease = ? WHERE id = ?", (new_disease, row_id))
                print(f"Updated ID {row_id}: {new_disease}")
            else:
                print(f"ID {row_id} remains Unknown.")

        conn.commit()
        conn.close()
        print("-" * 40)
        print("Refinement complete.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    refine_database()
