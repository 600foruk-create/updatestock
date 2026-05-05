<div class="rm-transactions">

    
    <div class="form-card" style="margin-bottom: 2rem; background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="display: flex; gap: 1.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem; align-items: center;">
            <div class="form-group" style="margin-bottom: 0; min-width: 200px;">
                <label style="font-weight: 700; color: var(--gray-700); margin-bottom: 0.4rem; font-size: 0.85rem; display: block;">Purchase Date</label>
                <input type="date" id="rmInDate" class="form-control" style="height: 40px; border-radius: 6px; border: 1px solid #cbd5e1; width: 100%;">
            </div>
            <div style="flex-grow: 1;">
                <h4 style="margin: 0; color: var(--sky-700); font-size: 1.1rem;">➕ New Purchase Entry</h4>
                <p style="margin: 0; font-size: 0.8rem; color: var(--gray-500);">Add materials below to record multiple items in one transaction.</p>
            </div>
        </div>

        <div id="rmInRowsContainer" style="overflow-x: auto; margin-bottom: 1rem;">
            <table style="width: 100%; border-collapse: separate; border-spacing: 0 8px;">
                <thead>
                    <tr style="text-align: left; font-size: 0.85rem; color: var(--gray-600);">
                        <th style="padding: 0 0.5rem;">Raw Material</th>
                        <th style="padding: 0 0.5rem; width: 180px;">Quantity</th>
                        <th style="padding: 0 0.5rem; width: 150px;">Unit Price (Rs)</th>
                        <th style="padding: 0 0.5rem;">Reference / Notes</th>
                        <th style="width: 50px;"></th>
                    </tr>
                </thead>
                <tbody id="rmInRows"></tbody>
            </table>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 1.5rem;">
            <button class="btn btn-info" onclick="addRMInRow()" style="padding: 0.5rem 1.2rem; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <span>➕ Add Material</span>
            </button>
            
            <button id="rmInSaveBtn" class="btn btn-primary" style="background: var(--sky-600); color: white; padding: 0.6rem 2.5rem; font-size: 1rem; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 0 var(--sky-800);" onclick="saveRMTransaction('IN')">
                Save Purchase
            </button>
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
