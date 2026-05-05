<div class="rm-transactions">

    
    <div class="form-card" style="margin-bottom: 2rem; background: transparent; box-shadow: none; border: none; padding: 0;">
        <div class="settings-grid" style="display: grid; grid-template-columns: 0.8fr 1.2fr 1fr 1fr 1.5fr; gap: 1rem; align-items: flex-end; background: #f8fafc; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-weight: 700; color: var(--gray-700); margin-bottom: 0.5rem; font-size: 0.9rem; display: block;">Purchase Date</label>
                <input type="date" id="rmInDate" class="form-control" style="height: 48px; border-radius: 8px; border: 2px solid #cbd5e1; width: 100%; background: white;">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-weight: 700; color: var(--gray-700); margin-bottom: 0.5rem; font-size: 0.9rem; display: block;">Select Raw Material</label>
                <select id="rmInSelect" class="form-control" style="height: 48px; padding: 0.6rem 1rem; font-size: 1rem; border-radius: 8px; border: 2px solid #cbd5e1; width: 100%; background: white;"></select>
            </div>
            
            <div class="form-group" style="margin-bottom: 0; position: relative;">
                <label style="font-weight: 700; color: var(--gray-700); margin-bottom: 0.5rem; font-size: 0.9rem; display: block;">Quantity Received</label>
                <div class="input-group" style="display:flex; align-items:stretch; height: 48px; border: 2px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: white;">
                    <input type="number" id="rmInQty" class="form-control" style="border: none; padding: 0.6rem 1rem; font-size: 1rem; flex:1; height: 100%; border-right: 1px solid #e2e8f0; border-radius:0;" placeholder="0.00" oninput="updateRMConversionHint('IN')">
                    <select id="rmInUnitSelect" class="form-control" style="border: none; width: 85px; padding: 0 0.5rem; font-size: 0.85rem; height: 100%; background: #f1f5f9; cursor: pointer; color: var(--gray-700); font-weight: 600; border-radius:0;" onchange="updateRMConversionHint('IN')">
                        <option value="Bags" selected>Bags</option>
                        <option value="KG">KG</option>
                        <option value="Grams">Grams</option>
                    </select>
                </div>
                <small id="rmInConversionHint" style="position: absolute; top: 100%; left: 0; color:var(--sky-600); font-weight:700; font-size: 0.75rem; margin-top: 2px; white-space: nowrap;"></small>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-weight: 700; color: var(--gray-700); margin-bottom: 0.5rem; font-size: 0.9rem; display: block;">Purchase Price (per Unit)</label>
                <input type="number" id="rmInPrice" class="form-control" style="height: 48px; padding: 0.6rem 1rem; font-size: 1rem; border-radius: 8px; border: 2px solid #cbd5e1; width: 100%; background: white;" placeholder="0.00">
            </div>

            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-weight: 700; color: var(--gray-700); margin-bottom: 0.5rem; font-size: 0.9rem; display: block;">Reference / Supplier Notes</label>
                <input type="text" id="rmInNotes" class="form-control" style="height: 48px; padding: 0.6rem 1rem; font-size: 1rem; border-radius: 8px; border: 2px solid #cbd5e1; width: 100%; background: white;" placeholder="Supplier Name, etc.">
            </div>
        </div>
        
        <div style="margin-top: 2rem; padding-bottom: 10px;">
            <button id="rmInSaveBtn" class="btn btn-primary" style="background: var(--sky-600); color: white !important; display: inline-block; width: auto; padding: 0.6rem 2.5rem; font-size: 1rem; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 0 var(--sky-800); cursor: pointer; transition: 0.2s;" onclick="saveRMTransaction('IN')">Save</button>
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
