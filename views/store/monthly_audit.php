<div class="store-monthly-audit">
    <div class="card" style="background: white; padding: 2.5rem; border-radius: 20px; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="background: #f0f9ff; width: 50px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-clipboard-check" style="color: #0ea5e9; font-size: 1.5rem;"></i>
                </div>
                <h2 style="margin: 0; color: #1e293b; font-weight: 800;">Physical Stock Audit</h2>
            </div>
            <button class="btn btn-success" onclick="adjustAllStoreStock()" style="border-radius: 10px; padding: 10px 20px; font-weight: 700; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);">
                <i class="fas fa-magic"></i> Auto Adjust All Items
            </button>
        </div>
        
        <div id="storeAuditItemsList" style="overflow-x: auto;">
            <!-- Populated by JS -->
        </div>
        
        <div style="margin-top: 2rem; display: flex; justify-content: flex-end; gap: 1rem; border-top: 1px solid #f1f5f9; padding-top: 1.5rem;">
            <button class="btn btn-outline-secondary" onclick="refreshStoreAudit()" style="border-radius: 10px; font-weight: 700;">
                <i class="fas fa-redo"></i> Reset Table
            </button>
            <button class="btn btn-primary" onclick="saveStoreAuditReport()" style="padding: 0.8rem 2.5rem; font-weight: 700; border-radius: 12px; box-shadow: 0 4px 12px rgba(12, 166, 242, 0.3);">
                <i class="fas fa-save"></i> Save & Archive Report
            </button>
        </div>
    </div>
</div>
