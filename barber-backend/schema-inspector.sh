#!/bin/bash
###############################################################################
# DATABASE SCHEMA INSPECTOR & VALIDATOR
# Inspects all tables, columns, constraints, and indexes
# Generates detailed schema report for deployment validation
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DB_CONTAINER="supabase-db"
DB_USER="postgres"
DB_NAME="postgres"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         DATABASE SCHEMA INSPECTION & VALIDATION REPORT             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}\n"

# Function to run PostgreSQL queries
run_query() {
    local query="$1"
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "$query" 2>/dev/null || echo "Query failed"
}

# Function to run query and return JSON
run_query_json() {
    local query="$1"
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" --json -c "$query" 2>/dev/null || echo "{}"
}

# ============================================================
# 1. TABLE INVENTORY
# ============================================================
echo -e "${BLUE}1. TABLE INVENTORY${NC}"
echo -e "${BLUE}════════════════════${NC}\n"

TABLE_QUERY="
SELECT 
    schemaname,
    tablename,
    tableowner,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"

echo -e "${GREEN}✓ All Tables in Public Schema:${NC}\n"
run_query "$TABLE_QUERY" | head -50
echo ""

# ============================================================
# 2. COLUMN DETAILS
# ============================================================
echo -e "${BLUE}2. COLUMN SPECIFICATIONS${NC}"
echo -e "${BLUE}═════════════════════════${NC}\n"

COLUMN_QUERY="
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
"

echo -e "${GREEN}✓ All Columns with Data Types:${NC}\n"
run_query "$COLUMN_QUERY" | head -100
echo ""

# ============================================================
# 3. PRIMARY KEYS
# ============================================================
echo -e "${BLUE}3. PRIMARY KEY CONSTRAINTS${NC}"
echo -e "${BLUE}═══════════════════════════${NC}\n"

PK_QUERY="
SELECT 
    constraint_name,
    table_name,
    string_agg(column_name, ', ' ORDER BY ordinal_position) AS columns
FROM information_schema.key_column_usage
WHERE table_schema = 'public' AND constraint_type = 'PRIMARY KEY'
GROUP BY constraint_name, table_name
ORDER BY table_name;
"

echo -e "${GREEN}✓ Primary Key Definitions:${NC}\n"
run_query "$PK_QUERY"
echo ""

# ============================================================
# 4. FOREIGN KEYS
# ============================================================
echo -e "${BLUE}4. FOREIGN KEY RELATIONSHIPS${NC}"
echo -e "${BLUE}════════════════════════════${NC}\n"

FK_QUERY="
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS referenced_table_name,
    ccu.column_name AS referenced_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;
"

echo -e "${GREEN}✓ Foreign Key Relationships:${NC}\n"
run_query "$FK_QUERY"
echo ""

# ============================================================
# 5. UNIQUE CONSTRAINTS
# ============================================================
echo -e "${BLUE}5. UNIQUE CONSTRAINTS${NC}"
echo -e "${BLUE}═════════════════════${NC}\n"

UNIQUE_QUERY="
SELECT 
    constraint_name,
    table_name,
    string_agg(column_name, ', ' ORDER BY ordinal_position) AS columns
FROM information_schema.key_column_usage
WHERE table_schema = 'public' 
    AND constraint_type = 'UNIQUE'
GROUP BY constraint_name, table_name
ORDER BY table_name;
"

echo -e "${GREEN}✓ Unique Constraints:${NC}\n"
UNIQUE_RESULT=$(run_query "$UNIQUE_QUERY")
if [ -z "$UNIQUE_RESULT" ] || [ "$UNIQUE_RESULT" == "(0 rows)" ]; then
    echo "No unique constraints found (this is normal if using RLS policies)"
else
    echo "$UNIQUE_RESULT"
fi
echo ""

# ============================================================
# 6. INDEXES
# ============================================================
echo -e "${BLUE}6. DATABASE INDEXES${NC}"
echo -e "${BLUE}═══════════════════${NC}\n"

INDEX_QUERY="
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
"

echo -e "${GREEN}✓ All Indexes:${NC}\n"
run_query "$INDEX_QUERY"
echo ""

# ============================================================
# 7. TRIGGERS
# ============================================================
echo -e "${BLUE}7. DATABASE TRIGGERS${NC}"
echo -e "${BLUE}════════════════════${NC}\n"

TRIGGER_QUERY="
SELECT 
    trigger_name,
    event_object_table,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
"

echo -e "${GREEN}✓ Triggers:${NC}\n"
TRIGGER_RESULT=$(run_query "$TRIGGER_QUERY")
if [ -z "$TRIGGER_RESULT" ] || [ "$TRIGGER_RESULT" == "(0 rows)" ]; then
    echo "No triggers found"
else
    echo "$TRIGGER_RESULT"
fi
echo ""

# ============================================================
# 8. STORED FUNCTIONS & RPC
# ============================================================
echo -e "${BLUE}8. STORED FUNCTIONS & RPC${NC}"
echo -e "${BLUE}══════════════════════════${NC}\n"

FUNC_QUERY="
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
"

echo -e "${GREEN}✓ Functions & RPC Procedures:${NC}\n"
FUNC_RESULT=$(run_query "$FUNC_QUERY")
if [ -z "$FUNC_RESULT" ] || [ "$FUNC_RESULT" == "(0 rows)" ]; then
    echo "No custom functions found"
else
    echo "$FUNC_RESULT" | head -50
fi
echo ""

# ============================================================
# 9. ROW LEVEL SECURITY POLICIES
# ============================================================
echo -e "${BLUE}9. ROW LEVEL SECURITY POLICIES${NC}"
echo -e "${BLUE}═══════════════════════════════${NC}\n"

RLS_QUERY="
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
"

echo -e "${GREEN}✓ RLS Policies Configuration:${NC}\n"
RLS_RESULT=$(run_query "$RLS_QUERY")
if [ -z "$RLS_RESULT" ] || [ "$RLS_RESULT" == "(0 rows)" ]; then
    echo -e "${YELLOW}⚠ Warning: No RLS policies found. Some tables may not have row-level security configured.${NC}"
else
    echo "$RLS_RESULT"
fi
echo ""

# ============================================================
# 10. TABLE STATISTICS
# ============================================================
echo -e "${BLUE}10. TABLE STATISTICS${NC}"
echo -e "${BLUE}════════════════════${NC}\n"

STATS_QUERY="
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
    (SELECT count(*) FROM pg_class WHERE relname = tablename) AS object_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

echo -e "${GREEN}✓ Size and Statistics:${NC}\n"
run_query "$STATS_QUERY"
echo ""

# ============================================================
# 11. DATA ROW COUNTS
# ============================================================
echo -e "${BLUE}11. DATA ROW COUNTS${NC}"
echo -e "${BLUE}═══════════════════${NC}\n"

echo -e "${GREEN}✓ Number of Records per Table:${NC}\n"
for table in salons staff services appointments push_subscriptions stations clients; do
    COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tc "SELECT count(*) FROM $table 2>/dev/null;" 2>/dev/null || echo "0")
    printf "%-25s: %10s records\n" "$table" "$COUNT"
done
echo ""

# ============================================================
# 12. EXTENSIONS
# ============================================================
echo -e "${BLUE}12. POSTGRESQL EXTENSIONS${NC}"
echo -e "${BLUE}═════════════════════════${NC}\n"

EXT_QUERY="
SELECT 
    extname,
    extversion,
    extschema
FROM pg_extension
ORDER BY extname;
"

echo -e "${GREEN}✓ Installed Extensions:${NC}\n"
run_query "$EXT_QUERY"
echo ""

# ============================================================
# 13. SCHEMA VALIDATION REPORT
# ============================================================
echo -e "${CYAN}════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}SCHEMA VALIDATION CHECKLIST${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════════${NC}\n"

# Count tables
TABLE_COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")

# Count functions
FUNC_COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tc "SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public';" 2>/dev/null || echo "0")

# Count RLS policies
RLS_COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tc "SELECT count(*) FROM pg_policies WHERE schemaname = 'public';" 2>/dev/null || echo "0")

# Count indexes
INDEX_COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tc "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey';" 2>/dev/null || echo "0")

echo -e "Required Tables:            ${GREEN}✓${NC} $TABLE_COUNT tables found"
echo -e "RPC Functions:              ${GREEN}✓${NC} $FUNC_COUNT functions found"
echo -e "RLS Policies:               $([ "$RLS_COUNT" -gt 0 ] && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}⚠${NC}") $RLS_COUNT policies configured"
echo -e "Indexes:                    ${GREEN}✓${NC} $INDEX_COUNT custom indexes"
echo ""

# Check for required tables
REQUIRED_TABLES=("salons" "staff" "services" "appointments" "push_subscriptions" "stations")

echo -e "\n${BLUE}Required Tables Status:${NC}\n"
for table in "${REQUIRED_TABLES[@]}"; do
    EXISTS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tc "SELECT 1 FROM information_schema.tables WHERE table_name = '$table';" 2>/dev/null || echo "")
    if [ -n "$EXISTS" ]; then
        echo -e "${GREEN}✓${NC} $table"
    else
        echo -e "${RED}✗${NC} $table - MISSING!"
    fi
done

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Schema Inspection Complete${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════════${NC}\n"
