<div class="store-inwards" style="padding: 1rem;">
    <!-- INWARD FORM -->
    <div class="row" style="background: white; padding: 2.5rem; border-radius: 20px; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm); margin-bottom: 2rem;">
        <div class="col-md-4">
            <div class="form-group">
                <label style="font-weight: 700; color: var(--gray-700); font-size: 0.9rem;">Select Item</label>
                <select id="storeInwardItemSelect" class="form-control select2" style="width: 100%;">
                    <!-- Populated by JS -->
                </select>
            </div>
        </div>
        <div class="col-md-3">
            <div class="form-group">
                <label style="font-weight: 700; color: var(--gray-700); font-size: 0.9rem;">Quantity</label>
                <input type="number" id="storeInwardQty" class="form-control" value="1" min="1" step="0.01" style="border-radius: 10px;">
            </div>
        </div>
        <div class="col-md-5">
            <div class="form-group">
                <label style="font-weight: 700; color: var(--gray-700); font-size: 0.9rem;">Supplier / Source</label>
                <input type="text" id="storeInwardSource" class="form-control" placeholder="Vendor name or Department" style="border-radius: 10px;">
            </div>
        </div>
        <div class="col-md-12" style="margin-top: 1rem;">
            <div class="form-group">
                <label style="font-weight: 700; color: var(--gray-700); font-size: 0.9rem;">Remarks / Notes</label>
                <textarea id="storeInwardNotes" class="form-control" rows="2" placeholder="Any additional details..." style="border-radius: 10px;"></textarea>
            </div>
        </div>
        <div class="col-12" style="margin-top: 2rem; display: flex; justify-content: flex-end;">
            <button class="btn btn-primary btn-lg" onclick="saveStoreInward()" style="padding: 0.8rem 3rem; font-weight: 800; border-radius: 12px; box-shadow: 0 4px 15px rgba(12, 166, 242, 0.3); letter-spacing: 0.5px;">
                Save Inward Record
            </button>
        </div>
    </div>

    <!-- HISTORY SECTION -->
    <div class="card" style="background: white; padding: 2rem; border-radius: 20px; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;">
            <h3 style="color: var(--gray-800); margin: 0; font-weight: 800; display: flex; align-items: center; gap: 0.8rem;">
                <i class="fas fa-history" style="color: var(--sky-500);"></i> Inward Records History
            </h3>
            <div style="display: flex; gap: 1rem; align-items: center;">
                <select id="inwardHistMonth" class="form-control" style="width: 140px; border-radius: 8px; font-weight: 600;">
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                </select>
                <select id="inwardHistYear" class="form-control" style="width: 100px; border-radius: 8px; font-weight: 600;">
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                </select>
                <button class="btn btn-primary" onclick="refreshStoreInwardHistory()" style="border-radius: 8px; padding: 6px 15px; font-weight: 700;">Search</button>
                <button class="btn btn-outline-secondary" onclick="printStoreHistory('INWARD')" style="border-radius: 8px; padding: 6px 15px; font-weight: 700;">
                    <i class="fas fa-print"></i> Print
                </button>
            </div>
        </div>

        <div id="storeInwardHistoryTableContainer" style="overflow-x: auto;">
            <table class="table" style="width: 100%; border-collapse: separate; border-spacing: 0 10px;">
                <thead style="background: #f8fafc;">
                    <tr style="color: var(--gray-500); font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px;">
                        <th style="padding: 15px; border-radius: 10px 0 0 10px;">Date & Time</th>
                        <th style="padding: 15px;">Item Code</th>
                        <th style="padding: 15px;">Item Name</th>
                        <th style="padding: 15px; text-align: center;">Qty</th>
                        <th style="padding: 15px;">Supplier/Source</th>
                        <th style="padding: 15px; text-align: right; border-radius: 0 10px 10px 0;">Actions</th>
                    </tr>
                </thead>
                <tbody id="storeInwardHistoryBody">
                    <!-- History records here -->
                </tbody>
            </table>
        </div>
    </div>
</div>
