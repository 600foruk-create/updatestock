<div class="rm-transactions">

    
    <div class="form-card" style="margin-bottom: 2rem; background: transparent; box-shadow: none; border: none; padding: 0;">
        <div class="form-group" style="max-width: 200px; margin-bottom: 1.5rem;">
            <label style="font-weight: 700; color: var(--gray-700); margin-bottom: 0.5rem; font-size: 0.9rem; display: block;">Purchase Date</label>
            <input type="date" id="rmInDate" class="form-control" style="height: 40px; border-radius: 8px; border: 2px solid #cbd5e1; width: 100%; background: white;">
        </div>

        <div id="rmInRows" style="display: flex; flex-direction: column; gap: 0.8rem; background: #f8fafc; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 1rem;">
            <!-- Rows will be added here via JS -->
        </div>
        
        <div style="display: flex; gap: 1rem; align-items: center; margin-top: 1rem;">
            <button class="btn btn-info" onclick="addRMRow('IN')" style="padding: 0.6rem 1.5rem; font-weight: 700; border-radius: 8px; display: flex; align-items: center; gap: 8px;">➕ Add Item</button>
            <button id="rmInSaveBtn" class="btn btn-primary" style="background: var(--sky-600); color: white !important; padding: 0.6rem 2.5rem; font-size: 1rem; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 0 var(--sky-800); cursor: pointer; transition: 0.2s;" onclick="saveRMTransaction('IN')">Save All</button>
        </div>
    </div>
    </div>

    <div class="table-container">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h3 style="margin: 0; color: var(--gray-800);">Recent Purchase History</h3>
            <div style="display: flex; gap: 0.8rem;">
                <button class="btn" style="background: #27ae60; color: white; display: flex; align-items: center; gap: 5px;" onclick="exportRMInToExcel()">
                    <span>📊 Export Excel</span>
                </button>
                <button class="btn btn-danger" style="display: flex; align-items: center; gap: 5px;" onclick="deleteAllRMInHistory()">
                    <span>🗑️ Delete All</span>
                </button>
            </div>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Material</th>
                    <th>Quantity Received</th>
                    <th>Unit Price</th>
                    <th>Total Amount</th>
                    <th>Notes</th>
                    <th style="width: 80px; text-align: center;">Action</th>
                </tr>
            </thead>
            <tbody id="rmInTable"></tbody>
        </table>
    </div>
</div>
