# run_migration_tools.ps1  (v3)
$ErrorActionPreference = 'Continue'

$steps = [System.Collections.Generic.List[hashtable]]::new()

function Add-Step($desc, $sql) {
    $steps.Add(@{ Desc = $desc; SQL = $sql })
}

# farm_tools table
Add-Step "Create farm_tools table" "CREATE TABLE IF NOT EXISTS farm_tools (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, name TEXT NOT NULL, description TEXT, category tool_category NOT NULL DEFAULT 'Otro', unit TEXT NOT NULL DEFAULT 'unidad', stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0), min_stock INT DEFAULT NULL CHECK (min_stock IS NULL OR min_stock >= 0), is_active BOOLEAN NOT NULL DEFAULT TRUE, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())"

Add-Step "Index ux_farm_tools_name" "CREATE UNIQUE INDEX IF NOT EXISTS ux_farm_tools_name ON farm_tools (lower(name))"

Add-Step "Index idx_farm_tools_category" "CREATE INDEX IF NOT EXISTS idx_farm_tools_category ON farm_tools (category)"

Add-Step "Index idx_farm_tools_is_active" "CREATE INDEX IF NOT EXISTS idx_farm_tools_is_active ON farm_tools (is_active)"

# farm_tool_movements table
Add-Step "Create farm_tool_movements table" "CREATE TABLE IF NOT EXISTS farm_tool_movements (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tool_id UUID NOT NULL REFERENCES farm_tools(id) ON DELETE CASCADE, delta INT NOT NULL CHECK (delta <> 0), reason TEXT NOT NULL, notes TEXT, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ DEFAULT now())"

Add-Step "Index idx_farm_tool_movements_tool_id" "CREATE INDEX IF NOT EXISTS idx_farm_tool_movements_tool_id ON farm_tool_movements (tool_id, created_at DESC)"

# RLS
Add-Step "RLS on farm_tools" "ALTER TABLE farm_tools ENABLE ROW LEVEL SECURITY"
Add-Step "RLS on farm_tool_movements" "ALTER TABLE farm_tool_movements ENABLE ROW LEVEL SECURITY"

# Policies - farm_tools
Add-Step "Policy select farm_tools" "CREATE POLICY admins_select_farm_tools ON farm_tools FOR SELECT TO authenticated USING (is_admin())"
Add-Step "Policy insert farm_tools" "CREATE POLICY admins_insert_farm_tools ON farm_tools FOR INSERT TO authenticated WITH CHECK (is_admin())"
Add-Step "Policy update farm_tools" "CREATE POLICY admins_update_farm_tools ON farm_tools FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin())"
Add-Step "Policy delete farm_tools" "CREATE POLICY admins_delete_farm_tools ON farm_tools FOR DELETE TO authenticated USING (is_admin())"

# Policies - farm_tool_movements
Add-Step "Policy select farm_tool_movements" "CREATE POLICY admins_select_farm_tool_movements ON farm_tool_movements FOR SELECT TO authenticated USING (is_admin())"
Add-Step "Policy insert farm_tool_movements" "CREATE POLICY admins_insert_farm_tool_movements ON farm_tool_movements FOR INSERT TO authenticated WITH CHECK (is_admin())"

# Run
$ok = 0
$skipped = 0
$failed = 0

foreach ($step in $steps) {
    Write-Host ""
    Write-Host "[>>] $($step.Desc)" -ForegroundColor Cyan

    $result = npx @insforge/cli db query $step.SQL -y 2>&1
    $code = $LASTEXITCODE
    $resultStr = ($result | Out-String)

    if ($code -eq 0) {
        Write-Host "[ OK] $($step.Desc)" -ForegroundColor Green
        $ok++
    } elseif ($resultStr -match 'already exists') {
        Write-Host "[SKP] Already exists - $($step.Desc)" -ForegroundColor Yellow
        $skipped++
    } else {
        Write-Host "[ERR] $($step.Desc)" -ForegroundColor Red
        Write-Host $resultStr -ForegroundColor DarkRed
        $failed++
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "Result: OK=$ok  Skipped=$skipped  Failed=$failed"
if ($failed -eq 0) {
    Write-Host "Migration complete!" -ForegroundColor Green
} else {
    Write-Host "Some steps failed. Check output above." -ForegroundColor Red
    exit 1
}
