<div id="audit" class="tab-content">
    <div class="search-filter-bar no-print">
        <div class="form-group">
            <label>Search Brand or Size</label>
            <input type="text" id="auditSearch" class="form-control" placeholder="Search..." oninput="refreshAuditList()">
        </div>
        <div class="form-group">
            <label>From Date</label>
            <input type="date" id="auditDateFrom" class="form-control" onchange="refreshAuditList()">
        </div>
        <div class="form-group">
            <label>To Date</label>
            <input type="date" id="auditDateTo" class="form-control" onchange="refreshAuditList()">
        </div>
        <div class="btn-group">
            <button class="btn btn-save" onclick="saveMonthlyAudit()">💾 Save Audit</button>
            <button class="btn btn-primary" style="background: #0ea5e9;" onclick="archiveCurrentAudit()">📁 Archive Report</button>
            <button class="btn btn-print" onclick="window.print()">🖨️ Print</button>
            <button class="btn btn-danger" onclick="resetAuditSession()" title="Clear manual entries only">🔄 Reset Godown</button>
            <button class="btn btn-success" onclick="adjustAllStockToSystem()" title="Automatically adjust all stock items matching differences">⚡ Auto Adjust All</button>
            <button class="btn btn-secondary" onclick="clearAuditFilters()">🧹 Clear</button>
        </div>
    </div>
    
    <div id="printableAudit">
        <div class="print-header">
            <div class="print-header-top">
                <div id="auditPrintLogo" class="printLogo">📦</div>
                <h1 id="auditPrintCompanyName">StockFlow</h1>
            </div>
            <p>Monthly Stock Audit Report - <span id="auditPrintDate"></span></p>
        </div>

        <div id="auditListContainer"></div>
    </div>
</div>

