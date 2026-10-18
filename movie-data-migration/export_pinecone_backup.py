import os
from dotenv import load_dotenv
from pinecone import Pinecone

# .env file থেকে credentials load করা
load_dotenv()

api_key = os.getenv("PINECONE_API_KEY")
index_name = os.getenv("PINECONE_INDEX_NAME")

# Credentials আছে কি না check করা
if not api_key or not index_name:
    raise ValueError("Pinecone API key or index name missing in .env")

# Pinecone-এ connect করা
pc = Pinecone(api_key=api_key)

# Index-এর basic information দেখা
index = pc.Index(index_name)
stats = index.describe_index_stats()

print("Pinecone connection successful!")
print("Index name:", index_name)
print("Total records:", stats.total_vector_count)


# একটি existing movie record retrieve করা
result = index.query(
    id="movie-102-not-out",
    top_k=1,
    include_metadata=True
)

print("\nRetrieved movie record:")

for match in result.matches:
    print("ID:", match.id)
    print("Metadata:", match.metadata)