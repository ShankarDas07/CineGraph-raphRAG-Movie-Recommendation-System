
তোমার project-এর migration flow হবে:


            Pinecone — Vector Database.     
            Movie IDs + Metadata + Vector embeddings
            export_pinecone.py
                        ↓
                        ↓
            movies_backup.json
            Movie ID এবং metadata-র backup
            import_neo4j.py
                        ↓
                        ↓

            Neo4j — Graph Database
            Movie nodes এবং movie properties
            build_movie_graph.py
                        ↓
                        ↓
            Complete Movie Knowledge Graph
            Movie ↔ Actor, Director, Genre, Theme, Award


সবচেয়ে গুরুত্বপূর্ণ বিষয়: তোমার code-এ export_pinecone.py vector embedding-গুলো JSON-এ রাখছে না। এটি Pinecone record ID এবং metadata export করছে। Movie recommendation-এর graph তৈরি করার জন্য এটি ঠিক আছে, কিন্তু পরে যদি embeddings-ও JSON-এ রাখতে চাও, তাহলে export code পরিবর্তন করতে হবে।
আরেকটি নিরাপত্তার বিষয়: ZIP-এর ভিতরে Neo4j credential-সহ একটি text file আছে। এই credentials আর কোথাও share কোরো না; Neo4j Aura থেকে password rotate করে পুরোনো credential বাতিল করো। নিচে আমি সেগুলো পুনরায় দেখাচ্ছি না।

        1. Neo4j connection test করে।
        2. Pinecone connection, record count ও একটি sample movie check করে।
        3. Pinecone থেকে records এনে movies_backup.json তৈরি করে।
        4. JSON পড়ে Neo4j-তে Movie nodes তৈরি বা update করে।
        5. Movie data থেকে Actor, Director, Genre, Theme ও Award nodes এবং relationships তৈরি করে।
        6. Neo4j connection credentials রয়েছে। এটি Python script নয়; নিরাপত্তার জন্য সরিয়ে রাখো।

    ZIP-এ .env, requirements.txt এবং movies_backup.json নেই। এগুলো কীভাবে তৈরি বা install করতে হবে, নিচে দেখানো হলো।



2. প্রথমে project folder তৈরি করো --> cd movie-data-migration
    এখানে build_movie_graph.py, import_neo4j.py, export_pinecone.py ইত্যাদি দেখতে পাবে।
    মনে রাখবে: নিচের সব Python command এই movie-data-migration folder-এর ভিতর থেকে চালাবে। তাহলে JSON file-এর relative path নিয়ে সমস্যা হবে না।



3. Python environment ও dependencies setup করো
    প্রথমে Python version দেখো:   python3 --version

    তারপর virtual environment তৈরি ও activate করো: 
         i) python3 -m venv .venv
        ii) source .venv/bin/activate


    এবার প্রয়োজনীয় libraries install করো:
     i) python -m pip install --upgrade pip
    ii) python -m pip install pinecone neo4j python-dotenv


    প্রতিটি library-এর কাজ:
        1) Library	কেন দরকার
        2) pinecone	Vector Database থেকে records পড়তে
        3) neo4j	Python থেকে Neo4j-তে query চালাতে
        4) python-dotenv	.env file থেকে credentials পড়তে
        5) এগুলো install করার পর requirements.txt রাখতে চাইলে:
        6) python -m pip freeze > requirements.txt


    পরের বার environment setup করার সময়:
        1) python3 -m venv .venv
        2) source .venv/bin/activate
        3) python -m pip install -r requirements.txt

        এই চারটি setup command প্রতিবার চালানোর দরকার নেই।
            Command	                                                            কখন চালাবে?
            1) python3 -m venv .venv	                                        .venv না থাকলে
            2) source .venv/bin/activate	                                    প্রতিবার নতুন Terminal session-এ কাজ শুরু করলে
            3) python -m pip install --upgrade pip	                            সাধারণত একবারই যথেষ্ট
            4) python -m pip install pinecone neo4j python-dotenv	            প্রথমবার, অথবা dependencies পুনরায় install করতে হলে

        শেষ কথা: তোমার screenshot অনুযায়ী .venv ইতিমধ্যেই তৈরি হয়েছে। তাই এখন delete কোরো না; পরে শুধু source .venv/bin/activate চালালেই হবে।



4. .env file তৈরি করো
সবচেয়ে আগে environment configuration ঠিক করতে হবে। Project folder-এর ভিতরে:
        1) touch .env
        2) nano .env

তারপর নিচের structure অনুযায়ী নিজের নতুন credentials বসাবে।

    1) PINECONE_API_KEY=your_pinecone_api_key
    2) PINECONE_INDEX_NAME=your_pinecone_index_name

    1) NEO4J_URI=your_neo4j_connection_uri
    2) NEO4J_USERNAME=your_neo4j_username
    3) NEO4J_PASSWORD=your_new_neo4j_password
    4) NEO4J_DATABASE=your_neo4j_database_name


    এখানে:
        - PINECONE_API_KEY — Pinecone API key।
        - PINECONE_INDEX_NAME — যে index-এ তোমার movie records রয়েছে।
        - NEO4J_URI — Neo4j Aura connection URI।
        - NEO4J_USERNAME, NEO4J_PASSWORD — Neo4j login credentials।
        - NEO4J_DATABASE — তোমার instance-এর সঠিক database name।
        তোমার Neo4j Aura instance নতুন করে তৈরি হয়ে থাকলে, তার বর্তমান connection details ব্যবহার করবে। পুরোনো text file থেকে credentials কপি করবে না।

    nano থেকে বের হতে Ctrl + O, Enter, তারপর Ctrl + X চাপো।

    এরপর .gitignore file তৈরি করে credentials এবং local files Git থেকে বাদ দাও:
    cat > .gitignore <<'EOF'
    .env
    .venv/
    __pycache__/
    movies_backup.json
    EOF
    movies_backup.json গুরুত্বপূর্ণ backup হলে সেটি আলাদা নিরাপদ স্থানে রেখো।

5. প্রথমে test_neo4j.py run করবে
    Command: python test_neo4j.py

    File-এর ভিতরে কী হচ্ছে?
    1. load_dotenv() — .env থেকে credentials পড়ে।
    2. os.getenv(...) — URI, username, password ও database পড়ে।
    3. if not all(...) — কোনো configuration missing হলে error দেয়।
    4. GraphDatabase.driver(...) — Neo4j driver তৈরি করে।
    5. driver.verify_connectivity() — database-এর সঙ্গে connection test করে।
    6. driver.session(database=database) — নির্দিষ্ট database-এ session খোলে।
    7. RETURN 1 AS result — ছোট্ট test query চালায়।
    8. finally: driver.close() — কাজ শেষে driver বন্ধ করে।

    সফল হলে এরকম output পাবে:
        Test result: 1
        Neo4j connection successful!

    যদি connection fail করে, এখানেই থামবে। URI, credentials, database name এবং Aura instance status check করবে।

6. এবার export_pinecone_backup.py run করবে
    python export_pinecone_backup.py

    এটি মূল export file নয়। এটি একটি sanity-check script।
    Code-এর ধাপ:
        - .env থেকে Pinecone API key ও index name পড়ে।
        - Pinecone(api_key=api_key) দিয়ে client তৈরি করে।
        - pc.Index(index_name) দিয়ে index access করে।
        - index.describe_index_stats() দিয়ে record count দেখে।
        - index.query(...) দিয়ে movie-102-not-out ID-র একটি sample record retrieve করার চেষ্টা করে।
        - sample record-এর ID ও metadata print করে।

    এখানে sample ID-টি index-এ না থাকলে record নাও পেতে পারো। তাই শুধু sample না পাওয়া মানেই connection failure নয়।
    সফল হলে পরের ধাপে যাবে।

7. export_pinecone.py — এটিই আসল JSON export
    এখন run করো:
        python export_pinecone.py

    এই file-টা মন দিয়ে বুঝে রাখো, কারণ ভবিষ্যতে আবার migration করার সময় এটাই প্রথম প্রধান script।
        Script-এর ভিতরে কীভাবে data flow করে?
        1. Pinecone connection
        Pinecone(api_key=api_key) এবং pc.Index(index_name) দিয়ে index-এর সঙ্গে connection তৈরি হয়।
        2. Expected records count
        describe_index_stats() দিয়ে index-এ কতগুলো vector record আছে, সেটি দেখে।
        3. সব record ID সংগ্রহ
        index.list() থেকে ID-গুলো all_ids list-এ যোগ করে।
        4. Batch-এ records fetch
        batch_size = 100। প্রতি batch-এ ১০০টি ID নিয়ে index.fetch(ids=batch_ids) চালায়।
        5. JSON structure তৈরি
        প্রতিটি record-এর ID ও metadata movies list-এ রাখে।
        6. JSON file লেখা
        json.dump(...) দিয়ে movies_backup.json তৈরি করে।

    এই script-এর গুরুত্বপূর্ণ অংশ:
        movies.append({
            "id": record_id,
            "metadata": record.metadata or {}
        })



    এর মানে হলো, JSON-এ প্রতিটি movie record-এর id এবং metadata রাখা হচ্ছে।
    উদাহরণস্বরূপ, JSON দেখতে এরকম হবে:
        [
        {
            "id": "movie-example-001",
            "metadata": {
            "title": "Example Movie",
            "year": 2020,
            "director": "Example Director",
            "actors": "Actor A, Actor B",
            "genres": "Drama",
            "themes": "Friendship",
            "awards": "Example Award",
            "text": "Example movie description"
            }
        }
        ]


    এটি শুধু বোঝানোর জন্য sample; বাস্তবে তোমার JSON-এ Pinecone থেকে আসা data থাকবে।
    Export সফল হয়েছে কীভাবে বুঝবে?
        Output-এ দেখবে:
            Connected to Pinecone: ...
            Expected records: ...
            Collected IDs: ...
            Fetched .../... records

            Export complete!
            Exported records: ...
            Saved to: movies_backup.json


    আগের project context অনুযায়ী Pinecone-এ তোমার ১,০৬২টি unique movie record ছিল। যদি একই index ও একই data এখনও থাকে, তাহলে প্রত্যাশিত count হবে ১,০৬২।
        তারপর:
            ls -lh movies_backup.json


    JSON-এর record count check করতে:
        python -c "import json; print(len(json.load(open('movies_backup.json', encoding='utf-8'))))"


    গুরুত্বপূর্ণ সীমাবদ্ধতা: এই code শুধু metadata export করে, actual embedding vector নয়। Pinecone index-এ record থাকলেও তার metadata অসম্পূর্ণ হলে JSON-এও সেই অসম্পূর্ণতা থাকবে। আর index.list() ও fetch() তোমার index configuration এবং Pinecone SDK version-এর সঙ্গে সামঞ্জস্যপূর্ণ কি না, প্রথমবার পরীক্ষা করে নেবে।

8. import_neo4j.py — JSON থেকে Neo4j-তে Movie nodes তৈরি
    Export সফল হওয়ার পরে run করবে:
        python import_neo4j.py


    এই file-টি movies_backup.json-কে Neo4j-তে নিয়ে যায়।
        কোডের execution order
            1. Imports এবং configuration
            os, json, load_dotenv, GraphDatabase ব্যবহার করা হয়েছে। Neo4j credentials পড়া হয় এবং configuration missing থাকলে execution বন্ধ হয়।
            2. JSON load
            open("movies_backup.json", ...) দিয়ে JSON file খোলা হয় এবং json.load(file) দিয়ে Python list-এ রূপান্তর করা হয়।
            3. Neo4j connection
            Driver তৈরি হয় এবং verify_connectivity() দিয়ে connection পরীক্ষা করা হয়।
            4. Uniqueness constraint
            Movie.pineconeId-এর উপর unique constraint তৈরি করা হয়, যাতে একই Pinecone ID-র একাধিক Movie node তৈরি না হয়।
            5. Batch processing
            batch_size = 100 দিয়ে records ভাগ করা হয়। ১,০৬২টি record হলে ১০০ করে batch এবং শেষে ৬২টি record থাকবে।
            6. Metadata mapping
            JSON-এর id থেকে pineconeId এবং metadata থেকে title, year, director, actors, genres, themes, awards, text তৈরি হয়।
            7. Cypher query
            UNWIND $movies AS data দিয়ে batch-এর প্রতিটি record process করা হয়। MERGE (m:Movie {pineconeId: data.pineconeId}) node খুঁজে পেলে সেটি reuse করে, না পেলে তৈরি করে। SET properties যোগ বা update করে।

    এখানে MERGE কেন ব্যবহার করা হয়েছে? ধরো, movie-example-001 আগে থেকেই Neo4j-তে আছে। একই ID আবার import করলে নতুন node না বানিয়ে existing node update করার চেষ্টা করবে।
    এটাই idempotent migration-এর মূল ধারণা। তবে আগে থেকে থাকা Movie node-গুলোর pineconeId না থাকলে সেগুলোকে এই constraint নিজে থেকে শনাক্ত করতে পারবে না।
    
    সফল হলে কী দেখবে?
        Total movies in backup: 1062
        Neo4j connection successful!
        Processed 100/1062 movies
        ...
        Processed 1062/1062 movies

        Movie import complete!


    এখানে 1062 প্রত্যাশিত উদাহরণ; তোমার বর্তমান backup-এ record কম বা বেশি হলে সেই অনুযায়ী সংখ্যা বদলাবে।

9. build_movie_graph.py — Graph relationships তৈরি
    import_neo4j.py শেষ হওয়ার পরে:
        python build_movie_graph.py


    এখানে নতুন করে JSON পড়া হচ্ছে না। এটি Neo4j-তে আগে থেকে থাকা Movie nodes-এর properties ব্যবহার করে graph তৈরি করে।
    কোন query কী তৈরি করে?
    1. Director
            MERGE (d:Director {name: directorName})
            MERGE (d)-[:DIRECTED]->(m)
    Movie-এর director property থেকে Director node তৈরি করে এবং Director থেকে Movie-র দিকে DIRECTED relationship তৈরি করে।


    2. Actor
        MERGE (a:Actor {name: actorName})
        MERGE (a)-[:ACTED_IN]->(m)
    actors property comma দিয়ে split করে Actor nodes এবং ACTED_IN relationships তৈরি করে।


    3. Genre
        MERGE (g:Genre {name: genreName})
        MERGE (m)-[:IN_GENRE]->(g)
    Movie থেকে Genre-র দিকে IN_GENRE relationship তৈরি করে।


    4. Theme
        MERGE (t:Theme {name: themeName})
        MERGE (m)-[:HAS_THEME]->(t)
    Movie থেকে Theme-র দিকে HAS_THEME relationship তৈরি করে।


    5. Award
        MERGE (a:Award {name: awardName})
        MERGE (m)-[:HAS_AWARD]->(a)
    Movie থেকে Award-র দিকে HAS_AWARD relationship তৈরি করে।


    শেষে query চালিয়ে Movie node-এর সংখ্যা ফেরত দেয়। এরপর driver বন্ধ হয়।
    একটি গুরুত্বপূর্ণ data-quality বিষয়: code-এ actors, genres, themes ও awards-কে comma দিয়ে split করা হয়েছে। কোনো actor, theme বা award-এর নামের মধ্যেই comma থাকলে ভুলভাবে ভাগ হয়ে যেতে পারে। তোমার metadata format-এ এমন নাম থাকলে এই parsing logic উন্নত করা দরকার।


10. Neo4j-তে data ঠিকমতো এসেছে কি না verify করবে
    Neo4j Aura Console বা Neo4j Browser-এ query চালাবে। Python script-এর ভিতরে নয়, Neo4j-এর query editor-এ এগুলো execute করবে।
    A. মোট nodes কত আছে?
    MATCH (n)
    RETURN labels(n) AS NodeTypes, count(n) AS Total
    ORDER BY Total DESC;


    B. প্রতিটি relationship কত আছে?
        MATCH ()-[r]->()
        RETURN type(r) AS RelationshipType, count(r) AS Total
        ORDER BY Total DESC;


    C. Movie nodes-এর count এবং sample
        MATCH (m:Movie)
        RETURN count(m) AS TotalMovies;


    MATCH (m:Movie)
        RETURN m.title, m.year, m.director, m.pineconeId
        LIMIT 10;


    D. Graph connection বাস্তবে কাজ করছে কি না
        MATCH (a:Actor)-[:ACTED_IN]->(m:Movie)
        RETURN a.name AS Actor, m.title AS Movie
        LIMIT 20;


    MATCH (d:Director)-[:DIRECTED]->(m:Movie)
    RETURN d.name AS Director, m.title AS Movie
    LIMIT 20;

    এগুলোতে records পাওয়া গেলে বুঝবে যে শুধু Movie properties নয়, graph relationships-ও তৈরি হয়েছে।


11. পুরো migration-এর সঠিক command order
    এই তালিকাটা save করে রাখো। পরের বার আবার Pinecone থেকে data নিয়ে Neo4j-তে import করতে হলে এটাই follow করবে।
    Migration checklist:-  0/6 completed
        1. Virtual environment চালু করা
            source .venv/bin/activate

        2. Neo4j connection test
        python test_neo4j.py
    
        3. Pinecone connection ও sample record test
            python export_pinecone_backup.py
        
        4. Pinecone থেকে JSON backup তৈরি
            python export_pinecone.py
        
        5. JSON থেকে Movie nodes import
            python import_neo4j.py
        
        6. Actor, Director, Genre, Theme, Award ও relationships তৈরি
            python build_movie_graph.py
        



সতর্কতা: যদি তোমার বর্তমান Neo4j database-এ ইতিমধ্যেই সব ১,০৬২টি Movie এবং তাদের graph relationships থাকে, তাহলে আবার import করার প্রয়োজন নেই। আগে verification queries চালাও। এই sequence মূলত fresh database-এ migration করার জন্য, অথবা backup থেকে database rebuild করার সময় কাজে লাগবে।
আর একটা বিষয়: এই workflow-তে movies_backup.json-ই হচ্ছে Pinecone ও Neo4j-এর মধ্যে intermediate backup file। ভবিষ্যতে Pinecone-এ নতুন movie যোগ হলে আবার export করে import করতে পারবে। MERGE-এর কারণে একই pineconeId-র Movie node পুনরায় তৈরি হবে না, যদিও অন্য label বা relationship-এর জন্য আলাদা constraints এবং data-quality checks লাগতে পারে।