<div class="store-reports">
    <div class="card" style="background: white; padding: 2rem; border-radius: 12px; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm);">
        
        <div id="storeReportsList" style="min-height: 200px;">
            <!-- Populated by JS -->
        </div>

        <div style="margin-top: 2rem; display: flex; gap: 1rem; padding-top: 1.5rem; border-top: 1px solid var(--gray-100);">
            <button class="btn btn-outline-primary" onclick="exportStoreReportsToExcel()">
                <i class="fas fa-file-excel"></i> Export All to JSON/Excel
            </button>
            <button class="btn btn-outline-secondary" onclick="printStoreLatestReport()">
                <i class="fas fa-print"></i> Print Latest Report
            </button>
        </div>
    </div>
</div>
