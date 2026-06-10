<div class="store-monthly-audit">
    <div class="card" style="background: white; padding: 2rem; border-radius: 12px; border: 1px solid #000; box-shadow: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid #000; padding-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <h2 style="margin: 0; color: #1e293b; font-weight: 800; font-size: 1.25rem;"><i class="fas fa-clipboard-check" style="color: #0ea5e9; margin-right: 8px;"></i>Physical Stock Audit</h2>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <button class="btn btn-outline-secondary btn-sm" onclick="refreshStoreAudit()" style="border-radius: 4px; font-weight: 700; padding: 4px 10px; font-size: 0.8rem; border: 1px solid #000; color: #000;">
                    <i class="fas fa-redo"></i> Reset Table
                </button>
                <button class="btn btn-success btn-sm" onclick="adjustAllStoreStock()" style="border-radius: 4px; font-weight: 700; padding: 4px 10px; font-size: 0.8rem; border: 1px solid #000; box-shadow: none;">
                    <i class="fas fa-magic"></i> Auto Adjust All
                </button>
                <button class="btn btn-primary btn-sm" onclick="saveStoreAuditReport()" style="border-radius: 4px; font-weight: 700; padding: 4px 10px; font-size: 0.8rem; border: 1px solid #000; box-shadow: none;">
                    <i class="fas fa-save"></i> Save & Archive Report
                </button>
            </div>
        </div>
        
        <div id="storeAuditItemsList" style="overflow-x: auto;">
            <!-- Populated by JS -->
        </div>
    </div>
</div>
