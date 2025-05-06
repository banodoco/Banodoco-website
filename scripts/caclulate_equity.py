import re
import json
import pandas as pd
import os  # Added os module

# Initialize dictionary to hold totals
totals = {}

def distribute(users, total_share):
    normalized_users = [u.strip().lower() for u in users if u.strip()]  # Normalize names without deduplication
    if not normalized_users:
        return
    share_per_occurrence = total_share / len(normalized_users)
    for user in normalized_users:
        totals[user] = totals.get(user, 0) + share_per_occurrence

# Construct the path to the JSON grants file
script_dir = os.path.dirname(os.path.abspath(__file__))
json_file_path = os.path.join(script_dir, '../data/grants.json')
json_file_path = os.path.normpath(json_file_path)

try:
    with open(json_file_path, 'r', encoding='utf-8') as f:
        grants_data = json.load(f)
except FileNotFoundError:
    print(f"Error: JSON file not found at {json_file_path}.")
    exit()
except Exception as e:
    print(f"An error occurred while reading JSON file: {e}")
    exit()

# Build parsed_data_lines from the JSON data
parsed_data_lines = []
for grant in grants_data.get("grants", []):
    month = grant.get("month", "").strip()
    ownership_grants = grant.get("ownership_grants", "").strip()
    if month and ownership_grants:
        # Use a tab delimiter between month and grants
        parsed_data_lines.append(f"{month}\t{ownership_grants}")

if not parsed_data_lines:
    print(f"Error: No data parsed from the JSON file at {json_file_path}.")
    exit()

for line_number, line in enumerate(parsed_data_lines):
    if '\t' not in line:  # Check for the tab delimiter
        continue
    month_part, grants_part = line.split('\t', 1)  # Split only on the first tab
    if '|' in grants_part:  # Case with categories like CORE | INFRASTRUCTURE | ...
        sublists = [s.strip() for s in grants_part.split('|')]
        for sub in sublists:
            members_str = sub
            if ':' in sub:  # Check if there's a category label (e.g., "CORE:")
                try:
                    _, members_str = sub.split(':', 1)
                except ValueError:
                    pass 
            # Split members by ';' or ':'
            members = [m.strip() for m in re.split('[;:]', members_str) if m.strip()]
            if members:
                distribute(members, 0.25)  # 0.25% per sublist/category
    else:  # Case with no categories, 1% split among all listed
        members = [m.strip() for m in re.split('[;:]', grants_part) if m.strip()]
        if members:
            distribute(members, 1.0)  # 1% for the whole month

# Process additional transfers from the JSON data
print("Processing additional transfers...")
for transfer in grants_data.get("transfers", []):
    from_user = transfer.get("from", "").strip().lower()
    to_user = transfer.get("to", "").strip().lower()
    amount_str = transfer.get("amount", "").strip()
    if from_user and to_user and amount_str:
        try:
            amount_val = float(amount_str.replace('%', ''))
            totals[from_user] = totals.get(from_user, 0) - amount_val
            totals[to_user] = totals.get(to_user, 0) + amount_val
        except ValueError:
            print(f"Warning: Could not parse amount '{amount_str}' for transfer: {from_user} -> {to_user}. Skipping.")

# Calculate the accurate sum of all granted percentages BEFORE any display rounding
accurate_total_granted_sum = sum(totals.values())

# Prepare data for DataFrame including the new columns
df_data = []
for username, user_stake_in_company in totals.items():
    percentage_of_granted_pool = 0.0
    if accurate_total_granted_sum != 0:
        percentage_of_granted_pool = (user_stake_in_company / accurate_total_granted_sum) * 100
    df_data.append({
        'Username': username,
        'Percentage of Granted': round(percentage_of_granted_pool, 4),
        'Percentage of Total': round(user_stake_in_company, 4)
    })

# Convert to DataFrame
df = pd.DataFrame(df_data)
if not df.empty:
    df = df.sort_values(by='Percentage of Total', ascending=False).reset_index(drop=True)
else:
    print("No data to display in DataFrame.")

print(f"\nTotal % of Company Granted to Date: {accurate_total_granted_sum:.4f}%")
print("------------------------------------------------------")

pd.set_option('display.max_rows', None)
print(df)

# Save DataFrame to JSON
output_dir = os.path.join(script_dir, '../data')
json_output_path = os.path.join(output_dir, 'ownership.json')

try:
    os.makedirs(output_dir, exist_ok=True)
    df.to_json(json_output_path, orient='records', indent=2, force_ascii=False)
    print(f"\nEquity data successfully saved to: {json_output_path}")
except Exception as e:
    print(f"\nError saving equity data to JSON: {e}")
