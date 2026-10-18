import os
import json
from dotenv import load_dotenv
from pinecone import Pinecone

load_dotenv()

api_key = os.getenv("PINECONE_API_KEY")
index_name = os.getenv("PINECONE_INDEX_NAME")

if not api_key or not index_name:
    raise ValueError("Pinecone credentials missing in .env")

pc = Pinecone(api_key=api_key)
index = pc.Index(index_name)

print("Connected to Pinecone:", index_name)

stats = index.describe_index_stats()
print("Expected records:", stats.total_vector_count)

# Step 1: Collect all record IDs
all_ids = []
for id_batch in index.list():
    for item in id_batch:
        all_ids.append(item.id)

print("Collected IDs:", len(all_ids))

# Step 2: Fetch records in batches
movies = []
batch_size = 100

for start in range(0, len(all_ids), batch_size):
    batch_ids = all_ids[start:start + batch_size]

    response = index.fetch(ids=batch_ids)

    for record_id, record in response.vectors.items():
        movies.append({
            "id": record_id,
            "metadata": record.metadata or {}
        })

    print(f"Fetched {len(movies)}/{len(all_ids)} records")

# Step 3: Save JSON backup
with open("movies_backup.json", "w", encoding="utf-8") as file:
    json.dump(movies, file, ensure_ascii=False, indent=2)

print("\nExport complete!")
print("Exported records:", len(movies))
print("Saved to: movies_backup.json")