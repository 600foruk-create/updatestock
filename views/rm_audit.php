<div class="rm-audit">
    <!-- Action Toolbar -->
    <div class="no-print" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; gap:1rem; flex-wrap:wrap;">
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="saveRMAudit()">💾 Save Audit</button>
            <button class="btn btn-success" onclick="archiveRMAuditReport()" style="background: #0d9488;">📁 Archive Report</button>
            <button class="btn" onclick="printRMAudit()" style="background: #6366f1; color: white;">🖨️ Print</button>
        </div>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button class="btn btn-secondary" onclick="resetRMPhysicalStock()" style="background: #94a3b8; color: white;">🔄 Reset Physical stock</button>
            <button class="btn" onclick="autoAdjustRMAll()" style="background: #f97316; color: white; font-weight: 700;">⚡ Auto Adjust All</button>
        </div>
    </div>

    <div class="table-container" id="printableRMAudit">
        <div class="print-only" style="text-align:center; margin-bottom:2rem;">
            <h2 style="font-size: 2rem; color: var(--gray-800); margin-bottom: 0.5rem;">Monthly Raw Material Audit Report</h2>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="padding-left:1.5rem;">Material Name / Code</th>
                    <th style="text-align:center;">System Stock</th>
                    <th style="text-align:center; width:150px;">Physical Stock</th>
                    <th style="text-align:center;">Difference</th>
                    <th style="text-align:center;">Status</th>
                    <th style="padding-right:1.5rem; text-align:center;">Action</th>
                </tr>
            </thead>
            <tbody id="rmAuditTable">
                <!-- Data populated via JS -->
            </tbody>
        </table>
    </div>
</div>
